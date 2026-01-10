/**
 * VECTOR.LAB — 80s Pattern Generator
 * Creates elegant geometric patterns with range-based parameters
 * and 3D perspective transformations
 */

// =========================================
// State
// =========================================

const state = {
    canvas: null,
    canvasSize: 800,

    // Pattern type
    pattern: 'lines',
    direction: 'vertical', // vertical, horizontal, diagonal

    // Range-based parameters (start → end)
    count: { start: 20, end: 20 },
    weight: { start: 2, end: 2 },
    spacing: { start: 1, end: 1 },
    length: { start: 100, end: 100 },
    opacity: { start: 100, end: 100 },

    // Color gradient
    colorStart: '#ffffff',
    colorEnd: '#ffffff',

    // 3D Transform
    rotX: 0,
    rotY: 0,
    rotZ: 0,

    // Position
    posX: 50,
    posY: 50,
    scale: 100,

    // Background
    bgMode: 'dark',
    bgCustom: '#0a0a0a',

    // Layers
    layers: [],
    activeLayerId: null
};

// =========================================
// Utility Functions
// =========================================

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

function lerpRgb(c1, c2, t) {
    return {
        r: Math.round(c1.r + (c2.r - c1.r) * t),
        g: Math.round(c1.g + (c2.g - c1.g) * t),
        b: Math.round(c1.b + (c2.b - c1.b) * t)
    };
}

function getGradientColor(t, layer) {
    const c1 = hexToRgb(layer.colorStart);
    const c2 = hexToRgb(layer.colorEnd);
    const c = lerpRgb(c1, c2, t);

    // Calculate opacity based on range
    const opacityVal = lerp(layer.opacity.start, layer.opacity.end, t);
    const alpha = opacityVal / 100 * 255;

    return color(c.r, c.g, c.b, alpha);
}

function lerpValue(param, t) {
    return lerp(param.start, param.end, t);
}

// =========================================
// Layer System
// =========================================

function createLayer() {
    const layer = {
        id: Date.now(),
        name: `Layer ${state.layers.length + 1}`,
        visible: true,
        pattern: state.pattern,
        direction: state.direction,
        count: { ...state.count },
        weight: { ...state.weight },
        spacing: { ...state.spacing },
        length: { ...state.length },
        opacity: { ...state.opacity },
        colorStart: state.colorStart,
        colorEnd: state.colorEnd,
        rotX: state.rotX,
        rotY: state.rotY,
        rotZ: state.rotZ,
        posX: state.posX,
        posY: state.posY,
        scale: state.scale
    };

    state.layers.push(layer);
    state.activeLayerId = layer.id;
    updateLayersUI();
    return layer;
}

function deleteLayer(id) {
    const index = state.layers.findIndex(l => l.id === id);
    if (index !== -1 && state.layers.length > 1) {
        state.layers.splice(index, 1);
        if (state.activeLayerId === id) {
            state.activeLayerId = state.layers[state.layers.length - 1].id;
            loadLayerToUI(getActiveLayer());
        }
        updateLayersUI();
    }
}

function getActiveLayer() {
    return state.layers.find(l => l.id === state.activeLayerId);
}

function selectLayer(id) {
    state.activeLayerId = id;
    loadLayerToUI(getActiveLayer());
    updateLayersUI();
}

function loadLayerToUI(layer) {
    if (!layer) return;

    state.pattern = layer.pattern;
    state.direction = layer.direction;
    state.count = { ...layer.count };
    state.weight = { ...layer.weight };
    state.spacing = { ...layer.spacing };
    state.length = { ...layer.length };
    state.opacity = { ...layer.opacity };
    state.colorStart = layer.colorStart;
    state.colorEnd = layer.colorEnd;
    state.rotX = layer.rotX;
    state.rotY = layer.rotY;
    state.rotZ = layer.rotZ;
    state.posX = layer.posX;
    state.posY = layer.posY;
    state.scale = layer.scale;

    syncUIWithState();
}

function saveActiveLayerState() {
    const layer = getActiveLayer();
    if (!layer) return;

    layer.pattern = state.pattern;
    layer.direction = state.direction;
    layer.count = { ...state.count };
    layer.weight = { ...state.weight };
    layer.spacing = { ...state.spacing };
    layer.length = { ...state.length };
    layer.opacity = { ...state.opacity };
    layer.colorStart = state.colorStart;
    layer.colorEnd = state.colorEnd;
    layer.rotX = state.rotX;
    layer.rotY = state.rotY;
    layer.rotZ = state.rotZ;
    layer.posX = state.posX;
    layer.posY = state.posY;
    layer.scale = state.scale;

    updateLayersUI();
}

function updateLayersUI() {
    const list = document.getElementById('layersList');
    if (!list) return;

    list.innerHTML = '';

    [...state.layers].reverse().forEach(layer => {
        const item = document.createElement('div');
        item.className = `layer-item${layer.id === state.activeLayerId ? ' active' : ''}`;
        item.innerHTML = `
            <div class="layer-visibility ${layer.visible ? 'visible' : ''}" data-id="${layer.id}">
                ${layer.visible ? '◉' : '○'}
            </div>
            <div class="layer-info">
                <div class="layer-name">${layer.name}</div>
                <div class="layer-pattern">${layer.pattern}</div>
            </div>
            <button class="layer-delete" data-id="${layer.id}">×</button>
        `;

        item.addEventListener('click', (e) => {
            if (!e.target.closest('.layer-visibility') && !e.target.closest('.layer-delete')) {
                selectLayer(layer.id);
            }
        });

        item.querySelector('.layer-visibility').addEventListener('click', (e) => {
            e.stopPropagation();
            layer.visible = !layer.visible;
            updateLayersUI();
        });

        item.querySelector('.layer-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteLayer(layer.id);
        });

        list.appendChild(item);
    });
}

// =========================================
// Pattern Renderers
// =========================================

function drawLines(layer) {
    const size = state.canvasSize;
    const countStart = Math.round(layer.count.start);
    const countEnd = Math.round(layer.count.end);
    const count = Math.round((countStart + countEnd) / 2);

    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;

        // Calculate position with spacing gradient
        const spacingMult = lerpValue(layer.spacing, t);
        let pos;
        if (layer.spacing.start === layer.spacing.end) {
            pos = (i + 0.5) / count * size;
        } else {
            // Progressive spacing
            let accumulated = 0;
            for (let j = 0; j <= i; j++) {
                const jt = count > 1 ? j / (count - 1) : 0.5;
                accumulated += lerpValue(layer.spacing, jt);
            }
            const total = (() => {
                let sum = 0;
                for (let j = 0; j < count; j++) {
                    const jt = count > 1 ? j / (count - 1) : 0.5;
                    sum += lerpValue(layer.spacing, jt);
                }
                return sum;
            })();
            pos = (accumulated / total) * size;
        }

        // Weight
        const weight = lerpValue(layer.weight, t);

        // Length
        const lengthPct = lerpValue(layer.length, t) / 100;
        const halfGap = (1 - lengthPct) / 2 * size;

        // Color with opacity
        const col = getGradientColor(t, layer);

        strokeWeight(max(0.5, weight));
        stroke(col);

        if (layer.direction === 'vertical') {
            line(pos, halfGap, pos, size - halfGap);
        } else if (layer.direction === 'horizontal') {
            line(halfGap, pos, size - halfGap, pos);
        } else {
            // Diagonal
            const offset = (i - count / 2) * (size / count) * 1.5;
            line(offset, 0, offset + size, size);
        }
    }
}

function drawRadial(layer) {
    const size = state.canvasSize;
    const cx = size / 2;
    const cy = size / 2;
    const count = Math.round((layer.count.start + layer.count.end) / 2);
    const radius = size * 0.7;

    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / count : 0;
        const angle = t * TWO_PI;

        const weight = lerpValue(layer.weight, t);
        const lengthPct = lerpValue(layer.length, t) / 100;
        const col = getGradientColor(t, layer);

        strokeWeight(max(0.5, weight));
        stroke(col);

        const innerR = radius * (1 - lengthPct);
        const x1 = cx + cos(angle) * innerR;
        const y1 = cy + sin(angle) * innerR;
        const x2 = cx + cos(angle) * radius;
        const y2 = cy + sin(angle) * radius;

        line(x1, y1, x2, y2);
    }
}

function drawCircles(layer) {
    const size = state.canvasSize;
    const cx = size / 2;
    const cy = size / 2;
    const count = Math.round((layer.count.start + layer.count.end) / 2);
    const maxRadius = size * 0.45;

    noFill();

    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;

        // Progressive spacing for circles
        const spacingMult = lerpValue(layer.spacing, t);
        let r;
        if (layer.spacing.start === layer.spacing.end) {
            r = (t * 0.9 + 0.1) * maxRadius;
        } else {
            // Accumulated spacing
            let accumulated = 0;
            for (let j = 0; j <= i; j++) {
                const jt = count > 1 ? j / (count - 1) : 0.5;
                accumulated += lerpValue(layer.spacing, jt);
            }
            const total = (() => {
                let sum = 0;
                for (let j = 0; j < count; j++) {
                    const jt = count > 1 ? j / (count - 1) : 0.5;
                    sum += lerpValue(layer.spacing, jt);
                }
                return sum;
            })();
            r = (accumulated / total) * maxRadius;
        }

        const weight = lerpValue(layer.weight, t);
        const col = getGradientColor(t, layer);

        strokeWeight(max(0.5, weight));
        stroke(col);
        circle(cx, cy, r * 2);
    }
}

function drawGrid(layer) {
    const size = state.canvasSize;
    const cols = Math.round(sqrt((layer.count.start + layer.count.end) / 2));
    const rows = cols;
    const cellW = size / cols;
    const cellH = size / rows;

    noFill();

    // Draw cells with varying parameters
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const t = (row * cols + col) / (rows * cols - 1);

            const weight = lerpValue(layer.weight, t);
            const opacityVal = lerpValue(layer.opacity, t);
            const col_ = getGradientColor(t, layer);

            strokeWeight(max(0.5, weight));
            stroke(col_);

            const x = col * cellW;
            const y = row * cellH;

            // Size variation based on length
            const sizeMult = lerpValue(layer.length, t) / 100;
            const w = cellW * sizeMult;
            const h = cellH * sizeMult;
            const offsetX = (cellW - w) / 2;
            const offsetY = (cellH - h) / 2;

            rect(x + offsetX, y + offsetY, w, h);
        }
    }
}

function drawDots(layer) {
    const size = state.canvasSize;
    const cols = Math.round(sqrt((layer.count.start + layer.count.end) / 2));
    const rows = cols;
    const cellW = size / cols;
    const cellH = size / rows;

    noStroke();

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const t = (row * cols + col) / (rows * cols - 1);

            const dotSize = lerpValue(layer.weight, t) * 2;
            const col_ = getGradientColor(t, layer);

            fill(col_);

            const x = col * cellW + cellW / 2;
            const y = row * cellH + cellH / 2;

            circle(x, y, dotSize);
        }
    }
}

function drawTriangleFill(layer) {
    const size = state.canvasSize;
    const count = Math.round((layer.count.start + layer.count.end) / 2);

    // Triangle vertices
    const topX = size / 2;
    const topY = size * 0.1;
    const leftX = size * 0.1;
    const leftY = size * 0.9;
    const rightX = size * 0.9;
    const rightY = size * 0.9;

    // Fill with horizontal lines clipped to triangle
    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;
        const y = lerp(topY, leftY, t);

        // Calculate x bounds at this y level
        const progress = (y - topY) / (leftY - topY);
        const xLeft = lerp(topX, leftX, progress);
        const xRight = lerp(topX, rightX, progress);

        const weight = lerpValue(layer.weight, t);
        const col = getGradientColor(t, layer);

        strokeWeight(max(0.5, weight));
        stroke(col);

        line(xLeft, y, xRight, y);
    }
}

function renderLayer(layer) {
    push();

    const size = state.canvasSize;
    const cx = size / 2;
    const cy = size / 2;

    // Apply 3D perspective using 2D transformations
    translate(cx, cy);

    // Apply rotations
    // Z rotation is flat 2D rotation
    rotate(radians(layer.rotZ));

    // X rotation simulates tilt (perspective on vertical axis)
    const scaleY = cos(radians(layer.rotX));
    scale(1, scaleY);

    // Y rotation simulates perspective on horizontal axis
    const shearX = tan(radians(layer.rotY * 0.5));
    applyMatrix(1, 0, shearX, 1, 0, 0);

    // Position offset
    const offsetX = (layer.posX - 50) * size / 100;
    const offsetY = (layer.posY - 50) * size / 100;
    translate(offsetX, offsetY);

    // Scale
    scale(layer.scale / 100);

    translate(-cx, -cy);

    // Draw pattern
    switch (layer.pattern) {
        case 'lines': drawLines(layer); break;
        case 'radial': drawRadial(layer); break;
        case 'circles': drawCircles(layer); break;
        case 'grid': drawGrid(layer); break;
        case 'dots': drawDots(layer); break;
        case 'triangleFill': drawTriangleFill(layer); break;
    }

    pop();
}

// =========================================
// p5.js Setup & Draw
// =========================================

function setup() {
    const container = document.getElementById('canvas');
    const wrapper = document.getElementById('canvasWrapper');

    // Calculate optimal canvas size
    const maxSize = min(wrapper.clientWidth - 60, wrapper.clientHeight - 60);
    state.canvasSize = min(800, max(400, floor(maxSize / 50) * 50));

    state.canvas = createCanvas(state.canvasSize, state.canvasSize);
    state.canvas.parent('canvas');

    pixelDensity(2);
    frameRate(60);

    // Update dimensions display
    document.getElementById('coords').textContent = `${state.canvasSize} × ${state.canvasSize}`;

    // Create initial layer
    createLayer();

    // Setup UI
    initUI();

    console.log('VECTOR.LAB initialized');
}

function draw() {
    // Background
    switch (state.bgMode) {
        case 'dark': background(0); break;
        case 'light': background(255); break;
        case 'cream': background(245, 240, 232); break;
        case 'custom':
            const c = hexToRgb(state.bgCustom);
            background(c.r, c.g, c.b);
            break;
    }

    // Render all visible layers
    state.layers.forEach(layer => {
        if (layer.visible) {
            renderLayer(layer);
        }
    });
}

function windowResized() {
    const wrapper = document.getElementById('canvasWrapper');
    const maxSize = min(wrapper.clientWidth - 60, wrapper.clientHeight - 60);
    state.canvasSize = min(800, max(400, floor(maxSize / 50) * 50));
    resizeCanvas(state.canvasSize, state.canvasSize);
    document.getElementById('coords').textContent = `${state.canvasSize} × ${state.canvasSize}`;
}

// =========================================
// UI Initialization
// =========================================

function initUI() {
    // Pattern presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.pattern = btn.dataset.pattern;
            saveActiveLayerState();

            // Show/hide direction selector
            const dirSelector = document.getElementById('directionSelector');
            if (dirSelector) {
                dirSelector.style.display = state.pattern === 'lines' ? 'flex' : 'none';
            }
        });
    });

    // Direction selector
    document.querySelectorAll('.dir-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.direction = btn.dataset.dir;
            saveActiveLayerState();
        });
    });

    // Dual range sliders
    setupDualSlider('count', 'countStart', 'countEnd', v => Math.round(v));
    setupDualSlider('weight', 'weightStart', 'weightEnd', v => v.toFixed(1));
    setupDualSlider('spacing', 'spacingStart', 'spacingEnd', v => v.toFixed(1));
    setupDualSlider('length', 'lengthStart', 'lengthEnd', v => `${Math.round(v)}%`);
    setupDualSlider('opacity', 'opacityStart', 'opacityEnd', v => `${Math.round(v)}%`);

    // Color controls
    const colorStart = document.getElementById('colorStart');
    const colorEnd = document.getElementById('colorEnd');
    const gradientPreview = document.getElementById('gradientPreview');

    function updateGradientPreview() {
        gradientPreview.style.background = `linear-gradient(90deg, ${state.colorStart}, ${state.colorEnd})`;
    }

    colorStart.addEventListener('input', () => {
        state.colorStart = colorStart.value;
        updateGradientPreview();
        saveActiveLayerState();
    });

    colorEnd.addEventListener('input', () => {
        state.colorEnd = colorEnd.value;
        updateGradientPreview();
        saveActiveLayerState();
    });

    updateGradientPreview();

    // Color presets
    document.querySelectorAll('.color-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            state.colorStart = btn.dataset.start;
            state.colorEnd = btn.dataset.end;
            colorStart.value = state.colorStart;
            colorEnd.value = state.colorEnd;
            updateGradientPreview();
            saveActiveLayerState();
        });
    });

    // Single sliders (3D rotation, position)
    setupSlider('rotX', 'rotXValue', v => state.rotX = parseFloat(v), v => `${v}°`);
    setupSlider('rotY', 'rotYValue', v => state.rotY = parseFloat(v), v => `${v}°`);
    setupSlider('rotZ', 'rotZValue', v => state.rotZ = parseFloat(v), v => `${v}°`);
    setupSlider('posX', 'posXValue', v => state.posX = parseFloat(v), v => `${v}%`);
    setupSlider('posY', 'posYValue', v => state.posY = parseFloat(v), v => `${v}%`);
    setupSlider('scale', 'scaleValue', v => state.scale = parseFloat(v), v => `${v}%`);

    // Background
    document.querySelectorAll('.bg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.bgMode = btn.dataset.bg;
        });
    });

    document.getElementById('bgCustomColor').addEventListener('input', (e) => {
        state.bgCustom = e.target.value;
        document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-bg="custom"]').classList.add('active');
        state.bgMode = 'custom';
    });

    // Add layer
    document.getElementById('addLayerBtn').addEventListener('click', () => {
        createLayer();
    });

    // Reset
    document.getElementById('resetBtn').addEventListener('click', resetToDefaults);

    // Random
    document.getElementById('randomBtn').addEventListener('click', randomize);

    // Export
    document.getElementById('exportPng').addEventListener('click', () => {
        saveCanvas('vector-lab', 'png');
    });

    document.getElementById('exportSvg').addEventListener('click', () => {
        alert('SVG export coming soon!');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.matches('input')) return;
        if (e.code === 'Space') {
            e.preventDefault();
            randomize();
        }
        if (e.code === 'KeyR') {
            resetToDefaults();
        }
    });
}

function setupDualSlider(param, startId, endId, formatter) {
    const container = document.querySelector(`[data-param="${param}"]`);
    if (!container) return;

    const startSlider = container.querySelector('.slider-start');
    const endSlider = container.querySelector('.slider-end');
    const rangeEl = container.querySelector('.slider-range');
    const startDisplay = document.getElementById(startId);
    const endDisplay = document.getElementById(endId);

    function updateRange() {
        const min = parseFloat(startSlider.min);
        const max = parseFloat(startSlider.max);
        const startVal = parseFloat(startSlider.value);
        const endVal = parseFloat(endSlider.value);

        const startPct = ((startVal - min) / (max - min)) * 100;
        const endPct = ((endVal - min) / (max - min)) * 100;

        rangeEl.style.left = `${Math.min(startPct, endPct)}%`;
        rangeEl.style.right = `${100 - Math.max(startPct, endPct)}%`;

        startDisplay.textContent = formatter(startVal);
        endDisplay.textContent = formatter(endVal);

        state[param].start = startVal;
        state[param].end = endVal;

        saveActiveLayerState();
    }

    startSlider.addEventListener('input', updateRange);
    endSlider.addEventListener('input', updateRange);

    updateRange();
}

function setupSlider(id, valueId, onChange, formatter = v => v) {
    const slider = document.getElementById(id);
    const valueEl = document.getElementById(valueId);

    if (!slider || !valueEl) return;

    slider.addEventListener('input', () => {
        const v = slider.value;
        valueEl.textContent = formatter(v);
        onChange(v);
        saveActiveLayerState();
    });
}

function syncUIWithState() {
    // Pattern
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.pattern === state.pattern);
    });

    // Direction
    document.querySelectorAll('.dir-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.dir === state.direction);
    });

    const dirSelector = document.getElementById('directionSelector');
    if (dirSelector) {
        dirSelector.style.display = state.pattern === 'lines' ? 'flex' : 'none';
    }

    // Dual sliders
    syncDualSlider('count', state.count, v => Math.round(v));
    syncDualSlider('weight', state.weight, v => v.toFixed(1));
    syncDualSlider('spacing', state.spacing, v => v.toFixed(1));
    syncDualSlider('length', state.length, v => `${Math.round(v)}%`);
    syncDualSlider('opacity', state.opacity, v => `${Math.round(v)}%`);

    // Colors
    document.getElementById('colorStart').value = state.colorStart;
    document.getElementById('colorEnd').value = state.colorEnd;
    document.getElementById('gradientPreview').style.background =
        `linear-gradient(90deg, ${state.colorStart}, ${state.colorEnd})`;

    // Single sliders
    syncSlider('rotX', state.rotX, v => `${v}°`);
    syncSlider('rotY', state.rotY, v => `${v}°`);
    syncSlider('rotZ', state.rotZ, v => `${v}°`);
    syncSlider('posX', state.posX, v => `${v}%`);
    syncSlider('posY', state.posY, v => `${v}%`);
    syncSlider('scale', state.scale, v => `${v}%`);
}

function syncDualSlider(param, values, formatter) {
    const container = document.querySelector(`[data-param="${param}"]`);
    if (!container) return;

    const startSlider = container.querySelector('.slider-start');
    const endSlider = container.querySelector('.slider-end');
    const rangeEl = container.querySelector('.slider-range');
    const startDisplay = document.getElementById(`${param}Start`);
    const endDisplay = document.getElementById(`${param}End`);

    startSlider.value = values.start;
    endSlider.value = values.end;
    startDisplay.textContent = formatter(values.start);
    endDisplay.textContent = formatter(values.end);

    const min = parseFloat(startSlider.min);
    const max = parseFloat(startSlider.max);
    const startPct = ((values.start - min) / (max - min)) * 100;
    const endPct = ((values.end - min) / (max - min)) * 100;

    rangeEl.style.left = `${Math.min(startPct, endPct)}%`;
    rangeEl.style.right = `${100 - Math.max(startPct, endPct)}%`;
}

function syncSlider(id, value, formatter = v => v) {
    const slider = document.getElementById(id);
    const valueEl = document.getElementById(id + 'Value');
    if (slider) slider.value = value;
    if (valueEl) valueEl.textContent = formatter(value);
}

function resetToDefaults() {
    state.count = { start: 20, end: 20 };
    state.weight = { start: 2, end: 2 };
    state.spacing = { start: 1, end: 1 };
    state.length = { start: 100, end: 100 };
    state.opacity = { start: 100, end: 100 };
    state.colorStart = '#ffffff';
    state.colorEnd = '#ffffff';
    state.rotX = 0;
    state.rotY = 0;
    state.rotZ = 0;
    state.posX = 50;
    state.posY = 50;
    state.scale = 100;

    syncUIWithState();
    saveActiveLayerState();
}

function randomize() {
    // Random pattern
    const patterns = ['lines', 'radial', 'circles', 'grid', 'dots', 'triangleFill'];
    state.pattern = patterns[floor(random(patterns.length))];

    // Random direction for lines
    const dirs = ['vertical', 'horizontal', 'diagonal'];
    state.direction = dirs[floor(random(dirs.length))];

    // Random ranges
    state.count.start = floor(random(5, 100));
    state.count.end = floor(random(5, 100));

    state.weight.start = random(0.5, 15);
    state.weight.end = random(0.5, 15);

    state.spacing.start = random(0.3, 3);
    state.spacing.end = random(0.3, 3);

    state.length.start = random(30, 100);
    state.length.end = random(30, 100);

    state.opacity.start = random(50, 100);
    state.opacity.end = random(50, 100);

    // Random colors
    const palettes = [
        ['#ffffff', '#ffffff'],
        ['#ff6b35', '#ff3366'],
        ['#ff3366', '#00d4ff'],
        ['#ffffff', '#000000'],
        ['#ffcc00', '#ff6b35'],
        ['#00d4ff', '#ffffff'],
    ];
    const palette = palettes[floor(random(palettes.length))];
    state.colorStart = palette[0];
    state.colorEnd = palette[1];

    // Random rotation (subtle or dramatic)
    if (random() > 0.5) {
        state.rotX = floor(random(-45, 45));
        state.rotY = floor(random(-45, 45));
    } else {
        state.rotX = 0;
        state.rotY = 0;
    }
    state.rotZ = floor(random(-180, 180));

    syncUIWithState();
    saveActiveLayerState();
}
