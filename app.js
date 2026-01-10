/**
 * VECTOR.LAB — 80s Pattern Generator
 * With multi-axis effects, multi-color gradients, and fade position control
 */

// =========================================
// Default Values
// =========================================

const DEFAULTS = {
    count: 20,

    weight: { start: 2, end: 2 },
    weightAxis: 'x',
    weightFadeStart: 0,
    weightFadeEnd: 100,
    weightCurve: 'linear',

    spacing: { start: 1, end: 1 },
    spacingAxis: 'x',
    spacingFadeStart: 0,
    spacingFadeEnd: 100,
    spacingCurve: 'linear',

    length: { start: 100, end: 100 },
    lengthAxis: 'x',
    lengthFadeStart: 0,
    lengthFadeEnd: 100,
    lengthCurve: 'linear',

    opacity: { start: 100, end: 100 },
    opacityAxis: 'x',
    opacityFadeStart: 0,
    opacityFadeEnd: 100,
    opacityCurve: 'linear',

    colors: ['#ffffff'],
    colorAxis: 'x',

    rotX: 0, rotY: 0, rotZ: 0,
    posX: 50, posY: 50, scale: 100,

    bgColors: ['#000000'],
    bgDir: 'solid'
};

// =========================================
// State
// =========================================

const state = {
    canvas: null,
    canvasWidth: 800,
    canvasHeight: 800,
    time: 0,

    pattern: 'lines',

    count: DEFAULTS.count,

    weight: { ...DEFAULTS.weight },
    weightAxis: DEFAULTS.weightAxis,
    weightFadeStart: DEFAULTS.weightFadeStart,
    weightFadeEnd: DEFAULTS.weightFadeEnd,
    weightCurve: DEFAULTS.weightCurve,

    spacing: { ...DEFAULTS.spacing },
    spacingAxis: DEFAULTS.spacingAxis,
    spacingFadeStart: DEFAULTS.spacingFadeStart,
    spacingFadeEnd: DEFAULTS.spacingFadeEnd,
    spacingCurve: DEFAULTS.spacingCurve,

    length: { ...DEFAULTS.length },
    lengthAxis: DEFAULTS.lengthAxis,
    lengthFadeStart: DEFAULTS.lengthFadeStart,
    lengthFadeEnd: DEFAULTS.lengthFadeEnd,
    lengthCurve: DEFAULTS.lengthCurve,

    opacity: { ...DEFAULTS.opacity },
    opacityAxis: DEFAULTS.opacityAxis,
    opacityFadeStart: DEFAULTS.opacityFadeStart,
    opacityFadeEnd: DEFAULTS.opacityFadeEnd,
    opacityCurve: DEFAULTS.opacityCurve,

    colors: [...DEFAULTS.colors],
    colorAxis: DEFAULTS.colorAxis,

    rotX: DEFAULTS.rotX,
    rotY: DEFAULTS.rotY,
    rotZ: DEFAULTS.rotZ,
    posX: DEFAULTS.posX,
    posY: DEFAULTS.posY,
    scale: DEFAULTS.scale,

    bgColors: [...DEFAULTS.bgColors],
    bgDir: DEFAULTS.bgDir,

    layers: [],
    activeLayerId: null,
    draggedLayerId: null
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

function lerpColor3(c1, c2, t) {
    return {
        r: Math.round(c1.r + (c2.r - c1.r) * t),
        g: Math.round(c1.g + (c2.g - c1.g) * t),
        b: Math.round(c1.b + (c2.b - c1.b) * t)
    };
}

// Curve functions
function applyCurve(t, curveType) {
    switch (curveType) {
        case 'easeIn': return t * t;
        case 'easeOut': return 1 - (1 - t) * (1 - t);
        case 'easeInOut': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        default: return t;
    }
}

// Get value with fade position
// fadeStart/fadeEnd define where the transition happens (0-100)
// Before fadeStart: use start value
// After fadeEnd: use end value
// Between: interpolate with curve
function getValueWithFade(range, rawT, fadeStart, fadeEnd, curve) {
    const fs = fadeStart / 100;
    const fe = fadeEnd / 100;

    if (rawT <= fs) return range.start;
    if (rawT >= fe) return range.end;

    const t = (rawT - fs) / (fe - fs);
    const curved = applyCurve(t, curve);
    return lerp(range.start, range.end, curved);
}

// Get color from multi-stop gradient
function getGradientColor(colors, t) {
    if (colors.length === 1) return hexToRgb(colors[0]);

    const segment = (colors.length - 1) * t;
    const index = Math.floor(segment);
    const localT = segment - index;

    const i1 = Math.min(index, colors.length - 1);
    const i2 = Math.min(index + 1, colors.length - 1);

    return lerpColor3(hexToRgb(colors[i1]), hexToRgb(colors[i2]), localT);
}

// Calculate progress based on axis and position
function getAxisProgress(i, j, countX, countY, axis) {
    const tx = countX > 1 ? i / (countX - 1) : 0.5;
    const ty = countY > 1 ? j / (countY - 1) : 0.5;

    if (axis === 'x') return tx;
    if (axis === 'y') return ty;
    // Both X and Y (diagonal)
    return (tx + ty) / 2;
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
        count: state.count,
        weight: { ...state.weight },
        weightAxis: state.weightAxis,
        weightFadeStart: state.weightFadeStart,
        weightFadeEnd: state.weightFadeEnd,
        weightCurve: state.weightCurve,
        spacing: { ...state.spacing },
        spacingAxis: state.spacingAxis,
        spacingFadeStart: state.spacingFadeStart,
        spacingFadeEnd: state.spacingFadeEnd,
        spacingCurve: state.spacingCurve,
        length: { ...state.length },
        lengthAxis: state.lengthAxis,
        lengthFadeStart: state.lengthFadeStart,
        lengthFadeEnd: state.lengthFadeEnd,
        lengthCurve: state.lengthCurve,
        opacity: { ...state.opacity },
        opacityAxis: state.opacityAxis,
        opacityFadeStart: state.opacityFadeStart,
        opacityFadeEnd: state.opacityFadeEnd,
        opacityCurve: state.opacityCurve,
        colors: [...state.colors],
        colorAxis: state.colorAxis,
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
    state.count = layer.count;

    ['weight', 'spacing', 'length', 'opacity'].forEach(param => {
        state[param] = { ...layer[param] };
        state[`${param}Axis`] = layer[`${param}Axis`];
        state[`${param}FadeStart`] = layer[`${param}FadeStart`];
        state[`${param}FadeEnd`] = layer[`${param}FadeEnd`];
        state[`${param}Curve`] = layer[`${param}Curve`];
    });

    state.colors = [...layer.colors];
    state.colorAxis = layer.colorAxis;
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
    layer.count = state.count;

    ['weight', 'spacing', 'length', 'opacity'].forEach(param => {
        layer[param] = { ...state[param] };
        layer[`${param}Axis`] = state[`${param}Axis`];
        layer[`${param}FadeStart`] = state[`${param}FadeStart`];
        layer[`${param}FadeEnd`] = state[`${param}FadeEnd`];
        layer[`${param}Curve`] = state[`${param}Curve`];
    });

    layer.colors = [...state.colors];
    layer.colorAxis = state.colorAxis;
    layer.rotX = state.rotX;
    layer.rotY = state.rotY;
    layer.rotZ = state.rotZ;
    layer.posX = state.posX;
    layer.posY = state.posY;
    layer.scale = state.scale;

    updateLayersUI();
}

function moveLayer(fromIndex, toIndex) {
    const layer = state.layers.splice(fromIndex, 1)[0];
    state.layers.splice(toIndex, 0, layer);
    updateLayersUI();
}

function updateLayersUI() {
    const list = document.getElementById('layersList');
    if (!list) return;

    list.innerHTML = '';

    [...state.layers].reverse().forEach((layer) => {
        const item = document.createElement('div');
        item.className = `layer-item${layer.id === state.activeLayerId ? ' active' : ''}`;
        item.draggable = true;
        item.dataset.id = layer.id;

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

        // Drag and drop
        item.addEventListener('dragstart', () => {
            state.draggedLayerId = layer.id;
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            state.draggedLayerId = null;
            document.querySelectorAll('.layer-item').forEach(el => el.classList.remove('drag-over'));
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (layer.id !== state.draggedLayerId) item.classList.add('drag-over');
        });

        item.addEventListener('dragleave', () => item.classList.remove('drag-over'));

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            if (state.draggedLayerId && layer.id !== state.draggedLayerId) {
                const fromIndex = state.layers.findIndex(l => l.id === state.draggedLayerId);
                const toIndex = state.layers.findIndex(l => l.id === layer.id);
                if (fromIndex !== -1 && toIndex !== -1) moveLayer(fromIndex, toIndex);
            }
        });

        list.appendChild(item);
    });
}

// =========================================
// Pattern Renderers
// =========================================

function drawLines(layer) {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const count = layer.count;

    for (let i = 0; i < count; i++) {
        const tx = count > 1 ? i / (count - 1) : 0.5;

        // Get values based on their respective axes
        const wt = layer.weightAxis === 'x' ? tx : 0.5;
        const weight = getValueWithFade(layer.weight, wt, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve);

        const lt = layer.lengthAxis === 'x' ? tx : 0.5;
        const lengthPct = getValueWithFade(layer.length, lt, layer.lengthFadeStart, layer.lengthFadeEnd, layer.lengthCurve) / 100;

        const ot = layer.opacityAxis === 'x' ? tx : 0.5;
        const opacityVal = getValueWithFade(layer.opacity, ot, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve);

        const ct = layer.colorAxis === 'x' ? tx : 0.5;
        const col = getGradientColor(layer.colors, ct);

        const x = tx * w;
        const halfGap = (1 - lengthPct) / 2 * h;

        strokeWeight(max(0.5, weight));
        stroke(col.r, col.g, col.b, opacityVal / 100 * 255);
        line(x, halfGap, x, h - halfGap);
    }
}

function drawRadial(layer) {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const cx = w / 2;
    const cy = h / 2;
    const count = layer.count;
    const radius = Math.min(w, h) * 0.7;

    for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * TWO_PI;

        const weight = getValueWithFade(layer.weight, t, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve);
        const lengthPct = getValueWithFade(layer.length, t, layer.lengthFadeStart, layer.lengthFadeEnd, layer.lengthCurve) / 100;
        const opacityVal = getValueWithFade(layer.opacity, t, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve);
        const col = getGradientColor(layer.colors, t);

        strokeWeight(max(0.5, weight));
        stroke(col.r, col.g, col.b, opacityVal / 100 * 255);

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
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const cx = w / 2;
    const cy = h / 2;
    const count = layer.count;
    const maxRadius = Math.min(w, h) * 0.45;

    noFill();

    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;
        const r = (t * 0.9 + 0.1) * maxRadius;

        const weight = getValueWithFade(layer.weight, t, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve);
        const opacityVal = getValueWithFade(layer.opacity, t, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve);
        const col = getGradientColor(layer.colors, t);

        strokeWeight(max(0.5, weight));
        stroke(col.r, col.g, col.b, opacityVal / 100 * 255);
        circle(cx, cy, r * 2);
    }
}

function drawGrid(layer) {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const gridSize = Math.round(sqrt(layer.count));
    const cellW = w / gridSize;
    const cellH = h / gridSize;

    noFill();

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const tx = gridSize > 1 ? col / (gridSize - 1) : 0.5;
            const ty = gridSize > 1 ? row / (gridSize - 1) : 0.5;

            const wt = getAxisProgress(col, row, gridSize, gridSize, layer.weightAxis);
            const weight = getValueWithFade(layer.weight, wt, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve);

            const lt = getAxisProgress(col, row, gridSize, gridSize, layer.lengthAxis);
            const sizeMult = getValueWithFade(layer.length, lt, layer.lengthFadeStart, layer.lengthFadeEnd, layer.lengthCurve) / 100;

            const ot = getAxisProgress(col, row, gridSize, gridSize, layer.opacityAxis);
            const opacityVal = getValueWithFade(layer.opacity, ot, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve);

            const ct = getAxisProgress(col, row, gridSize, gridSize, layer.colorAxis);
            const c = getGradientColor(layer.colors, ct);

            strokeWeight(max(0.5, weight));
            stroke(c.r, c.g, c.b, opacityVal / 100 * 255);

            const x = col * cellW;
            const y = row * cellH;
            const rw = cellW * sizeMult;
            const rh = cellH * sizeMult;

            rect(x + (cellW - rw) / 2, y + (cellH - rh) / 2, rw, rh);
        }
    }
}

function drawDots(layer) {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const gridSize = Math.round(sqrt(layer.count));
    const cellW = w / gridSize;
    const cellH = h / gridSize;

    noStroke();

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const wt = getAxisProgress(col, row, gridSize, gridSize, layer.weightAxis);
            const dotSize = getValueWithFade(layer.weight, wt, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve) * 2;

            const ot = getAxisProgress(col, row, gridSize, gridSize, layer.opacityAxis);
            const opacityVal = getValueWithFade(layer.opacity, ot, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve);

            const ct = getAxisProgress(col, row, gridSize, gridSize, layer.colorAxis);
            const c = getGradientColor(layer.colors, ct);

            fill(c.r, c.g, c.b, opacityVal / 100 * 255);
            circle(col * cellW + cellW / 2, row * cellH + cellH / 2, dotSize);
        }
    }
}

function drawTriangle(layer) {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const count = layer.count;

    const topX = w / 2, topY = h * 0.1;
    const leftY = h * 0.9;

    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;
        const y = lerp(topY, leftY, t);
        const progress = (y - topY) / (leftY - topY);
        const xLeft = lerp(topX, w * 0.1, progress);
        const xRight = lerp(topX, w * 0.9, progress);

        const weight = getValueWithFade(layer.weight, t, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve);
        const opacityVal = getValueWithFade(layer.opacity, t, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve);
        const col = getGradientColor(layer.colors, t);

        strokeWeight(max(0.5, weight));
        stroke(col.r, col.g, col.b, opacityVal / 100 * 255);
        line(xLeft, y, xRight, y);
    }
}

function renderLayer(layer) {
    push();

    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const cx = w / 2;
    const cy = h / 2;

    translate(cx, cy);
    rotate(radians(layer.rotZ));
    scale(1, cos(radians(layer.rotX)));
    applyMatrix(1, 0, tan(radians(layer.rotY * 0.5)), 1, 0, 0);
    translate((layer.posX - 50) * w / 100, (layer.posY - 50) * h / 100);
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
// Background
// =========================================

function drawBackground() {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const colors = state.bgColors;

    if (state.bgDir === 'solid' || colors.length === 1) {
        const c = hexToRgb(colors[0]);
        background(c.r, c.g, c.b);
    } else if (state.bgDir === 'vertical') {
        for (let y = 0; y < h; y++) {
            const t = y / h;
            const c = getGradientColor(colors, t);
            stroke(c.r, c.g, c.b);
            line(0, y, w, y);
        }
    } else if (state.bgDir === 'horizontal') {
        for (let x = 0; x < w; x++) {
            const t = x / w;
            const c = getGradientColor(colors, t);
            stroke(c.r, c.g, c.b);
            line(x, 0, x, h);
        }
    } else if (state.bgDir === 'radial') {
        const maxR = Math.max(w, h) * 0.7;
        const cx = w / 2;
        const cy = h / 2;
        noStroke();
        for (let r = maxR; r > 0; r -= 2) {
            const t = 1 - r / maxR;
            const c = getGradientColor(colors, t);
            fill(c.r, c.g, c.b);
            circle(cx, cy, r * 2);
        }
    }
}

// =========================================
// p5.js
// =========================================

function setup() {
    state.canvas = createCanvas(state.canvasWidth, state.canvasHeight);
    state.canvas.parent('canvas');
    pixelDensity(2);
    frameRate(60);

    document.getElementById('resWidth').value = state.canvasWidth;
    document.getElementById('resHeight').value = state.canvasHeight;

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

// =========================================
// UI
// =========================================

function initUI() {
    // Pattern presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.pattern = btn.dataset.pattern;
            saveStateToActiveLayer();
        });
    });

    // Count
    setupSingleControl('count', 'countValue', 'countSlider');

    // Range controls with fade positions
    ['weight', 'spacing', 'length', 'opacity'].forEach(param => {
        setupRangeControl(param);
        setupAxisToggle(param);
        setupFadePosition(param);
    });

    // Colors
    setupColorSystem('colorStops', 'gradientBar', 'addColorBtn', 'colors', 'color');
    setupAxisToggle('color');

    // Color presets
    document.querySelectorAll('.color-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            state.colors = btn.dataset.colors.split(',');
            updateColorUI();
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

    // Background
    setupColorSystem('bgColorStops', 'bgGradientBar', 'addBgColorBtn', 'bgColors', 'bg');

    document.querySelectorAll('.bg-gradient-dir .dir-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bg-gradient-dir .dir-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.bgDir = btn.dataset.dir;
        });
    });

    // Resolution
    document.getElementById('resApply').addEventListener('click', applyResolution);

    // Double-click reset
    document.querySelectorAll('.resetable').forEach(el => {
        el.addEventListener('dblclick', () => resetAttribute(el.dataset.reset));
    });

    // Layers
    document.getElementById('addLayerBtn').addEventListener('click', createLayer);

    // Toolbar
    document.getElementById('resetBtn').addEventListener('click', resetAll);
    document.getElementById('randomBtn').addEventListener('click', randomize);
    document.getElementById('exportPng').addEventListener('click', () => saveCanvas('vector-lab-' + Date.now(), 'png'));
    document.getElementById('saveJson').addEventListener('click', saveProject);
    document.getElementById('loadJson').addEventListener('change', loadProject);

    // Keyboard
    document.addEventListener('keydown', e => {
        if (e.target.matches('input, select')) return;
        if (e.code === 'Space') { e.preventDefault(); randomize(); }
        if (e.code === 'KeyR') resetAll();
    });

    // Initialize color UIs
    updateColorUI();
    updateBgColorUI();
}

function setupSingleControl(param, inputId, sliderId) {
    const input = document.getElementById(inputId);
    const slider = document.getElementById(sliderId);

    input.addEventListener('input', () => {
        slider.value = input.value;
        state[param] = parseFloat(input.value);
        saveStateToActiveLayer();
    });

    slider.addEventListener('input', () => {
        input.value = slider.value;
        state[param] = parseFloat(slider.value);
        saveStateToActiveLayer();
    });
}

function setupRangeControl(param) {
    const startInput = document.getElementById(`${param}Start`);
    const endInput = document.getElementById(`${param}End`);
    const startSlider = document.getElementById(`${param}SliderStart`);
    const endSlider = document.getElementById(`${param}SliderEnd`);
    const rangeEl = document.getElementById(`${param}Range`);

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

function setupAxisToggle(param) {
    const container = document.querySelector(`[data-param="${param}"]`)?.closest('.section') ||
        document.querySelector(`.section-title[data-reset="${param}"]`)?.closest('.section');
    if (!container) return;

    const buttons = container.querySelectorAll('.axis-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Toggle: if already active, add the other axis (XY mode)
            const currentAxis = state[`${param}Axis`];
            const clickedAxis = btn.dataset.axis;

            if (currentAxis === clickedAxis) {
                // Already selected, do nothing
                return;
            } else if (currentAxis === 'xy') {
                // From XY, go to the unclicked one
                state[`${param}Axis`] = clickedAxis === 'x' ? 'y' : 'x';
            } else if (buttons.length === 2) {
                const otherBtn = Array.from(buttons).find(b => b !== btn);
                if (otherBtn.classList.contains('active')) {
                    // Both will be active = XY
                    state[`${param}Axis`] = 'xy';
                } else {
                    state[`${param}Axis`] = clickedAxis;
                }
            } else {
                state[`${param}Axis`] = clickedAxis;
            }

            // Update UI
            buttons.forEach(b => b.classList.remove('active'));
            if (state[`${param}Axis`] === 'xy') {
                buttons.forEach(b => b.classList.add('active'));
            } else {
                buttons.forEach(b => {
                    if (b.dataset.axis === state[`${param}Axis`]) b.classList.add('active');
                });
            }

            saveStateToActiveLayer();
        });
    });
}

function setupFadePosition(param) {
    const fadeStart = document.getElementById(`${param}FadeStart`);
    const fadeEnd = document.getElementById(`${param}FadeEnd`);
    const curve = document.getElementById(`${param}Curve`);

    if (fadeStart) {
        fadeStart.addEventListener('input', () => {
            state[`${param}FadeStart`] = parseFloat(fadeStart.value);
            saveStateToActiveLayer();
        });
    }

    if (fadeEnd) {
        fadeEnd.addEventListener('input', () => {
            state[`${param}FadeEnd`] = parseFloat(fadeEnd.value);
            saveStateToActiveLayer();
        });
    }

    if (curve) {
        curve.addEventListener('change', () => {
            state[`${param}Curve`] = curve.value;
            saveStateToActiveLayer();
        });
    }
}

function setupColorSystem(stopsId, barId, addBtnId, stateKey, prefix) {
    const addBtn = document.getElementById(addBtnId);
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            state[stateKey].push('#ffffff');
            if (stateKey === 'colors') updateColorUI();
            else updateBgColorUI();
            saveStateToActiveLayer();
        });
    }
}

function updateColorUI() {
    const container = document.getElementById('colorStops');
    const bar = document.getElementById('gradientBar');
    if (!container) return;

    container.innerHTML = '';
    state.colors.forEach((color, i) => {
        const stop = document.createElement('div');
        stop.className = 'color-stop';
        stop.innerHTML = `
            <input type="color" value="${color}">
            ${state.colors.length > 1 ? '<button class="remove-color">×</button>' : ''}
        `;

        stop.querySelector('input').addEventListener('input', (e) => {
            state.colors[i] = e.target.value;
            updateGradientBar(bar, state.colors);
            saveStateToActiveLayer();
        });

        const removeBtn = stop.querySelector('.remove-color');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                state.colors.splice(i, 1);
                updateColorUI();
                saveStateToActiveLayer();
            });
        }

        container.appendChild(stop);
    });

    updateGradientBar(bar, state.colors);
}

function updateBgColorUI() {
    const container = document.getElementById('bgColorStops');
    const bar = document.getElementById('bgGradientBar');
    if (!container) return;

    container.innerHTML = '';
    state.bgColors.forEach((color, i) => {
        const stop = document.createElement('div');
        stop.className = 'color-stop';
        stop.innerHTML = `
            <input type="color" value="${color}">
            ${state.bgColors.length > 1 ? '<button class="remove-color">×</button>' : ''}
        `;

        stop.querySelector('input').addEventListener('input', (e) => {
            state.bgColors[i] = e.target.value;
            updateGradientBar(bar, state.bgColors);
        });

        const removeBtn = stop.querySelector('.remove-color');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                state.bgColors.splice(i, 1);
                updateBgColorUI();
            });
        }

        container.appendChild(stop);
    });

    updateGradientBar(bar, state.bgColors);
}

function updateGradientBar(bar, colors) {
    if (!bar) return;
    if (colors.length === 1) {
        bar.style.background = colors[0];
    } else {
        bar.style.background = `linear-gradient(90deg, ${colors.join(', ')})`;
    }
}

function applyResolution() {
    const w = parseInt(document.getElementById('resWidth').value) || 800;
    const h = parseInt(document.getElementById('resHeight').value) || 800;
    state.canvasWidth = constrain(w, 100, 4000);
    state.canvasHeight = constrain(h, 100, 4000);
    resizeCanvas(state.canvasWidth, state.canvasHeight);
}

function syncUIWithState() {
    // Pattern
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.pattern === state.pattern);
    });

    // Count
    document.getElementById('countValue').value = state.count;
    document.getElementById('countSlider').value = state.count;

    // Ranges
    ['weight', 'spacing', 'length', 'opacity'].forEach(syncRange);

    // Colors
    updateColorUI();

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
    const fadeStart = document.getElementById(`${param}FadeStart`);
    const fadeEnd = document.getElementById(`${param}FadeEnd`);
    const curve = document.getElementById(`${param}Curve`);

    if (startInput) startInput.value = state[param].start;
    if (endInput) endInput.value = state[param].end;
    if (startSlider) startSlider.value = state[param].start;
    if (endSlider) endSlider.value = state[param].end;
    if (fadeStart) fadeStart.value = state[`${param}FadeStart`];
    if (fadeEnd) fadeEnd.value = state[`${param}FadeEnd`];
    if (curve) curve.value = state[`${param}Curve`];

    if (rangeEl && startSlider) {
        const min = parseFloat(startSlider.min);
        const max = parseFloat(startSlider.max);
        const startPct = ((state[param].start - min) / (max - min)) * 100;
        const endPct = ((state[param].end - min) / (max - min)) * 100;
        rangeEl.style.left = `${Math.min(startPct, endPct)}%`;
        rangeEl.style.right = `${100 - Math.max(startPct, endPct)}%`;
    }
}

function resetAttribute(param) {
    if (param === 'count') state.count = DEFAULTS.count;
    else if (['weight', 'spacing', 'length', 'opacity'].includes(param)) {
        state[param] = { ...DEFAULTS[param] };
        state[`${param}FadeStart`] = DEFAULTS[`${param}FadeStart`];
        state[`${param}FadeEnd`] = DEFAULTS[`${param}FadeEnd`];
        state[`${param}Curve`] = DEFAULTS[`${param}Curve`];
    }
    else if (['rotX', 'rotY', 'rotZ', 'posX', 'posY', 'scale'].includes(param)) {
        state[param] = DEFAULTS[param];
    }
    else if (param === 'color') {
        state.colors = [...DEFAULTS.colors];
    }
    else if (param === 'bg') {
        state.bgColors = [...DEFAULTS.bgColors];
    }

    syncUIWithState();
    saveStateToActiveLayer();
}

function resetAll() {
    Object.keys(DEFAULTS).forEach(key => {
        if (Array.isArray(DEFAULTS[key])) {
            state[key] = [...DEFAULTS[key]];
        } else if (typeof DEFAULTS[key] === 'object') {
            state[key] = { ...DEFAULTS[key] };
        } else {
            state[key] = DEFAULTS[key];
        }
    });
    syncUIWithState();
    updateBgColorUI();
    saveStateToActiveLayer();
}

function randomize() {
    const patterns = ['lines', 'radial', 'circles', 'grid', 'dots', 'triangle'];
    state.pattern = patterns[floor(random(patterns.length))];

    state.count = floor(random(10, 60));

    state.weight = { start: random(0.5, 15), end: random(0.5, 15) };
    state.spacing = { start: random(0.3, 2), end: random(0.3, 2) };
    state.length = { start: random(50, 100), end: random(50, 100) };
    state.opacity = { start: random(60, 100), end: random(60, 100) };

    ['weight', 'spacing', 'length', 'opacity'].forEach(param => {
        state[`${param}FadeStart`] = floor(random(0, 30));
        state[`${param}FadeEnd`] = floor(random(70, 100));
        state[`${param}Axis`] = random() > 0.5 ? 'x' : 'y';
    });

    const palettes = [
        ['#ffffff'],
        ['#ff6b35', '#ff3366'],
        ['#ff3366', '#00d4ff'],
        ['#00d4ff', '#ffffff'],
        ['#ffcc00', '#ff6b35', '#ff3366']
    ];
    state.colors = [...palettes[floor(random(palettes.length))]];

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
// Save/Load
// =========================================

function saveProject() {
    const project = {
        version: '3.0',
        resolution: { width: state.canvasWidth, height: state.canvasHeight },
        bg: { colors: state.bgColors, dir: state.bgDir },
        layers: state.layers.map(l => ({ ...l }))
    };

    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vector-lab-${Date.now()}.json`;
    a.click();
}

function loadProject(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const project = JSON.parse(event.target.result);

            if (project.resolution) {
                state.canvasWidth = project.resolution.width || 800;
                state.canvasHeight = project.resolution.height || 800;
                resizeCanvas(state.canvasWidth, state.canvasHeight);
                document.getElementById('resWidth').value = state.canvasWidth;
                document.getElementById('resHeight').value = state.canvasHeight;
            }

            if (project.bg) {
                state.bgColors = project.bg.colors || ['#000000'];
                state.bgDir = project.bg.dir || 'solid';
                updateBgColorUI();
            }

            if (project.layers && project.layers.length > 0) {
                state.layers = project.layers;
                state.activeLayerId = state.layers[0].id;
                loadLayerToState(getActiveLayer());
                updateLayersUI();
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}
