/**
 * State Manager Module
 * Handles saving, loading, and project management
 */

import { state, layerSystem, faderSystem } from '../app.js';

export class StateManager {
    constructor() {
        this.storageKey = 'p5_playground_projects';
        this.autosaveKey = 'p5_playground_autosave';

        // Enable autosave every 30 seconds
        setInterval(() => this.autosave(), 30000);
    }

    saveProject() {
        const name = prompt('Nome do projeto:', `Projeto_${Date.now()}`);
        if (!name) return;

        const project = this.serializeState();
        project.name = name;
        project.savedAt = new Date().toISOString();

        // Get existing projects
        const projects = this.getSavedProjects();

        // Check if project with same name exists
        const existingIndex = projects.findIndex(p => p.name === name);
        if (existingIndex !== -1) {
            if (confirm('Um projeto com este nome já existe. Substituir?')) {
                projects[existingIndex] = project;
            } else {
                return;
            }
        } else {
            projects.push(project);
        }

        // Save to localStorage
        localStorage.setItem(this.storageKey, JSON.stringify(projects));

        alert('Projeto guardado com sucesso!');
    }

    autosave() {
        if (!layerSystem || layerSystem.getLayers().length === 0) return;

        const project = this.serializeState();
        project.name = 'Autosave';
        project.savedAt = new Date().toISOString();

        localStorage.setItem(this.autosaveKey, JSON.stringify(project));
    }

    loadAutosave() {
        const autosave = localStorage.getItem(this.autosaveKey);
        if (autosave) {
            try {
                const project = JSON.parse(autosave);
                this.deserializeState(project);
                return true;
            } catch (e) {
                console.warn('Failed to load autosave:', e);
            }
        }
        return false;
    }

    getSavedProjects() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('Failed to load projects:', e);
            return [];
        }
    }

    populateSavedProjects() {
        const container = document.getElementById('savedProjectsList');
        if (!container) return;

        const projects = this.getSavedProjects();

        if (projects.length === 0) {
            container.innerHTML = '<p class="no-projects">Nenhum projeto guardado.</p>';
            return;
        }

        container.innerHTML = '';

        projects.forEach((project, index) => {
            const item = document.createElement('div');
            item.className = 'project-item';

            const date = new Date(project.savedAt);
            const dateStr = date.toLocaleDateString('pt-PT') + ' ' + date.toLocaleTimeString('pt-PT');

            item.innerHTML = `
                <div>
                    <span class="project-name">${project.name}</span>
                    <span class="project-date">${dateStr}</span>
                </div>
                <div class="project-actions">
                    <button class="layer-action-btn load-project" title="Carregar">↓</button>
                    <button class="layer-action-btn delete" title="Eliminar">×</button>
                </div>
            `;

            item.querySelector('.load-project').addEventListener('click', (e) => {
                e.stopPropagation();
                this.loadProject(project);
                document.getElementById('loadModal').classList.remove('active');
            });

            item.querySelector('.delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteProject(index);
                this.populateSavedProjects();
            });

            item.addEventListener('click', () => {
                this.loadProject(project);
                document.getElementById('loadModal').classList.remove('active');
            });

            container.appendChild(item);
        });
    }

    loadProject(project) {
        try {
            this.deserializeState(project);
            console.log('Project loaded:', project.name);
        } catch (e) {
            console.error('Failed to load project:', e);
            alert('Erro ao carregar o projeto.');
        }
    }

    deleteProject(index) {
        if (!confirm('Eliminar este projeto?')) return;

        const projects = this.getSavedProjects();
        projects.splice(index, 1);
        localStorage.setItem(this.storageKey, JSON.stringify(projects));
    }

    loadFromFile(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target.result);
                this.deserializeState(project);
                document.getElementById('loadModal').classList.remove('active');
            } catch (error) {
                console.error('Failed to parse file:', error);
                alert('Erro ao carregar o ficheiro. Verifica se é um ficheiro JSON válido.');
            }
        };

        reader.readAsText(file);
    }

    serializeState() {
        return {
            version: '1.0',
            canvas: {
                width: state.canvasWidth,
                height: state.canvasHeight
            },
            settings: {
                waveform: state.waveform,
                rangeMode: state.rangeMode,
                wingMode: state.wingMode,
                currentAxis: state.currentAxis,
                layerInteractionMode: state.layerInteractionMode
            },
            style: {
                bgColor: document.getElementById('bgColor')?.value || '#0a0a0f',
                bgAlpha: parseInt(document.getElementById('bgAlpha')?.value || '255'),
                clearBackground: document.getElementById('clearBackground')?.checked || true,
                blendMode: document.getElementById('blendMode')?.value || 'BLEND'
            },
            layers: layerSystem.serialize()
        };
    }

    deserializeState(project) {
        // Restore canvas size
        if (project.canvas) {
            state.canvasWidth = project.canvas.width;
            state.canvasHeight = project.canvas.height;
            resizeCanvas(state.canvasWidth, state.canvasHeight);
        }

        // Restore settings
        if (project.settings) {
            state.waveform = project.settings.waveform || 'sine';
            state.rangeMode = project.settings.rangeMode || false;
            state.wingMode = project.settings.wingMode || false;
            state.currentAxis = project.settings.currentAxis || 'all';
            state.layerInteractionMode = project.settings.layerInteractionMode || 'composite';

            // Update UI
            document.querySelectorAll('.wave-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.wave === state.waveform);
            });
            document.getElementById('rangeMode').checked = state.rangeMode;
            document.getElementById('wingMode').checked = state.wingMode;
            document.querySelectorAll('.axis-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.axis === state.currentAxis);
            });
            document.getElementById('layerInteractionMode').value = state.layerInteractionMode;
        }

        // Restore style
        if (project.style) {
            document.getElementById('bgColor').value = project.style.bgColor;
            document.getElementById('bgAlpha').value = project.style.bgAlpha;
            document.getElementById('bgAlphaValue').textContent = project.style.bgAlpha;
            document.getElementById('clearBackground').checked = project.style.clearBackground;
            document.getElementById('blendMode').value = project.style.blendMode;
        }

        // Restore layers
        if (project.layers) {
            layerSystem.deserialize(project.layers);
        }

        // Update faders
        faderSystem.updateFadersUI();
    }
}
