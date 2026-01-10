/**
 * Effects Engine Module
 * Handles waveform generation and effect calculations
 */

import { state } from '../app.js';

export class EffectsEngine {
    constructor() {
        // Waveform lookup tables for performance
        this.lookupResolution = 360;
        this.sineLookup = this.generateSineLookup();
        this.triangleLookup = this.generateTriangleLookup();
        this.squareLookup = this.generateSquareLookup();
        this.sawtoothLookup = this.generateSawtoothLookup();
    }

    generateSineLookup() {
        const table = [];
        for (let i = 0; i < this.lookupResolution; i++) {
            table[i] = Math.sin((i / this.lookupResolution) * Math.PI * 2);
        }
        return table;
    }

    generateTriangleLookup() {
        const table = [];
        for (let i = 0; i < this.lookupResolution; i++) {
            const phase = i / this.lookupResolution;
            if (phase < 0.25) {
                table[i] = phase * 4;
            } else if (phase < 0.75) {
                table[i] = 1 - (phase - 0.25) * 4;
            } else {
                table[i] = -1 + (phase - 0.75) * 4;
            }
        }
        return table;
    }

    generateSquareLookup() {
        const table = [];
        for (let i = 0; i < this.lookupResolution; i++) {
            table[i] = i < this.lookupResolution / 2 ? 1 : -1;
        }
        return table;
    }

    generateSawtoothLookup() {
        const table = [];
        for (let i = 0; i < this.lookupResolution; i++) {
            table[i] = (i / this.lookupResolution) * 2 - 1;
        }
        return table;
    }

    /**
     * Get waveform value at a given phase
     * @param {string} waveform - Type of waveform
     * @param {number} phase - Phase value in degrees (0-360)
     * @returns {number} Value between -1 and 1
     */
    getWaveValue(waveform, phase) {
        // Normalize phase to 0-360
        phase = ((phase % 360) + 360) % 360;
        const index = Math.floor((phase / 360) * this.lookupResolution) % this.lookupResolution;

        switch (waveform) {
            case 'sine':
                return this.sineLookup[index];
            case 'triangle':
                return this.triangleLookup[index];
            case 'square':
                return this.squareLookup[index];
            case 'sawtooth':
                return this.sawtoothLookup[index];
            case 'noise':
                return Math.random() * 2 - 1;
            default:
                return this.sineLookup[index];
        }
    }

    /**
     * Calculate animated parameter value
     * @param {object} shape - Shape with params
     * @param {string} paramName - Parameter name (e.g., 'size', 'rotation')
     * @param {string} axis - Axis ('x', 'y', 'z', or null for all)
     * @returns {number} Calculated value
     */
    calculateAnimatedValue(shape, paramName, axis = null) {
        const params = shape.params;
        const time = state.time;
        const waveform = state.waveform;

        // Get base value and rate
        let baseValue, rate, minVal, maxVal;

        if (axis) {
            const axisUpper = axis.toUpperCase();
            baseValue = params[`${paramName}${axisUpper}`] ?? params[paramName];
            rate = params[`${paramName}Rate`] ?? 0;
            minVal = params[`${paramName}Min`];
            maxVal = params[`${paramName}Max`];
        } else {
            baseValue = params[paramName];
            rate = params[`${paramName}Rate`] ?? 0;
            minVal = params[`${paramName}Min`];
            maxVal = params[`${paramName}Max`];
        }

        // If no rate, return base value
        if (rate === 0) {
            return baseValue;
        }

        // Calculate phase based on time and rate
        const phase = (time * rate * 360) % 360;

        // Get wave value
        const waveValue = this.getWaveValue(waveform, phase);

        // If in range mode, interpolate between min and max
        if (state.rangeMode && minVal !== undefined && maxVal !== undefined) {
            const normalizedWave = (waveValue + 1) / 2; // 0 to 1
            return minVal + (maxVal - minVal) * normalizedWave;
        }

        // Otherwise apply wave as offset from base
        const amplitude = params[`${paramName}Amplitude`] ?? (maxVal - minVal) / 2 ?? 50;
        return baseValue + waveValue * amplitude * rate;
    }

    /**
     * Calculate position with effects applied
     */
    calculatePosition(shape, index = 0, total = 1) {
        const params = shape.params;
        const time = state.time;
        const waveform = state.waveform;

        let x = params.posX;
        let y = params.posY;
        let z = params.posZ || 0;

        // Apply animation rates
        if (params.posXRate !== 0) {
            const phase = (time * params.posXRate * 360 + params.phaseX) % 360;
            const wave = this.getWaveValue(waveform, phase);
            x += wave * params.amplitudeX;
        }

        if (params.posYRate !== 0) {
            const phase = (time * params.posYRate * 360 + params.phaseY) % 360;
            const wave = this.getWaveValue(waveform, phase);
            y += wave * params.amplitudeY;
        }

        // Apply per-element offset for patterns
        if (total > 1) {
            const elementPhase = (index / total) * 360;
            const phaseOffset = (time * params.speed * 360 + elementPhase) % 360;
            const waveOffset = this.getWaveValue(waveform, phaseOffset);

            // Add element-specific oscillation
            x += waveOffset * params.amplitude * 0.5;
            y += this.getWaveValue(waveform, phaseOffset + 90) * params.amplitude * 0.5;
        }

        // Apply wing/symmetry
        if (shape.wingMode || state.wingMode) {
            // Return both original and mirrored positions
            return [
                { x, y, z },
                { x: state.canvasWidth - x, y, z }, // Mirror on X
            ];
        }

        return [{ x, y, z }];
    }

    /**
     * Apply range mode - return value oscillating between min and max
     */
    getValueInRange(min, max, phase, waveform) {
        const waveValue = this.getWaveValue(waveform, phase);
        const normalizedWave = (waveValue + 1) / 2; // Convert -1..1 to 0..1
        return min + (max - min) * normalizedWave;
    }

    /**
     * Calculate size with effects
     */
    calculateSize(shape, index = 0, total = 1) {
        const params = shape.params;
        const time = state.time;
        const waveform = state.waveform;

        let size = params.size;
        let sizeX = params.sizeX;
        let sizeY = params.sizeY;

        // Apply animation
        if (params.sizeRate !== 0) {
            const phase = (time * params.sizeRate * 360) % 360;

            if (state.rangeMode) {
                size = this.getValueInRange(params.sizeMin, params.sizeMax, phase, waveform);
            } else {
                const wave = this.getWaveValue(waveform, phase);
                size += wave * params.amplitude * 0.5;
            }
        }

        // Per-element size variation
        if (total > 1) {
            const elementPhase = (index / total) * 360;
            const phaseOffset = (time * params.speed * 360 + elementPhase) % 360;
            const sizeVariation = this.getWaveValue(waveform, phaseOffset);
            size += sizeVariation * params.amplitude * 0.2;
        }

        return { size: Math.max(1, size), sizeX: Math.max(1, sizeX), sizeY: Math.max(1, sizeY) };
    }

    /**
     * Calculate rotation with effects
     */
    calculateRotation(shape, index = 0, total = 1) {
        const params = shape.params;
        const time = state.time;
        const waveform = state.waveform;

        let rotation = params.rotation;

        // Continuous rotation based on rate
        if (params.rotationRate !== 0) {
            if (state.rangeMode) {
                const phase = (time * params.rotationRate * 360) % 360;
                rotation = this.getValueInRange(params.rotationMin, params.rotationMax, phase, waveform);
            } else {
                rotation += time * params.rotationRate * 360;
            }
        }

        // Per-element rotation for patterns
        if (total > 1 && params.rotationRate !== 0) {
            rotation += (index / total) * 360;
        }

        return rotation;
    }

    /**
     * Apply effect to a value with optional axis separation
     */
    applyEffect(baseValue, effectParams, axis = null) {
        const time = state.time;
        const waveform = state.waveform;

        const rate = effectParams.rate || 0;
        const amplitude = effectParams.amplitude || 0;
        const phase = effectParams.phase || 0;

        if (rate === 0) return baseValue;

        const calculatedPhase = (time * rate * 360 + phase) % 360;
        const waveValue = this.getWaveValue(waveform, calculatedPhase);

        return baseValue + waveValue * amplitude;
    }

    /**
     * Get pattern positions for dot matrix/grid effects
     */
    getPatternPositions(shape, sourceLayer = null) {
        const params = shape.params;
        const positions = [];

        const countX = params.countX || params.count || 10;
        const countY = params.countY || params.count || 10;
        const spacingX = params.spacingX || params.spacing || 20;
        const spacingY = params.spacingY || params.spacing || 20;

        const totalWidth = (countX - 1) * spacingX;
        const totalHeight = (countY - 1) * spacingY;

        const startX = params.posX - totalWidth / 2;
        const startY = params.posY - totalHeight / 2;

        for (let row = 0; row < countY; row++) {
            for (let col = 0; col < countX; col++) {
                const index = row * countX + col;
                const total = countX * countY;

                let x = startX + col * spacingX;
                let y = startY + row * spacingY;

                // Apply animation per element
                const elementPhase = (index / total) * 360;
                const phase = (state.time * params.speed * 360 + elementPhase + params.phase) % 360;

                const waveX = this.getWaveValue(state.waveform, phase);
                const waveY = this.getWaveValue(state.waveform, phase + 90);

                x += waveX * params.amplitudeX;
                y += waveY * params.amplitudeY;

                // Sample from source layer if available (for interactive layers)
                let sampleValue = 1;
                if (sourceLayer) {
                    // Get brightness/density from source layer at this position
                    sampleValue = this.sampleLayerValue(sourceLayer, x, y);
                }

                positions.push({
                    x, y,
                    index,
                    row, col,
                    phase,
                    sampleValue
                });
            }
        }

        return positions;
    }

    /**
     * Sample value from a layer at a given position
     * Used for layer interaction
     */
    sampleLayerValue(layer, x, y) {
        // This would sample the layer's rendered output
        // For now, return 1 (full opacity)
        // In a full implementation, you'd check the pixel data at x,y
        return 1;
    }

    /**
     * Generate wave positions for wave patterns
     */
    getWavePositions(shape) {
        const params = shape.params;
        const positions = [];

        const detail = params.detail || 50;
        const amplitude = params.amplitude || 50;
        const frequency = params.frequency || 2;

        for (let i = 0; i < detail; i++) {
            const t = i / (detail - 1);
            const x = t * state.canvasWidth;

            // Calculate y based on wave equation
            const phase = (state.time * params.speed * 360 + params.phase) % 360;
            const wavePhase = t * frequency * 360 + phase;
            const waveValue = this.getWaveValue(state.waveform, wavePhase);

            const y = params.posY + waveValue * amplitude;

            positions.push({ x, y, t, index: i });
        }

        return positions;
    }

    /**
     * Generate spiral positions
     */
    getSpiralPositions(shape) {
        const params = shape.params;
        const positions = [];

        const turns = params.count || 5;
        const maxRadius = params.size || 200;
        const detail = params.detail || 100;

        const centerX = params.posX;
        const centerY = params.posY;

        for (let i = 0; i < detail; i++) {
            const t = i / (detail - 1);
            const angle = t * turns * 360 + (state.time * params.speed * 360) % 360;
            const radius = t * maxRadius;

            const x = centerX + Math.cos(angle * Math.PI / 180) * radius;
            const y = centerY + Math.sin(angle * Math.PI / 180) * radius;

            positions.push({ x, y, angle, radius, t, index: i });
        }

        return positions;
    }
}
