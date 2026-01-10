/**
 * Layer System Module
 * Manages layers with interactive capabilities
 */

import { state } from '../app.js';

export class LayerSystem {
    constructor() {
        this.layers = [];
    }

    addLayer(name, color) {
        const layer = {
            id: Date.now() + Math.random(),
            name: name,
            color: color,
            visible: true,
            locked: false,
            shapes: [],
            style: {
                fillColor: '#ffffff',
                fillAlpha: 255,
                noFill: false,
                strokeColor: '#00ffff',
                strokeAlpha: 255,
                noStroke: false,
                strokeWeight: 2
            },
            // Layer-level effect parameters (affect all shapes)
            effects: {
                offsetX: 0,
                offsetY: 0,
                rotation: 0,
                scale: 1,
                noise: 0
            }
        };

        this.layers.push(layer);
        state.activeLayerIndex = this.layers.length - 1;

        this.updateLayersUI();
        return layer;
    }

    removeLayer(id) {
        const index = this.layers.findIndex(l => l.id === id);
        if (index !== -1) {
            this.layers.splice(index, 1);

            // Adjust active index
            if (state.activeLayerIndex >= this.layers.length) {
                state.activeLayerIndex = Math.max(0, this.layers.length - 1);
            }

            this.updateLayersUI();
        }
    }

    duplicateLayer(id) {
        const layer = this.layers.find(l => l.id === id);
        if (layer) {
            const duplicate = JSON.parse(JSON.stringify(layer));
            duplicate.id = Date.now() + Math.random();
            duplicate.name = layer.name + ' (copy)';

            // Find index and insert after
            const index = this.layers.findIndex(l => l.id === id);
            this.layers.splice(index + 1, 0, duplicate);

            this.updateLayersUI();
        }
    }

    moveLayerUp(id) {
        const index = this.layers.findIndex(l => l.id === id);
        if (index > 0) {
            [this.layers[index], this.layers[index - 1]] = [this.layers[index - 1], this.layers[index]];
            this.updateLayersUI();
        }
    }

    moveLayerDown(id) {
        const index = this.layers.findIndex(l => l.id === id);
        if (index < this.layers.length - 1) {
            [this.layers[index], this.layers[index + 1]] = [this.layers[index + 1], this.layers[index]];
            this.updateLayersUI();
        }
    }

    toggleVisibility(id) {
        const layer = this.layers.find(l => l.id === id);
        if (layer) {
            layer.visible = !layer.visible;
            this.updateLayersUI();
        }
    }

    setActiveLayer(id) {
        const index = this.layers.findIndex(l => l.id === id);
        if (index !== -1) {
            state.activeLayerIndex = index;
            this.updateLayersUI();

            // Update color controls to match layer
            const layer = this.layers[index];
            this.syncUIWithLayer(layer);
        }
    }

    syncUIWithLayer(layer) {
        // Update color inputs
        const fillColor = document.getElementById('fillColor');
        const fillAlpha = document.getElementById('fillAlpha');
        const noFill = document.getElementById('noFill');
        const strokeColor = document.getElementById('strokeColor');
        const strokeAlpha = document.getElementById('strokeAlpha');
        const noStroke = document.getElementById('noStroke');
        const strokeWeight = document.getElementById('strokeWeight');

        if (fillColor) fillColor.value = layer.style.fillColor;
        if (fillAlpha) fillAlpha.value = layer.style.fillAlpha;
        if (noFill) noFill.checked = layer.style.noFill;
        if (strokeColor) strokeColor.value = layer.style.strokeColor;
        if (strokeAlpha) strokeAlpha.value = layer.style.strokeAlpha;
        if (noStroke) noStroke.checked = layer.style.noStroke;
        if (strokeWeight) strokeWeight.value = layer.style.strokeWeight;

        // Update value displays
        document.getElementById('fillAlphaValue').textContent = layer.style.fillAlpha;
        document.getElementById('strokeAlphaValue').textContent = layer.style.strokeAlpha;
        document.getElementById('strokeWeightValue').textContent = layer.style.strokeWeight;
    }

    getActiveLayer() {
        return this.layers[state.activeLayerIndex] || null;
    }

    getLayers() {
        return this.layers;
    }

    addShapeToActiveLayer(shapeType) {
        const layer = this.getActiveLayer();
        if (!layer) return;

        const shape = this.createShape(shapeType);
        layer.shapes.push(shape);

        return shape;
    }

    createShape(type) {
        // Default shape parameters
        const centerX = state.canvasWidth / 2;
        const centerY = state.canvasHeight / 2;

        const baseParams = {
            // Position (with X, Y, Z axes)
            posX: centerX,
            posY: centerY,
            posZ: 0,

            // Position rates for animation
            posXRate: 0,
            posYRate: 0,
            posZRate: 0,

            // Position ranges (for range mode)
            posXMin: centerX - 100,
            posXMax: centerX + 100,
            posYMin: centerY - 100,
            posYMax: centerY + 100,

            // Size
            size: 100,
            sizeX: 100,
            sizeY: 100,
            sizeZ: 50,
            sizeRate: 0,
            sizeMin: 20,
            sizeMax: 200,

            // Rotation
            rotation: 0,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            rotationRate: 0,
            rotationMin: 0,
            rotationMax: 360,

            // Count (for patterns)
            count: 10,
            countX: 10,
            countY: 10,
            countRate: 0,
            countMin: 2,
            countMax: 50,

            // Spacing
            spacing: 20,
            spacingX: 20,
            spacingY: 20,
            spacingRate: 0,
            spacingMin: 5,
            spacingMax: 100,

            // Amplitude (for waves/oscillations)
            amplitude: 50,
            amplitudeX: 50,
            amplitudeY: 50,
            amplitudeRate: 0,
            amplitudeMin: 0,
            amplitudeMax: 200,

            // Frequency
            frequency: 1,
            frequencyX: 1,
            frequencyY: 1,
            frequencyRate: 0,
            frequencyMin: 0.1,
            frequencyMax: 10,

            // Phase
            phase: 0,
            phaseX: 0,
            phaseY: 0,
            phaseRate: 1,
            phaseMin: 0,
            phaseMax: 360,

            // Speed
            speed: 1,
            speedX: 1,
            speedY: 1,
            speedRate: 0,
            speedMin: 0,
            speedMax: 10,

            // Custom parameters per shape type
            startAngle: 0,
            endAngle: 360,
            radius: 50,
            innerRadius: 25,
            segments: 6,
            corners: 4,
            tightness: 0,
            detail: 20,

            // Wing (symmetry) enabled
            wingEnabled: false,
            wingAxis: 'x', // 'x', 'y', or 'both'
        };

        const shape = {
            id: Date.now() + Math.random(),
            type: type,
            params: { ...baseParams },
            rangeMode: false,
            wingMode: false
        };

        // Adjust default parameters based on shape type
        switch (type) {
            case 'line':
                shape.params.size = 200;
                shape.params.sizeX = 0;
                shape.params.sizeY = 200;
                break;
            case 'arc':
                shape.params.startAngle = 0;
                shape.params.endAngle = 270;
                break;
            case 'verticalLines':
            case 'horizontalLines':
            case 'diagonalLines':
                shape.params.count = 20;
                shape.params.spacing = 30;
                break;
            case 'dotMatrix':
            case 'grid':
                shape.params.countX = 15;
                shape.params.countY = 15;
                shape.params.spacingX = 40;
                shape.params.spacingY = 40;
                break;
            case 'concentricCircles':
                shape.params.count = 10;
                shape.params.spacing = 30;
                break;
            case 'spiral':
                shape.params.size = 200;
                shape.params.count = 5;
                break;
            case 'wave':
                shape.params.amplitude = 80;
                shape.params.frequency = 2;
                shape.params.detail = 50;
                break;
        }

        return shape;
    }

    updateLayersUI() {
        const container = document.getElementById('layersList');
        if (!container) return;

        container.innerHTML = '';

        // Reverse to show top layer first
        [...this.layers].reverse().forEach((layer, reverseIndex) => {
            const index = this.layers.length - 1 - reverseIndex;
            const isActive = index === state.activeLayerIndex;

            const item = document.createElement('div');
            item.className = `layer-item${isActive ? ' active' : ''}`;
            item.dataset.id = layer.id;

            item.innerHTML = `
                <div class="layer-visibility ${layer.visible ? 'visible' : ''}" title="Visibilidade">
                    ${layer.visible ? '👁' : '○'}
                </div>
                <div class="layer-color" style="background: ${layer.color}"></div>
                <div class="layer-name">
                    <input type="text" value="${layer.name}" />
                </div>
                <div class="layer-actions">
                    <button class="layer-action-btn duplicate" title="Duplicar">⧉</button>
                    <button class="layer-action-btn move-up" title="Mover para cima">↑</button>
                    <button class="layer-action-btn move-down" title="Mover para baixo">↓</button>
                    <button class="layer-action-btn delete" title="Eliminar">×</button>
                </div>
            `;

            // Event listeners
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.layer-visibility') &&
                    !e.target.closest('.layer-actions') &&
                    !e.target.closest('input')) {
                    this.setActiveLayer(layer.id);
                }
            });

            item.querySelector('.layer-visibility').addEventListener('click', () => {
                this.toggleVisibility(layer.id);
            });

            item.querySelector('.duplicate').addEventListener('click', () => {
                this.duplicateLayer(layer.id);
            });

            item.querySelector('.move-up').addEventListener('click', () => {
                this.moveLayerDown(layer.id); // Reversed because of display order
            });

            item.querySelector('.move-down').addEventListener('click', () => {
                this.moveLayerUp(layer.id); // Reversed because of display order
            });

            item.querySelector('.delete').addEventListener('click', () => {
                this.removeLayer(layer.id);
            });

            item.querySelector('input').addEventListener('change', (e) => {
                layer.name = e.target.value;
            });

            container.appendChild(item);
        });
    }

    // Serialize for save/export
    serialize() {
        return {
            layers: this.layers,
            activeLayerIndex: state.activeLayerIndex
        };
    }

    // Deserialize from saved state
    deserialize(data) {
        this.layers = data.layers || [];
        state.activeLayerIndex = data.activeLayerIndex || 0;
        this.updateLayersUI();
    }
}
