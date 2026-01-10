/**
 * Export System Module
 * Handles exporting to various formats
 */

import { state, layerSystem } from '../app.js';

export class ExportSystem {
    constructor() {
        this.isRecording = false;
        this.frames = [];
    }

    export(format) {
        switch (format) {
            case 'png':
                this.exportPNG();
                break;
            case 'jpg':
                this.exportJPG();
                break;
            case 'svg':
                this.exportSVG();
                break;
            case 'gif':
                this.exportGIF();
                break;
            case 'frames':
                this.exportFrames();
                break;
            case 'code':
                this.exportCode();
                break;
            case 'json':
                this.exportJSON();
                break;
            default:
                console.warn('Unknown export format:', format);
        }

        // Close modal
        document.getElementById('exportModal').classList.remove('active');
    }

    exportPNG() {
        const resolution = this.getResolution();
        if (resolution.scale === 1) {
            saveCanvas('p5_playground', 'png');
        } else {
            this.exportAtResolution('png', resolution);
        }
    }

    exportJPG() {
        const resolution = this.getResolution();
        if (resolution.scale === 1) {
            saveCanvas('p5_playground', 'jpg');
        } else {
            this.exportAtResolution('jpg', resolution);
        }
    }

    exportAtResolution(format, resolution) {
        const pg = createGraphics(resolution.width, resolution.height);
        pg.scale(resolution.scale);

        // Re-render at higher resolution
        // This is simplified - full implementation would re-render all layers
        pg.background(document.getElementById('bgColor')?.value || '#0a0a0f');

        pg.save(`p5_playground_${resolution.width}x${resolution.height}`, format);
        pg.remove();
    }

    exportSVG() {
        // Create SVG manually
        const svgContent = this.generateSVG();
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'p5_playground.svg';
        a.click();

        URL.revokeObjectURL(url);
    }

    generateSVG() {
        const layers = layerSystem.getLayers();
        let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${state.canvasWidth}" height="${state.canvasHeight}" viewBox="0 0 ${state.canvasWidth} ${state.canvasHeight}">
<rect width="100%" height="100%" fill="${document.getElementById('bgColor')?.value || '#0a0a0f'}"/>
`;

        layers.forEach(layer => {
            if (!layer.visible) return;

            svg += `<g id="${layer.name.replace(/\s/g, '_')}" opacity="1">`;

            layer.shapes.forEach(shape => {
                svg += this.shapeToSVG(shape, layer);
            });

            svg += '</g>\n';
        });

        svg += '</svg>';
        return svg;
    }

    shapeToSVG(shape, layer) {
        const params = shape.params;
        const style = layer.style;
        const fill = style.noFill ? 'none' : style.fillColor;
        const stroke = style.noStroke ? 'none' : style.strokeColor;
        const strokeWidth = style.strokeWeight;

        let svg = '';

        switch (shape.type) {
            case 'circle':
                svg = `<circle cx="${params.posX}" cy="${params.posY}" r="${params.size / 2}" 
                         fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
                break;
            case 'ellipse':
                svg = `<ellipse cx="${params.posX}" cy="${params.posY}" rx="${params.sizeX / 2}" ry="${params.sizeY / 2}" 
                         fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
                break;
            case 'rect':
                svg = `<rect x="${params.posX - params.sizeX / 2}" y="${params.posY - params.sizeY / 2}" 
                         width="${params.sizeX}" height="${params.sizeY}" 
                         fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
                break;
            case 'line':
                svg = `<line x1="${params.posX - params.sizeX / 2}" y1="${params.posY - params.sizeY / 2}" 
                         x2="${params.posX + params.sizeX / 2}" y2="${params.posY + params.sizeY / 2}" 
                         stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
                break;
            default:
                svg = `<!-- Shape type ${shape.type} not fully supported in SVG export -->`;
        }

        return svg + '\n';
    }

    exportGIF() {
        alert('GIF export requer a biblioteca gif.js. Por agora, usa "Frames" para exportar sequência de imagens.');
    }

    exportFrames() {
        const numFrames = parseInt(document.getElementById('exportFrames')?.value || '60');
        alert(`Exportação de ${numFrames} frames iniciada. Os ficheiros serão guardados automaticamente.`);

        let frame = 0;
        const exportFrame = () => {
            if (frame < numFrames) {
                saveCanvas(`frame_${String(frame).padStart(4, '0')}`, 'png');
                frame++;
                setTimeout(exportFrame, 100);
            }
        };

        exportFrame();
    }

    exportCode() {
        const code = this.generateP5Code();
        const blob = new Blob([code], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'sketch.js';
        a.click();

        URL.revokeObjectURL(url);
    }

    generateP5Code() {
        const layers = layerSystem.getLayers();
        let code = `// P5.js Sketch - Generated by P5 Playground
// Generated at: ${new Date().toISOString()}

function setup() {
  createCanvas(${state.canvasWidth}, ${state.canvasHeight});
  angleMode(DEGREES);
}

function draw() {
  background('${document.getElementById('bgColor')?.value || '#0a0a0f'}');
  
`;

        layers.forEach((layer, i) => {
            if (!layer.visible) return;

            code += `  // ${layer.name}\n`;
            code += `  push();\n`;

            if (layer.style.noFill) {
                code += `  noFill();\n`;
            } else {
                code += `  fill('${layer.style.fillColor}');\n`;
            }

            if (layer.style.noStroke) {
                code += `  noStroke();\n`;
            } else {
                code += `  stroke('${layer.style.strokeColor}');\n`;
                code += `  strokeWeight(${layer.style.strokeWeight});\n`;
            }

            layer.shapes.forEach(shape => {
                code += this.shapeToCode(shape);
            });

            code += `  pop();\n\n`;
        });

        code += `}
`;
        return code;
    }

    shapeToCode(shape) {
        const p = shape.params;
        let code = '';

        switch (shape.type) {
            case 'circle':
                code = `  circle(${p.posX}, ${p.posY}, ${p.size});\n`;
                break;
            case 'ellipse':
                code = `  ellipse(${p.posX}, ${p.posY}, ${p.sizeX}, ${p.sizeY});\n`;
                break;
            case 'rect':
                code = `  rectMode(CENTER);\n  rect(${p.posX}, ${p.posY}, ${p.sizeX}, ${p.sizeY});\n`;
                break;
            case 'square':
                code = `  rectMode(CENTER);\n  square(${p.posX}, ${p.posY}, ${p.size});\n`;
                break;
            case 'triangle':
                const h = p.size * 0.866;
                code = `  triangle(${p.posX}, ${p.posY - h / 2}, ${p.posX - p.size / 2}, ${p.posY + h / 2}, ${p.posX + p.size / 2}, ${p.posY + h / 2});\n`;
                break;
            case 'line':
                code = `  line(${p.posX - p.sizeX / 2}, ${p.posY - p.sizeY / 2}, ${p.posX + p.sizeX / 2}, ${p.posY + p.sizeY / 2});\n`;
                break;
            case 'arc':
                code = `  arc(${p.posX}, ${p.posY}, ${p.radius * 2}, ${p.radius * 2}, ${p.startAngle}, ${p.endAngle});\n`;
                break;
            default:
                code = `  // ${shape.type} - custom shape\n`;
        }

        return code;
    }

    exportJSON() {
        const data = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            canvas: {
                width: state.canvasWidth,
                height: state.canvasHeight
            },
            settings: {
                waveform: state.waveform,
                rangeMode: state.rangeMode,
                wingMode: state.wingMode,
                layerInteractionMode: state.layerInteractionMode
            },
            layers: layerSystem.serialize()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'p5_playground_project.json';
        a.click();

        URL.revokeObjectURL(url);
    }

    getResolution() {
        const select = document.getElementById('exportResolution');
        const value = select?.value || '1x';

        switch (value) {
            case '2x':
                return { scale: 2, width: state.canvasWidth * 2, height: state.canvasHeight * 2 };
            case '4x':
                return { scale: 4, width: state.canvasWidth * 4, height: state.canvasHeight * 4 };
            case 'custom':
                const w = parseInt(document.getElementById('exportWidth')?.value) || state.canvasWidth;
                const h = parseInt(document.getElementById('exportHeight')?.value) || state.canvasHeight;
                return { scale: w / state.canvasWidth, width: w, height: h };
            default:
                return { scale: 1, width: state.canvasWidth, height: state.canvasHeight };
        }
    }
}
