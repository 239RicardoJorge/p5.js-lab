/**
 * VECTOR.LAB — 80s Pattern Generator
 * Full-featured pattern generator with range controls,
 * rates/animation, and comprehensive export options
 */

// =========================================
// Default Values (for reset)
// =========================================

const DEFAULTS = {
    count: 20,
    countRate: 0,
    weight: { start: 2, end: 2 },
    weightRate: 0,
    spacing: { start: 1, end: 1 },
    spacingRate: 0,
    length: { start: 100, end: 100 },
    lengthRate: 0,
    opacity: { start: 100, end: 100 },
    opacityRate: 0,
    colorMode: 'solid',
    colorSolid: '#ffffff',
    colorStart: '#ffffff',
    colorEnd: '#ffffff',
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    posX: 50,
    posY: 50,
    scale: 100,
    bgMode: 'solid',
    bgSolid: '#000000',
    bgStart: '#000000',
    bgEnd: '#1a1a2e',
    bgGradientDir: 'vertical'
};

// =========================================
// State
// =========================================

const state = {
    canvas: null,
    canvasSize: 800,
    time: 0,

    // Pattern
    pattern: 'lines',
    direction: 'vertical',

    // Attributes (with rates)
    count: DEFAULTS.count,
    countRate: DEFAULTS.countRate,

    weight: { ...DEFAULTS.weight },
    weightRate: DEFAULTS.weightRate,

    spacing: { ...DEFAULTS.spacing },
    spacingRate: DEFAULTS.spacingRate,

    length: { ...DEFAULTS.length },
    lengthRate: DEFAULTS.lengthRate,

    opacity: { ...DEFAULTS.opacity },
    opacityRate: DEFAULTS.opacityRate,

    // Color
    colorMode: DEFAULTS.colorMode,
    colorSolid: DEFAULTS.colorSolid,
    colorStart: DEFAULTS.colorStart,
    colorEnd: DEFAULTS.colorEnd,

    // Transform
    rotX: DEFAULTS.rotX,
    rotY: DEFAULTS.rotY,
    rotZ: DEFAULTS.rotZ,
    posX: DEFAULTS.posX,
    posY: DEFAULTS.posY,
    scale: DEFAULTS.scale,

    // Background
    bgMode: DEFAULTS.bgMode,
    bgSolid: DEFAULTS.bgSolid,
    bgStart: DEFAULTS.bgStart,
    bgEnd: DEFAULTS.bgEnd,
    bgGradientDir: DEFAULTS.bgGradientDir,

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

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function lerpColor3(c1, c2, t) {
    return {
        r: Math.round(c1.r + (c2.r - c1.r) * t),
        g: Math.round(c1.g + (c2.g - c1.g) * t),
        b: Math.round(c1.b + (c2.b - c1.b) * t)
    };
}

function getAnimatedValue(baseValue, rate) {
    if (rate === 0) return baseValue;
    return baseValue + Math.sin(state.time * rate) * baseValue * 0.3;
}

function getAnimatedRange(range, rate) {
    if (rate === 0) return range;
    const offset = Math.sin(state.time * rate) * 0.3;
    return {
        start: range.start * (1 + offset),
        end: range.end * (1 - offset)
    };
}

function lerpValue(range, t) {
    return lerp(range.start, range.end, t);
}

function getColor(t, layer) {
    let c1, c2;

    if (layer.colorMode === 'solid') {
        c1 = hexToRgb(layer.colorSolid);
        c2 = c1;
    } else {
        c1 = hexToRgb(layer.colorStart);
        c2 = hexToRgb(layer.colorEnd);
    }

    const c = lerpColor3(c1, c2, t);
    const opacityRange = getAnimatedRange(layer.opacity, layer.opacityRate);
    const alpha = lerpValue(opacityRange, t) / 100 * 255;

    return color(c.r, c.g, c.b, alpha);
}

// =========================================
// Layer System
// =========================================

function createLayerFromState() {
    return {
        id: Date.now(),
        name: `Layer ${state.layers.length + 1}`,
        visible: true,
        pattern: state.pattern,
        direction: state.direction,
        count: state.count,
        countRate: state.countRate,
        weight: { ...state.weight },
        weightRate: state.weightRate,
        spacing: { ...state.spacing },
        spacingRate: state.spacingRate,
        length: { ...state.length },
        lengthRate: state.lengthRate,
        opacity: { ...state.opacity },
        opacityRate: state.opacityRate,
        colorMode: state.colorMode,
        colorSolid: state.colorSolid,
        colorStart: state.colorStart,
        colorEnd: state.colorEnd,
        rotX: state.rotX,
        rotY: state.rotY,
        rotZ: state.rotZ,
        posX: state.posX,
        posY: state.posY,
        scale: state.scale
    };
}

function createLayer() {
    const layer = createLayerFromState();
    state.layers.push(layer);
    state.activeLayerId = layer.id;
    updateLayersUI();
    return layer;
}

function deleteLayer(id) {
    if (state.layers.length <= 1) return;
    const index = state.layers.findIndex(l => l.id === id);
    if (index !== -1) {
        state.layers.splice(index, 1);
        if (state.activeLayerId === id) {
            state.activeLayerId = state.layers[state.layers.length - 1].id;
            loadLayerToState(getActiveLayer());
        }
        updateLayersUI();
    }
}

function getActiveLayer() {
    return state.layers.find(l => l.id === state.activeLayerId);
}

function selectLayer(id) {
    state.activeLayerId = id;
    loadLayerToState(getActiveLayer());
    updateLayersUI();
}

function loadLayerToState(layer) {
    if (!layer) return;

    state.pattern = layer.pattern;
    state.direction = layer.direction;
    state.count = layer.count;
    state.countRate = layer.countRate;
    state.weight = { ...layer.weight };
    state.weightRate = layer.weightRate;
    state.spacing = { ...layer.spacing };
    state.spacingRate = layer.spacingRate;
    state.length = { ...layer.length };
    state.lengthRate = layer.lengthRate;
    state.opacity = { ...layer.opacity };
    state.opacityRate = layer.opacityRate;
    state.colorMode = layer.colorMode;
    state.colorSolid = layer.colorSolid;
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

function saveStateToActiveLayer() {
    const layer = getActiveLayer();
    if (!layer) return;

    layer.pattern = state.pattern;
    layer.direction = state.direction;
    layer.count = state.count;
    layer.countRate = state.countRate;
    layer.weight = { ...state.weight };
    layer.weightRate = state.weightRate;
    layer.spacing = { ...state.spacing };
    layer.spacingRate = state.spacingRate;
    layer.length = { ...state.length };
    layer.lengthRate = state.lengthRate;
    layer.opacity = { ...state.opacity };
    layer.opacityRate = state.opacityRate;
    layer.colorMode = state.colorMode;
    layer.colorSolid = state.colorSolid;
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
    const count = Math.round(getAnimatedValue(layer.count, layer.countRate));
    const weightRange = getAnimatedRange(layer.weight, layer.weightRate);
    const spacingRange = getAnimatedRange(layer.spacing, layer.spacingRate);
    const lengthRange = getAnimatedRange(layer.length, layer.lengthRate);

    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;

        // Position with spacing
        let pos;
        if (spacingRange.start === spacingRange.end) {
            pos = (i + 0.5) / count * size;
        } else {
            let accumulated = 0;
            for (let j = 0; j <= i; j++) {
                const jt = count > 1 ? j / (count - 1) : 0.5;
                accumulated += lerpValue(spacingRange, jt);
            }
            let total = 0;
            for (let j = 0; j < count; j++) {
                const jt = count > 1 ? j / (count - 1) : 0.5;
                total += lerpValue(spacingRange, jt);
            }
            pos = (accumulated / total) * size;
        }

        const weight = lerpValue(weightRange, t);
        const lengthPct = lerpValue(lengthRange, t) / 100;
        const halfGap = (1 - lengthPct) / 2 * size;
        const col = getColor(t, layer);

        strokeWeight(max(0.5, weight));
        stroke(col);

        if (layer.direction === 'vertical') {
            line(pos, halfGap, pos, size - halfGap);
        } else if (layer.direction === 'horizontal') {
            line(halfGap, pos, size - halfGap, pos);
        } else {
            const offset = (i - count / 2) * (size / count) * 1.5;
            line(offset, 0, offset + size, size);
        }
    }
}

function drawRadial(layer) {
    const size = state.canvasSize;
    const cx = size / 2;
    const cy = size / 2;
    const count = Math.round(getAnimatedValue(layer.count, layer.countRate));
    const weightRange = getAnimatedRange(layer.weight, layer.weightRate);
    const lengthRange = getAnimatedRange(layer.length, layer.lengthRate);
    const radius = size * 0.7;

    for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * TWO_PI;

        const weight = lerpValue(weightRange, t);
        const lengthPct = lerpValue(lengthRange, t) / 100;
        const col = getColor(t, layer);

        strokeWeight(max(0.5, weight));
        stroke(col);

        const innerR = radius * (1 - lengthPct);
        line(
            cx + cos(angle) * innerR,
            cy + sin(angle) * innerR,
            cx + cos(angle) * radius,
            cy + sin(angle) * radius
        );
    }
}

function drawCircles(layer) {
    const size = state.canvasSize;
    const cx = size / 2;
    const cy = size / 2;
    const count = Math.round(getAnimatedValue(layer.count, layer.countRate));
    const weightRange = getAnimatedRange(layer.weight, layer.weightRate);
    const spacingRange = getAnimatedRange(layer.spacing, layer.spacingRate);
    const maxRadius = size * 0.45;

    noFill();

    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;

        let r;
        if (spacingRange.start === spacingRange.end) {
            r = (t * 0.9 + 0.1) * maxRadius;
        } else {
            let accumulated = 0;
            for (let j = 0; j <= i; j++) {
                const jt = count > 1 ? j / (count - 1) : 0.5;
                accumulated += lerpValue(spacingRange, jt);
            }
            let total = 0;
            for (let j = 0; j < count; j++) {
                const jt = count > 1 ? j / (count - 1) : 0.5;
                total += lerpValue(spacingRange, jt);
            }
            r = (accumulated / total) * maxRadius;
        }

        const weight = lerpValue(weightRange, t);
        const col = getColor(t, layer);

        strokeWeight(max(0.5, weight));
        stroke(col);
        circle(cx, cy, r * 2);
    }
}

function drawGrid(layer) {
    const size = state.canvasSize;
    const gridSize = Math.round(sqrt(getAnimatedValue(layer.count, layer.countRate)));
    const weightRange = getAnimatedRange(layer.weight, layer.weightRate);
    const lengthRange = getAnimatedRange(layer.length, layer.lengthRate);
    const cellW = size / gridSize;

    noFill();

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const t = (row * gridSize + col) / (gridSize * gridSize - 1);
            const weight = lerpValue(weightRange, t);
            const sizeMult = lerpValue(lengthRange, t) / 100;
            const col_ = getColor(t, layer);

            strokeWeight(max(0.5, weight));
            stroke(col_);

            const x = col * cellW;
            const y = row * cellW;
            const w = cellW * sizeMult;
            const offset = (cellW - w) / 2;

            rect(x + offset, y + offset, w, w);
        }
    }
}

function drawDots(layer) {
    const size = state.canvasSize;
    const gridSize = Math.round(sqrt(getAnimatedValue(layer.count, layer.countRate)));
    const weightRange = getAnimatedRange(layer.weight, layer.weightRate);
    const cellW = size / gridSize;

    noStroke();

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const t = (row * gridSize + col) / (gridSize * gridSize - 1);
            const dotSize = lerpValue(weightRange, t) * 2;
            const col_ = getColor(t, layer);

            fill(col_);
            circle(col * cellW + cellW / 2, row * cellW + cellW / 2, dotSize);
        }
    }
}

function drawTriangle(layer) {
    const size = state.canvasSize;
    const count = Math.round(getAnimatedValue(layer.count, layer.countRate));
    const weightRange = getAnimatedRange(layer.weight, layer.weightRate);

    const topX = size / 2, topY = size * 0.1;
    const leftX = size * 0.1, leftY = size * 0.9;
    const rightX = size * 0.9, rightY = size * 0.9;

    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;
        const y = lerp(topY, leftY, t);
        const progress = (y - topY) / (leftY - topY);
        const xLeft = lerp(topX, leftX, progress);
        const xRight = lerp(topX, rightX, progress);

        const weight = lerpValue(weightRange, t);
        const col = getColor(t, layer);

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

    translate(cx, cy);
    rotate(radians(layer.rotZ));
    scale(1, cos(radians(layer.rotX)));
    applyMatrix(1, 0, tan(radians(layer.rotY * 0.5)), 1, 0, 0);
    translate((layer.posX - 50) * size / 100, (layer.posY - 50) * size / 100);
    scale(layer.scale / 100);
    translate(-cx, -cy);

    switch (layer.pattern) {
        case 'lines': drawLines(layer); break;
        case 'radial': drawRadial(layer); break;
        case 'circles': drawCircles(layer); break;
        case 'grid': drawGrid(layer); break;
        case 'dots': drawDots(layer); break;
        case 'triangle': drawTriangle(layer); break;
    }

    pop();
}

// =========================================
// Background Rendering
// =========================================

function drawBackground() {
    if (state.bgMode === 'solid') {
        const c = hexToRgb(state.bgSolid);
        background(c.r, c.g, c.b);
    } else {
        const c1 = hexToRgb(state.bgStart);
        const c2 = hexToRgb(state.bgEnd);

        noStroke();
        if (state.bgGradientDir === 'vertical') {
            for (let y = 0; y < state.canvasSize; y++) {
                const t = y / state.canvasSize;
                const c = lerpColor3(c1, c2, t);
                stroke(c.r, c.g, c.b);
                line(0, y, state.canvasSize, y);
            }
        } else if (state.bgGradientDir === 'horizontal') {
            for (let x = 0; x < state.canvasSize; x++) {
                const t = x / state.canvasSize;
                const c = lerpColor3(c1, c2, t);
                stroke(c.r, c.g, c.b);
                line(x, 0, x, state.canvasSize);
            }
        } else {
            // Radial
            const cx = state.canvasSize / 2;
            const cy = state.canvasSize / 2;
            const maxR = state.canvasSize * 0.7;
            for (let r = maxR; r > 0; r -= 2) {
                const t = 1 - r / maxR;
                const c = lerpColor3(c1, c2, t);
                fill(c.r, c.g, c.b);
                noStroke();
                circle(cx, cy, r * 2);
            }
        }
    }
}

// =========================================
// p5.js Setup & Draw
// =========================================

function setup() {
    const wrapper = document.getElementById('canvasWrapper');
    const maxSize = min(wrapper.clientWidth - 48, wrapper.clientHeight - 48);
    state.canvasSize = min(800, max(400, floor(maxSize / 50) * 50));

    state.canvas = createCanvas(state.canvasSize, state.canvasSize);
    state.canvas.parent('canvas');

    pixelDensity(2);
    frameRate(60);

    document.getElementById('coords').textContent = `${state.canvasSize} × ${state.canvasSize}`;

    createLayer();
    initUI();

    console.log('VECTOR.LAB initialized');
}

function draw() {
    state.time += deltaTime * 0.001;

    drawBackground();

    state.layers.forEach(layer => {
        if (layer.visible) renderLayer(layer);
    });
}

function windowResized() {
    const wrapper = document.getElementById('canvasWrapper');
    const maxSize = min(wrapper.clientWidth - 48, wrapper.clientHeight - 48);
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

            const dirSelector = document.getElementById('directionSelector');
            dirSelector.style.display = state.pattern === 'lines' ? 'flex' : 'none';

            saveStateToActiveLayer();
        });
    });

    // Direction
    document.querySelectorAll('#directionSelector .dir-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#directionSelector .dir-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.direction = btn.dataset.dir;
            saveStateToActiveLayer();
        });
    });

    // Count (single value)
    setupSingleControl('count', 'countValue', 'countSlider', val => {
        state.count = parseInt(val);
        saveStateToActiveLayer();
    });

    // Range controls
    setupRangeControl('weight', 'weightStart', 'weightEnd', 'weightSliderStart', 'weightSliderEnd', 'weightRange');
    setupRangeControl('spacing', 'spacingStart', 'spacingEnd', 'spacingSliderStart', 'spacingSliderEnd', 'spacingRange');
    setupRangeControl('length', 'lengthStart', 'lengthEnd', 'lengthSliderStart', 'lengthSliderEnd', 'lengthRange');
    setupRangeControl('opacity', 'opacityStart', 'opacityEnd', 'opacitySliderStart', 'opacitySliderEnd', 'opacityRange');

    // Rate inputs
    ['count', 'weight', 'spacing', 'length', 'opacity'].forEach(param => {
        const input = document.getElementById(`${param}Rate`);
        if (input) {
            input.addEventListener('input', () => {
                state[`${param}Rate`] = parseFloat(input.value) || 0;
                saveStateToActiveLayer();
            });
        }
    });

    // Color mode toggle
    document.getElementById('colorModeSolid').addEventListener('click', () => {
        state.colorMode = 'solid';
        document.getElementById('colorModeSolid').classList.add('active');
        document.getElementById('colorModeFade').classList.remove('active');
        document.getElementById('colorSolidUI').classList.remove('hidden');
        document.getElementById('colorFadeUI').classList.add('hidden');
        saveStateToActiveLayer();
    });

    document.getElementById('colorModeFade').addEventListener('click', () => {
        state.colorMode = 'fade';
        document.getElementById('colorModeFade').classList.add('active');
        document.getElementById('colorModeSolid').classList.remove('active');
        document.getElementById('colorFadeUI').classList.remove('hidden');
        document.getElementById('colorSolidUI').classList.add('hidden');
        updateColorGradientPreview();
        saveStateToActiveLayer();
    });

    // Color inputs
    document.getElementById('colorSolid').addEventListener('input', e => {
        state.colorSolid = e.target.value;
        saveStateToActiveLayer();
    });

    document.getElementById('colorStart').addEventListener('input', e => {
        state.colorStart = e.target.value;
        updateColorGradientPreview();
        saveStateToActiveLayer();
    });

    document.getElementById('colorEnd').addEventListener('input', e => {
        state.colorEnd = e.target.value;
        updateColorGradientPreview();
        saveStateToActiveLayer();
    });

    // Color presets
    document.querySelectorAll('.color-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            state.colorStart = btn.dataset.start;
            state.colorEnd = btn.dataset.end;
            state.colorSolid = btn.dataset.start;
            document.getElementById('colorSolid').value = state.colorSolid;
            document.getElementById('colorStart').value = state.colorStart;
            document.getElementById('colorEnd').value = state.colorEnd;
            updateColorGradientPreview();
            saveStateToActiveLayer();
        });
    });

    // Transform controls
    ['rotX', 'rotY', 'rotZ', 'posX', 'posY', 'scale'].forEach(param => {
        const slider = document.getElementById(param);
        const input = document.getElementById(`${param}Value`);

        if (slider && input) {
            slider.addEventListener('input', () => {
                state[param] = parseFloat(slider.value);
                input.value = slider.value;
                saveStateToActiveLayer();
            });

            input.addEventListener('input', () => {
                state[param] = parseFloat(input.value) || 0;
                slider.value = state[param];
                saveStateToActiveLayer();
            });
        }
    });

    // Background mode toggle
    document.getElementById('bgModeSolid').addEventListener('click', () => {
        state.bgMode = 'solid';
        document.getElementById('bgModeSolid').classList.add('active');
        document.getElementById('bgModeFade').classList.remove('active');
        document.getElementById('bgSolidUI').classList.remove('hidden');
        document.getElementById('bgFadeUI').classList.add('hidden');
    });

    document.getElementById('bgModeFade').addEventListener('click', () => {
        state.bgMode = 'fade';
        document.getElementById('bgModeFade').classList.add('active');
        document.getElementById('bgModeSolid').classList.remove('active');
        document.getElementById('bgFadeUI').classList.remove('hidden');
        document.getElementById('bgSolidUI').classList.add('hidden');
        updateBgGradientPreview();
    });

    // Background solid buttons
    document.querySelectorAll('.bg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.bgSolid = btn.dataset.color;
        });
    });

    document.getElementById('bgSolidColor').addEventListener('input', e => {
        state.bgSolid = e.target.value;
        document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
    });

    // Background gradient
    document.getElementById('bgStart').addEventListener('input', e => {
        state.bgStart = e.target.value;
        updateBgGradientPreview();
    });

    document.getElementById('bgEnd').addEventListener('input', e => {
        state.bgEnd = e.target.value;
        updateBgGradientPreview();
    });

    // Background gradient direction
    document.querySelectorAll('.bg-gradient-dir .dir-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bg-gradient-dir .dir-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.bgGradientDir = btn.dataset.dir;
        });
    });

    // Double-click reset
    document.querySelectorAll('.resetable').forEach(el => {
        el.addEventListener('dblclick', () => {
            const param = el.dataset.reset;
            resetAttribute(param);
        });
    });

    // Add layer
    document.getElementById('addLayerBtn').addEventListener('click', createLayer);

    // Reset all
    document.getElementById('resetBtn').addEventListener('click', resetAll);

    // Random
    document.getElementById('randomBtn').addEventListener('click', randomize);

    // Export PNG
    document.getElementById('exportPng').addEventListener('click', () => {
        saveCanvas('vector-lab-' + Date.now(), 'png');
    });

    // Export SVG (placeholder - would need svg library)
    document.getElementById('exportSvg').addEventListener('click', () => {
        alert('SVG export coming soon! Use PNG for now.');
    });

    // Save JSON
    document.getElementById('saveJson').addEventListener('click', saveProject);

    // Load JSON
    document.getElementById('loadJson').addEventListener('change', loadProject);

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        if (e.target.matches('input')) return;
        if (e.code === 'Space') { e.preventDefault(); randomize(); }
        if (e.code === 'KeyR') resetAll();
    });
}

function setupSingleControl(param, inputId, sliderId, onChange) {
    const input = document.getElementById(inputId);
    const slider = document.getElementById(sliderId);

    input.addEventListener('input', () => {
        slider.value = input.value;
        onChange(input.value);
    });

    slider.addEventListener('input', () => {
        input.value = slider.value;
        onChange(slider.value);
    });
}

function setupRangeControl(param, startInputId, endInputId, startSliderId, endSliderId, rangeId) {
    const startInput = document.getElementById(startInputId);
    const endInput = document.getElementById(endInputId);
    const startSlider = document.getElementById(startSliderId);
    const endSlider = document.getElementById(endSliderId);
    const rangeEl = document.getElementById(rangeId);

    function update() {
        const min = parseFloat(startSlider.min);
        const max = parseFloat(startSlider.max);
        const startVal = parseFloat(startSlider.value);
        const endVal = parseFloat(endSlider.value);

        const startPct = ((startVal - min) / (max - min)) * 100;
        const endPct = ((endVal - min) / (max - min)) * 100;

        rangeEl.style.left = `${Math.min(startPct, endPct)}%`;
        rangeEl.style.right = `${100 - Math.max(startPct, endPct)}%`;

        state[param] = { start: startVal, end: endVal };
        saveStateToActiveLayer();
    }

    startInput.addEventListener('input', () => { startSlider.value = startInput.value; update(); });
    endInput.addEventListener('input', () => { endSlider.value = endInput.value; update(); });
    startSlider.addEventListener('input', () => { startInput.value = startSlider.value; update(); });
    endSlider.addEventListener('input', () => { endInput.value = endSlider.value; update(); });

    update();
}

function updateColorGradientPreview() {
    const preview = document.getElementById('colorGradientPreview');
    preview.style.background = `linear-gradient(90deg, ${state.colorStart}, ${state.colorEnd})`;
}

function updateBgGradientPreview() {
    const preview = document.getElementById('bgGradientPreview');
    preview.style.background = `linear-gradient(90deg, ${state.bgStart}, ${state.bgEnd})`;
}

function syncUIWithState() {
    // Pattern
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.pattern === state.pattern);
    });

    // Direction
    document.querySelectorAll('#directionSelector .dir-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.dir === state.direction);
    });
    document.getElementById('directionSelector').style.display = state.pattern === 'lines' ? 'flex' : 'none';

    // Count
    document.getElementById('countValue').value = state.count;
    document.getElementById('countSlider').value = state.count;
    document.getElementById('countRate').value = state.countRate;

    // Ranges
    syncRange('weight');
    syncRange('spacing');
    syncRange('length');
    syncRange('opacity');

    // Colors
    document.getElementById('colorSolid').value = state.colorSolid;
    document.getElementById('colorStart').value = state.colorStart;
    document.getElementById('colorEnd').value = state.colorEnd;

    if (state.colorMode === 'solid') {
        document.getElementById('colorModeSolid').classList.add('active');
        document.getElementById('colorModeFade').classList.remove('active');
        document.getElementById('colorSolidUI').classList.remove('hidden');
        document.getElementById('colorFadeUI').classList.add('hidden');
    } else {
        document.getElementById('colorModeFade').classList.add('active');
        document.getElementById('colorModeSolid').classList.remove('active');
        document.getElementById('colorFadeUI').classList.remove('hidden');
        document.getElementById('colorSolidUI').classList.add('hidden');
    }
    updateColorGradientPreview();

    // Transform
    ['rotX', 'rotY', 'rotZ', 'posX', 'posY', 'scale'].forEach(param => {
        const slider = document.getElementById(param);
        const input = document.getElementById(`${param}Value`);
        if (slider) slider.value = state[param];
        if (input) input.value = state[param];
    });
}

function syncRange(param) {
    const startInput = document.getElementById(`${param}Start`);
    const endInput = document.getElementById(`${param}End`);
    const startSlider = document.getElementById(`${param}SliderStart`);
    const endSlider = document.getElementById(`${param}SliderEnd`);
    const rangeEl = document.getElementById(`${param}Range`);
    const rateInput = document.getElementById(`${param}Rate`);

    startInput.value = state[param].start;
    endInput.value = state[param].end;
    startSlider.value = state[param].start;
    endSlider.value = state[param].end;
    if (rateInput) rateInput.value = state[`${param}Rate`];

    const min = parseFloat(startSlider.min);
    const max = parseFloat(startSlider.max);
    const startPct = ((state[param].start - min) / (max - min)) * 100;
    const endPct = ((state[param].end - min) / (max - min)) * 100;
    rangeEl.style.left = `${Math.min(startPct, endPct)}%`;
    rangeEl.style.right = `${100 - Math.max(startPct, endPct)}%`;
}

function resetAttribute(param) {
    if (param === 'count') {
        state.count = DEFAULTS.count;
        document.getElementById('countValue').value = state.count;
        document.getElementById('countSlider').value = state.count;
    } else if (param === 'countRate') {
        state.countRate = DEFAULTS.countRate;
        document.getElementById('countRate').value = state.countRate;
    } else if (param === 'color') {
        state.colorSolid = DEFAULTS.colorSolid;
        state.colorStart = DEFAULTS.colorStart;
        state.colorEnd = DEFAULTS.colorEnd;
        document.getElementById('colorSolid').value = state.colorSolid;
        document.getElementById('colorStart').value = state.colorStart;
        document.getElementById('colorEnd').value = state.colorEnd;
        updateColorGradientPreview();
    } else if (param === 'bg') {
        state.bgSolid = DEFAULTS.bgSolid;
        state.bgStart = DEFAULTS.bgStart;
        state.bgEnd = DEFAULTS.bgEnd;
        document.getElementById('bgSolidColor').value = state.bgSolid;
        document.getElementById('bgStart').value = state.bgStart;
        document.getElementById('bgEnd').value = state.bgEnd;
        updateBgGradientPreview();
    } else if (['rotX', 'rotY', 'rotZ', 'posX', 'posY', 'scale'].includes(param)) {
        state[param] = DEFAULTS[param];
        document.getElementById(param).value = state[param];
        document.getElementById(`${param}Value`).value = state[param];
    } else if (['weight', 'spacing', 'length', 'opacity'].includes(param)) {
        state[param] = { ...DEFAULTS[param] };
        syncRange(param);
    } else if (param.endsWith('Rate')) {
        const base = param.replace('Rate', '');
        state[param] = DEFAULTS[param];
        document.getElementById(param).value = state[param];
    }

    saveStateToActiveLayer();
}

function resetAll() {
    Object.keys(DEFAULTS).forEach(key => {
        if (typeof DEFAULTS[key] === 'object') {
            state[key] = { ...DEFAULTS[key] };
        } else {
            state[key] = DEFAULTS[key];
        }
    });
    syncUIWithState();
    saveStateToActiveLayer();
}

function randomize() {
    const patterns = ['lines', 'radial', 'circles', 'grid', 'dots', 'triangle'];
    state.pattern = patterns[floor(random(patterns.length))];
    state.direction = ['vertical', 'horizontal', 'diagonal'][floor(random(3))];

    state.count = floor(random(10, 80));
    state.weight = { start: random(0.5, 15), end: random(0.5, 15) };
    state.spacing = { start: random(0.3, 2), end: random(0.3, 2) };
    state.length = { start: random(50, 100), end: random(50, 100) };
    state.opacity = { start: random(60, 100), end: random(60, 100) };

    const palettes = [
        ['#ffffff', '#ffffff'],
        ['#ff6b35', '#ff3366'],
        ['#ff3366', '#00d4ff'],
        ['#00d4ff', '#ffffff'],
        ['#ffcc00', '#ff6b35']
    ];
    const palette = palettes[floor(random(palettes.length))];
    state.colorStart = palette[0];
    state.colorEnd = palette[1];
    state.colorSolid = palette[0];
    state.colorMode = random() > 0.5 ? 'solid' : 'fade';

    if (random() > 0.6) {
        state.rotX = floor(random(-45, 45));
        state.rotY = floor(random(-45, 45));
    } else {
        state.rotX = 0;
        state.rotY = 0;
    }
    state.rotZ = floor(random(-90, 90));

    syncUIWithState();
    saveStateToActiveLayer();
}

// =========================================
// Save/Load Project
// =========================================

function saveProject() {
    const project = {
        version: '1.0',
        timestamp: Date.now(),
        global: {
            bgMode: state.bgMode,
            bgSolid: state.bgSolid,
            bgStart: state.bgStart,
            bgEnd: state.bgEnd,
            bgGradientDir: state.bgGradientDir
        },
        layers: state.layers.map(l => ({ ...l }))
    };

    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `vector-lab-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

function loadProject(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const project = JSON.parse(event.target.result);

            if (project.global) {
                state.bgMode = project.global.bgMode || 'solid';
                state.bgSolid = project.global.bgSolid || '#000000';
                state.bgStart = project.global.bgStart || '#000000';
                state.bgEnd = project.global.bgEnd || '#1a1a2e';
                state.bgGradientDir = project.global.bgGradientDir || 'vertical';
            }

            if (project.layers && project.layers.length > 0) {
                state.layers = project.layers;
                state.activeLayerId = state.layers[0].id;
                loadLayerToState(getActiveLayer());
                updateLayersUI();
            }

            console.log('Project loaded successfully');
        } catch (err) {
            alert('Error loading project: ' + err.message);
        }
    };
    reader.readAsText(file);

    e.target.value = '';
}
