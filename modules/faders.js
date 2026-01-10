/**
 * Fader System Module
 */

import { state, layerSystem } from '../app.js';

export class FaderSystem {
    constructor() {
        this.container = document.getElementById('fadersContainer');
        this.activeFaders = [];

        this.parameterConfigs = {
            posX: { min: 0, max: 800, default: 400, label: 'Pos X' },
            posY: { min: 0, max: 600, default: 300, label: 'Pos Y' },
            posZ: { min: -500, max: 500, default: 0, label: 'Pos Z' },
            size: { min: 1, max: 500, default: 100, label: 'Tamanho' },
            sizeX: { min: 1, max: 500, default: 100, label: 'Tam. X' },
            sizeY: { min: 1, max: 500, default: 100, label: 'Tam. Y' },
            rotation: { min: 0, max: 360, default: 0, label: 'Rotação' },
            count: { min: 1, max: 100, default: 10, label: 'Contagem' },
            countX: { min: 1, max: 50, default: 10, label: 'Cont. X' },
            countY: { min: 1, max: 50, default: 10, label: 'Cont. Y' },
            spacing: { min: 1, max: 200, default: 20, label: 'Espaço' },
            spacingX: { min: 1, max: 200, default: 20, label: 'Esp. X' },
            spacingY: { min: 1, max: 200, default: 20, label: 'Esp. Y' },
            amplitude: { min: 0, max: 300, default: 50, label: 'Amplitude' },
            frequency: { min: 0.1, max: 20, default: 1, step: 0.1, label: 'Frequência' },
            phase: { min: 0, max: 360, default: 0, label: 'Fase' },
            speed: { min: 0, max: 10, default: 1, step: 0.1, label: 'Velocidade' },
            startAngle: { min: 0, max: 360, default: 0, label: 'Âng. Início' },
            endAngle: { min: 0, max: 360, default: 360, label: 'Âng. Fim' },
            radius: { min: 1, max: 400, default: 50, label: 'Raio' },
            detail: { min: 10, max: 200, default: 50, label: 'Detalhe' }
        };
    }

    updateFadersUI() {
        if (!this.container) return;
        this.container.innerHTML = '';
        this.activeFaders = [];

        const layer = layerSystem?.getActiveLayer();
        if (!layer || layer.shapes.length === 0) {
            this.container.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">Adiciona uma forma</p>';
            return;
        }

        const shape = layer.shapes[layer.shapes.length - 1];
        const relevantParams = this.getRelevantParams(shape.type);

        relevantParams.forEach(paramName => {
            const config = this.parameterConfigs[paramName] || { min: 0, max: 100, default: 50, label: paramName };

            if (state.currentAxis !== 'all') {
                if (paramName.endsWith('X') && state.currentAxis !== 'x') return;
                if (paramName.endsWith('Y') && state.currentAxis !== 'y') return;
                if (paramName.endsWith('Z') && state.currentAxis !== 'z') return;
            }

            const fader = this.createFader(paramName, shape.params[paramName], config, shape);
            this.container.appendChild(fader);
            this.activeFaders.push({ element: fader, paramName, shape });
        });
    }

    getRelevantParams(shapeType) {
        const baseParams = ['posX', 'posY', 'size', 'rotation', 'speed', 'amplitude', 'frequency', 'phase'];
        const specific = {
            circle: ['radius'],
            ellipse: ['sizeX', 'sizeY'],
            rect: ['sizeX', 'sizeY'],
            arc: ['radius', 'startAngle', 'endAngle'],
            grid: ['countX', 'countY', 'spacingX', 'spacingY'],
            dotMatrix: ['countX', 'countY', 'spacingX', 'spacingY'],
            verticalLines: ['count', 'spacing'],
            horizontalLines: ['count', 'spacing'],
            diagonalLines: ['count', 'spacing'],
            concentricCircles: ['count', 'spacing', 'radius'],
            spiral: ['count', 'detail'],
            wave: ['amplitude', 'frequency', 'detail']
        };
        return [...baseParams, ...(specific[shapeType] || [])];
    }

    createFader(paramName, value, config, shape) {
        const fader = document.createElement('div');
        fader.className = 'fader';
        if (state.wingMode) fader.classList.add('wing-mode');
        if (state.rangeMode) fader.classList.add('range-mode');

        const step = config.step || 1;
        const currentValue = value !== undefined ? value : config.default;
        const fillPercent = ((currentValue - config.min) / (config.max - config.min)) * 100;

        fader.innerHTML = `
            <div class="fader-label">${config.label}</div>
            <div class="fader-track">
                <div class="fader-fill" style="height: ${fillPercent}%"></div>
                <div class="fader-thumb" style="bottom: calc(${fillPercent}% - 4px)"></div>
            </div>
            <div class="fader-value">${currentValue.toFixed(step < 1 ? 1 : 0)}</div>
        `;

        this.addDragHandlers(fader, shape, paramName, config);

        fader.addEventListener('dblclick', () => {
            shape.params[paramName] = config.default;
            this.updateFadersUI();
        });

        return fader;
    }

    addDragHandlers(fader, shape, paramName, config) {
        const track = fader.querySelector('.fader-track');
        const thumb = fader.querySelector('.fader-thumb');
        const fill = fader.querySelector('.fader-fill');
        const valueDisplay = fader.querySelector('.fader-value');
        let isDragging = false;

        const updateValue = (e) => {
            if (!isDragging) return;
            const rect = track.getBoundingClientRect();
            const y = e.clientY || (e.touches?.[0]?.clientY);
            const percentage = 1 - Math.max(0, Math.min(1, (y - rect.top) / rect.height));

            const step = config.step || 1;
            let newValue = config.min + percentage * (config.max - config.min);
            newValue = Math.round(newValue / step) * step;
            newValue = Math.max(config.min, Math.min(config.max, newValue));

            shape.params[paramName] = newValue;
            const fillPercent = ((newValue - config.min) / (config.max - config.min)) * 100;
            fill.style.height = `${fillPercent}%`;
            thumb.style.bottom = `calc(${fillPercent}% - 4px)`;
            valueDisplay.textContent = newValue.toFixed(step < 1 ? 1 : 0);
        };

        const startDrag = (e) => { isDragging = true; fader.classList.add('active'); updateValue(e); };
        const endDrag = () => { isDragging = false; fader.classList.remove('active'); };

        track.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', updateValue);
        document.addEventListener('mouseup', endDrag);
    }

    updateFadersFromShape(shape) {
        this.activeFaders.forEach(({ element, paramName }) => {
            if (shape.params[paramName] !== undefined) {
                const valueDisplay = element.querySelector('.fader-value');
                const fill = element.querySelector('.fader-fill');
                const thumb = element.querySelector('.fader-thumb');
                const config = this.parameterConfigs[paramName] || { min: 0, max: 100 };
                const value = shape.params[paramName];
                const fillPercent = ((value - config.min) / (config.max - config.min)) * 100;
                if (valueDisplay) valueDisplay.textContent = value.toFixed(1);
                if (fill) fill.style.height = `${fillPercent}%`;
                if (thumb) thumb.style.bottom = `calc(${fillPercent}% - 4px)`;
            }
        });
    }

    resetAllFaders() {
        const layer = layerSystem?.getActiveLayer();
        if (!layer) return;
        layer.shapes.forEach(shape => {
            Object.keys(this.parameterConfigs).forEach(p => {
                if (shape.params[p] !== undefined) shape.params[p] = this.parameterConfigs[p].default;
            });
        });
        this.updateFadersUI();
    }
}
