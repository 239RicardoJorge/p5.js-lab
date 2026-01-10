/**
 * Shape Renderer Module
 * Renders all shape types with effects applied
 */

export class ShapeRenderer {
    constructor() { }

    renderLayer(buffer, layer, effectsEngine, state) {
        layer.shapes.forEach(shape => {
            this.renderShape(buffer, shape, effectsEngine, state);
        });
    }

    renderShape(buffer, shape, effectsEngine, state) {
        const params = shape.params;
        const type = shape.type;

        // Calculate animated values
        const positions = effectsEngine.calculatePosition(shape);
        const { size, sizeX, sizeY } = effectsEngine.calculateSize(shape);
        const rotation = effectsEngine.calculateRotation(shape);

        // Render for each position (includes wing/symmetry)
        positions.forEach(pos => {
            buffer.push();
            buffer.translate(pos.x, pos.y);
            buffer.rotate(rotation);

            switch (type) {
                case 'circle':
                    this.drawCircle(buffer, size);
                    break;
                case 'ellipse':
                    this.drawEllipse(buffer, sizeX, sizeY);
                    break;
                case 'rect':
                    this.drawRect(buffer, sizeX, sizeY);
                    break;
                case 'square':
                    this.drawSquare(buffer, size);
                    break;
                case 'triangle':
                    this.drawTriangle(buffer, size);
                    break;
                case 'line':
                    this.drawLine(buffer, params);
                    break;
                case 'arc':
                    this.drawArc(buffer, params);
                    break;
                case 'point':
                    this.drawPoint(buffer);
                    break;
                case 'quad':
                    this.drawQuad(buffer, sizeX, sizeY);
                    break;
                case 'bezier':
                    this.drawBezier(buffer, params, effectsEngine, state);
                    break;
                case 'curve':
                    this.drawCurve(buffer, params, effectsEngine, state);
                    break;
                case 'grid':
                    buffer.pop();
                    this.drawGrid(buffer, shape, effectsEngine, state);
                    return;
                case 'dotMatrix':
                    buffer.pop();
                    this.drawDotMatrix(buffer, shape, effectsEngine, state);
                    return;
                case 'verticalLines':
                    buffer.pop();
                    this.drawVerticalLines(buffer, shape, effectsEngine, state);
                    return;
                case 'horizontalLines':
                    buffer.pop();
                    this.drawHorizontalLines(buffer, shape, effectsEngine, state);
                    return;
                case 'diagonalLines':
                    buffer.pop();
                    this.drawDiagonalLines(buffer, shape, effectsEngine, state);
                    return;
                case 'concentricCircles':
                    this.drawConcentricCircles(buffer, params);
                    break;
                case 'spiral':
                    buffer.pop();
                    this.drawSpiral(buffer, shape, effectsEngine, state);
                    return;
                case 'wave':
                    buffer.pop();
                    this.drawWave(buffer, shape, effectsEngine, state);
                    return;
            }

            buffer.pop();
        });
    }

    drawCircle(buffer, size) {
        buffer.circle(0, 0, size);
    }

    drawEllipse(buffer, sizeX, sizeY) {
        buffer.ellipse(0, 0, sizeX, sizeY);
    }

    drawRect(buffer, sizeX, sizeY) {
        buffer.rectMode(buffer.CENTER);
        buffer.rect(0, 0, sizeX, sizeY);
    }

    drawSquare(buffer, size) {
        buffer.rectMode(buffer.CENTER);
        buffer.square(0, 0, size);
    }

    drawTriangle(buffer, size) {
        const h = size * 0.866;
        buffer.triangle(0, -h / 2, -size / 2, h / 2, size / 2, h / 2);
    }

    drawLine(buffer, params) {
        buffer.line(-params.sizeX / 2, -params.sizeY / 2, params.sizeX / 2, params.sizeY / 2);
    }

    drawArc(buffer, params) {
        buffer.arc(0, 0, params.radius * 2, params.radius * 2, params.startAngle, params.endAngle);
    }

    drawPoint(buffer) {
        buffer.point(0, 0);
    }

    drawQuad(buffer, sizeX, sizeY) {
        buffer.quad(-sizeX / 2, -sizeY / 2, sizeX / 2, -sizeY / 2, sizeX / 2, sizeY / 2, -sizeX / 2, sizeY / 2);
    }

    drawBezier(buffer, params, effectsEngine, state) {
        const amp = params.amplitude;
        buffer.bezier(-100, 0, -50, -amp, 50, amp, 100, 0);
    }

    drawCurve(buffer, params, effectsEngine, state) {
        const amp = params.amplitude;
        buffer.curve(-100, amp, -50, 0, 50, 0, 100, -amp);
    }

    drawGrid(buffer, shape, effectsEngine, state) {
        const positions = effectsEngine.getPatternPositions(shape);
        positions.forEach(pos => {
            buffer.push();
            buffer.translate(pos.x, pos.y);
            buffer.line(-5, 0, 5, 0);
            buffer.line(0, -5, 0, 5);
            buffer.pop();
        });
    }

    drawDotMatrix(buffer, shape, effectsEngine, state) {
        const positions = effectsEngine.getPatternPositions(shape);
        const size = shape.params.size || 5;
        positions.forEach(pos => {
            buffer.circle(pos.x, pos.y, size * pos.sampleValue);
        });
    }

    drawVerticalLines(buffer, shape, effectsEngine, state) {
        const params = shape.params;
        const count = params.count || 10;
        const spacing = params.spacing || 30;
        const h = state.canvasHeight;
        const totalWidth = (count - 1) * spacing;
        const startX = params.posX - totalWidth / 2;

        for (let i = 0; i < count; i++) {
            const phase = (state.time * params.speed * 360 + (i / count) * 360 + params.phase) % 360;
            const wave = effectsEngine.getWaveValue(state.waveform, phase);
            const x = startX + i * spacing + wave * params.amplitude;
            buffer.line(x, 0, x, h);
        }
    }

    drawHorizontalLines(buffer, shape, effectsEngine, state) {
        const params = shape.params;
        const count = params.count || 10;
        const spacing = params.spacing || 30;
        const w = state.canvasWidth;
        const totalHeight = (count - 1) * spacing;
        const startY = params.posY - totalHeight / 2;

        for (let i = 0; i < count; i++) {
            const phase = (state.time * params.speed * 360 + (i / count) * 360 + params.phase) % 360;
            const wave = effectsEngine.getWaveValue(state.waveform, phase);
            const y = startY + i * spacing + wave * params.amplitude;
            buffer.line(0, y, w, y);
        }
    }

    drawDiagonalLines(buffer, shape, effectsEngine, state) {
        const params = shape.params;
        const count = params.count || 10;
        const spacing = params.spacing || 30;
        const angle = params.rotation || 45;

        buffer.push();
        buffer.translate(params.posX, params.posY);
        buffer.rotate(angle);

        const len = Math.sqrt(state.canvasWidth ** 2 + state.canvasHeight ** 2);
        const totalWidth = (count - 1) * spacing;

        for (let i = 0; i < count; i++) {
            const x = -totalWidth / 2 + i * spacing;
            buffer.line(x, -len / 2, x, len / 2);
        }
        buffer.pop();
    }

    drawConcentricCircles(buffer, params) {
        const count = params.count || 10;
        const spacing = params.spacing || 30;
        for (let i = 0; i < count; i++) {
            buffer.circle(0, 0, (i + 1) * spacing * 2);
        }
    }

    drawSpiral(buffer, shape, effectsEngine, state) {
        const positions = effectsEngine.getSpiralPositions(shape);
        buffer.beginShape();
        positions.forEach(pos => {
            buffer.vertex(pos.x, pos.y);
        });
        buffer.endShape();
    }

    drawWave(buffer, shape, effectsEngine, state) {
        const positions = effectsEngine.getWavePositions(shape);
        buffer.beginShape();
        positions.forEach(pos => {
            buffer.vertex(pos.x, pos.y);
        });
        buffer.endShape();
    }
}
