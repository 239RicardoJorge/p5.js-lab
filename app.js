/**
 * VECTOR.LAB — 80s Pattern Generator
 * Advanced pattern generator with animation curves,
 * draggable layers, and customizable resolution
 */

// =========================================
// Default Values
// =========================================

const DEFAULTS = {
    count: 20,
    weight: { start: 2, end: 2 },
    spacing: { start: 1, end: 1 },
    length: { start: 100, end: 100 },
    opacity: { start: 100, end: 100 },

    // Curve and position for each range attr
    weightCurve: 'linear',
    weightPos: 50,
    spacingCurve: 'linear',
    spacingPos: 50,
    lengthCurve: 'linear',
    lengthPos: 50,
    opacityCurve: 'linear',
    opacityPos: 50,

    // Animation params
    countAnim: { wave: 'sine', amp: 0, freq: 1 },
    weightAnim: { wave: 'sine', amp: 0, freq: 1 },
    spacingAnim: { wave: 'sine', amp: 0, freq: 1 },
    lengthAnim: { wave: 'sine', amp: 0, freq: 1 },
    opacityAnim: { wave: 'sine', amp: 0, freq: 1 },

    colorMode: 'solid',
    colorSolid: '#ffffff',
    colorStart: '#ffffff',
    colorEnd: '#ffffff',

    rotX: 0, rotY: 0, rotZ: 0,
    posX: 50, posY: 50, scale: 100,

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
    canvasWidth: 800,
    canvasHeight: 800,
    time: 0,

    pattern: 'lines',
    direction: 'vertical',

    count: DEFAULTS.count,
    weight: { ...DEFAULTS.weight },
    spacing: { ...DEFAULTS.spacing },
    length: { ...DEFAULTS.length },
    opacity: { ...DEFAULTS.opacity },

    weightCurve: DEFAULTS.weightCurve,
    weightPos: DEFAULTS.weightPos,
    spacingCurve: DEFAULTS.spacingCurve,
    spacingPos: DEFAULTS.spacingPos,
    lengthCurve: DEFAULTS.lengthCurve,
    lengthPos: DEFAULTS.lengthPos,
    opacityCurve: DEFAULTS.opacityCurve,
    opacityPos: DEFAULTS.opacityPos,

    countAnim: { ...DEFAULTS.countAnim },
    weightAnim: { ...DEFAULTS.weightAnim },
    spacingAnim: { ...DEFAULTS.spacingAnim },
    lengthAnim: { ...DEFAULTS.lengthAnim },
    opacityAnim: { ...DEFAULTS.opacityAnim },

    colorMode: DEFAULTS.colorMode,
    colorSolid: DEFAULTS.colorSolid,
    colorStart: DEFAULTS.colorStart,
    colorEnd: DEFAULTS.colorEnd,

    rotX: DEFAULTS.rotX,
    rotY: DEFAULTS.rotY,
    rotZ: DEFAULTS.rotZ,
    posX: DEFAULTS.posX,
    posY: DEFAULTS.posY,
    scale: DEFAULTS.scale,

    bgMode: DEFAULTS.bgMode,
    bgSolid: DEFAULTS.bgSolid,
    bgStart: DEFAULTS.bgStart,
    bgEnd: DEFAULTS.bgEnd,
    bgGradientDir: DEFAULTS.bgGradientDir,

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

// Curve functions for interpolation
function applyCurve(t, curveType, midPos = 0.5) {
    // midPos shifts where the midpoint is (0-1)
    const mid = midPos;

    switch (curveType) {
        case 'linear':
            return t;
        case 'easeIn':
            // Quadratic ease in
            if (t < mid) {
                return (t / mid) * (t / mid) * 0.5;
            }
            return 0.5 + ((t - mid) / (1 - mid)) * 0.5;
        case 'easeOut':
            // Quadratic ease out
            if (t < mid) {
                return t / mid * 0.5;
            }
            const x = (t - mid) / (1 - mid);
            return 0.5 + (1 - (1 - x) * (1 - x)) * 0.5;
        case 'easeInOut':
            // Smooth S-curve
            if (t < mid) {
                const x = t / mid;
                return x * x * (3 - 2 * x) * 0.5;
            }
            const y = (t - mid) / (1 - mid);
            return 0.5 + y * y * (3 - 2 * y) * 0.5;
        case 'step':
            return t < mid ? 0 : 1;
        default:
            return t;
    }
}

// Wave functions for animation
function getWaveValue(waveType, phase) {
    switch (waveType) {
        case 'sine':
            return Math.sin(phase * Math.PI * 2);
        case 'triangle':
            const t = (phase % 1);
            return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
        case 'square':
            return (phase % 1) < 0.5 ? 1 : -1;
        case 'saw':
            return 2 * (phase % 1) - 1;
        default:
            return Math.sin(phase * Math.PI * 2);
    }
}

function getAnimatedValue(baseValue, anim, time) {
    if (anim.amp === 0) return baseValue;
    const phase = time * anim.freq;
    const wave = getWaveValue(anim.wave, phase);
    return baseValue * (1 + wave * anim.amp / 100);
}

function lerpWithCurve(range, t, curve, pos) {
    const curvedT = applyCurve(t, curve, pos / 100);
    return lerp(range.start, range.end, curvedT);
}

function getColor(t, layer, curve = 'linear', pos = 50) {
    let c1, c2;

    if (layer.colorMode === 'solid') {
        c1 = hexToRgb(layer.colorSolid);
        c2 = c1;
    } else {
        c1 = hexToRgb(layer.colorStart);
        c2 = hexToRgb(layer.colorEnd);
    }

    const curvedT = applyCurve(t, curve, pos / 100);
    const c = lerpColor3(c1, c2, curvedT);
    const opacityRange = layer.opacity;
    const alpha = lerpWithCurve(opacityRange, t, layer.opacityCurve, layer.opacityPos) / 100 * 255;

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
        weight: { ...state.weight },
        spacing: { ...state.spacing },
        length: { ...state.length },
        opacity: { ...state.opacity },
        weightCurve: state.weightCurve,
        weightPos: state.weightPos,
        spacingCurve: state.spacingCurve,
        spacingPos: state.spacingPos,
        lengthCurve: state.lengthCurve,
        lengthPos: state.lengthPos,
        opacityCurve: state.opacityCurve,
        opacityPos: state.opacityPos,
        countAnim: { ...state.countAnim },
        weightAnim: { ...state.weightAnim },
        spacingAnim: { ...state.spacingAnim },
        lengthAnim: { ...state.lengthAnim },
        opacityAnim: { ...state.opacityAnim },
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
    state.weight = { ...layer.weight };
    state.spacing = { ...layer.spacing };
    state.length = { ...layer.length };
    state.opacity = { ...layer.opacity };
    state.weightCurve = layer.weightCurve;
    state.weightPos = layer.weightPos;
    state.spacingCurve = layer.spacingCurve;
    state.spacingPos = layer.spacingPos;
    state.lengthCurve = layer.lengthCurve;
    state.lengthPos = layer.lengthPos;
    state.opacityCurve = layer.opacityCurve;
    state.opacityPos = layer.opacityPos;
    state.countAnim = { ...layer.countAnim };
    state.weightAnim = { ...layer.weightAnim };
    state.spacingAnim = { ...layer.spacingAnim };
    state.lengthAnim = { ...layer.lengthAnim };
    state.opacityAnim = { ...layer.opacityAnim };
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
    layer.weight = { ...state.weight };
    layer.spacing = { ...state.spacing };
    layer.length = { ...state.length };
    layer.opacity = { ...state.opacity };
    layer.weightCurve = state.weightCurve;
    layer.weightPos = state.weightPos;
    layer.spacingCurve = state.spacingCurve;
    layer.spacingPos = state.spacingPos;
    layer.lengthCurve = state.lengthCurve;
    layer.lengthPos = state.lengthPos;
    layer.opacityCurve = state.opacityCurve;
    layer.opacityPos = state.opacityPos;
    layer.countAnim = { ...state.countAnim };
    layer.weightAnim = { ...state.weightAnim };
    layer.spacingAnim = { ...state.spacingAnim };
    layer.lengthAnim = { ...state.lengthAnim };
    layer.opacityAnim = { ...state.opacityAnim };
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

function moveLayer(fromIndex, toIndex) {
    const layer = state.layers.splice(fromIndex, 1)[0];
    state.layers.splice(toIndex, 0, layer);
    updateLayersUI();
}

function updateLayersUI() {
    const list = document.getElementById('layersList');
    if (!list) return;

    list.innerHTML = '';

    [...state.layers].reverse().forEach((layer, displayIndex) => {
        const realIndex = state.layers.length - 1 - displayIndex;
        const item = document.createElement('div');
        item.className = `layer-item${layer.id === state.activeLayerId ? ' active' : ''}`;
        item.draggable = true;
        item.dataset.id = layer.id;
        item.dataset.index = realIndex;

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

        // Click to select
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.layer-visibility') && !e.target.closest('.layer-delete')) {
                selectLayer(layer.id);
            }
        });

        // Toggle visibility
        item.querySelector('.layer-visibility').addEventListener('click', (e) => {
            e.stopPropagation();
            layer.visible = !layer.visible;
            updateLayersUI();
        });

        // Delete
        item.querySelector('.layer-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteLayer(layer.id);
        });

        // Drag and drop
        item.addEventListener('dragstart', (e) => {
            state.draggedLayerId = layer.id;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            state.draggedLayerId = null;
            document.querySelectorAll('.layer-item').forEach(el => el.classList.remove('drag-over'));
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (layer.id !== state.draggedLayerId) {
                item.classList.add('drag-over');
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');

            if (state.draggedLayerId && layer.id !== state.draggedLayerId) {
                const fromIndex = state.layers.findIndex(l => l.id === state.draggedLayerId);
                const toIndex = state.layers.findIndex(l => l.id === layer.id);
                if (fromIndex !== -1 && toIndex !== -1) {
                    moveLayer(fromIndex, toIndex);
                }
            }
        });

        list.appendChild(item);
    });
}

// =========================================
// Pattern Renderers
// =========================================

function drawLines(layer, time) {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const count = Math.round(getAnimatedValue(layer.count, layer.countAnim, time));

    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;

        // Calculate position with spacing curve
        let pos;
        if (layer.spacing.start === layer.spacing.end) {
            pos = (i + 0.5) / count;
        } else {
            let accumulated = 0;
            for (let j = 0; j <= i; j++) {
                const jt = count > 1 ? j / (count - 1) : 0.5;
                accumulated += lerpWithCurve(layer.spacing, jt, layer.spacingCurve, layer.spacingPos);
            }
            let total = 0;
            for (let j = 0; j < count; j++) {
                const jt = count > 1 ? j / (count - 1) : 0.5;
                total += lerpWithCurve(layer.spacing, jt, layer.spacingCurve, layer.spacingPos);
            }
            pos = accumulated / total;
        }

        const weight = getAnimatedValue(
            lerpWithCurve(layer.weight, t, layer.weightCurve, layer.weightPos),
            layer.weightAnim, time
        );

        const lengthPct = getAnimatedValue(
            lerpWithCurve(layer.length, t, layer.lengthCurve, layer.lengthPos),
            layer.lengthAnim, time
        ) / 100;

        const col = getColor(t, layer, layer.opacityCurve, layer.opacityPos);

        strokeWeight(max(0.5, weight));
        stroke(col);

        if (layer.direction === 'vertical') {
            const x = pos * w;
            const halfGap = (1 - lengthPct) / 2 * h;
            line(x, halfGap, x, h - halfGap);
        } else if (layer.direction === 'horizontal') {
            const y = pos * h;
            const halfGap = (1 - lengthPct) / 2 * w;
            line(halfGap, y, w - halfGap, y);
        } else {
            const offset = (i - count / 2) * (w / count) * 1.5;
            line(offset, 0, offset + w, h);
        }
    }
}

function drawRadial(layer, time) {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const cx = w / 2;
    const cy = h / 2;
    const count = Math.round(getAnimatedValue(layer.count, layer.countAnim, time));
    const radius = Math.min(w, h) * 0.7;

    for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * TWO_PI;

        const weight = getAnimatedValue(
            lerpWithCurve(layer.weight, t, layer.weightCurve, layer.weightPos),
            layer.weightAnim, time
        );
        const lengthPct = getAnimatedValue(
            lerpWithCurve(layer.length, t, layer.lengthCurve, layer.lengthPos),
            layer.lengthAnim, time
        ) / 100;

        const col = getColor(t, layer, layer.opacityCurve, layer.opacityPos);

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

function drawCircles(layer, time) {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const cx = w / 2;
    const cy = h / 2;
    const count = Math.round(getAnimatedValue(layer.count, layer.countAnim, time));
    const maxRadius = Math.min(w, h) * 0.45;

    noFill();

    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;

        let r;
        if (layer.spacing.start === layer.spacing.end) {
            r = (t * 0.9 + 0.1) * maxRadius;
        } else {
            let accumulated = 0;
            for (let j = 0; j <= i; j++) {
                const jt = count > 1 ? j / (count - 1) : 0.5;
                accumulated += lerpWithCurve(layer.spacing, jt, layer.spacingCurve, layer.spacingPos);
            }
            let total = 0;
            for (let j = 0; j < count; j++) {
                const jt = count > 1 ? j / (count - 1) : 0.5;
                total += lerpWithCurve(layer.spacing, jt, layer.spacingCurve, layer.spacingPos);
            }
            r = (accumulated / total) * maxRadius;
        }

        const weight = getAnimatedValue(
            lerpWithCurve(layer.weight, t, layer.weightCurve, layer.weightPos),
            layer.weightAnim, time
        );
        const col = getColor(t, layer, layer.opacityCurve, layer.opacityPos);

        strokeWeight(max(0.5, weight));
        stroke(col);
        circle(cx, cy, r * 2);
    }
}

function drawGrid(layer, time) {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const gridSize = Math.round(sqrt(getAnimatedValue(layer.count, layer.countAnim, time)));
    const cellW = w / gridSize;
    const cellH = h / gridSize;

    noFill();

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const t = (row * gridSize + col) / (gridSize * gridSize - 1);

            const weight = getAnimatedValue(
                lerpWithCurve(layer.weight, t, layer.weightCurve, layer.weightPos),
                layer.weightAnim, time
            );
            const sizeMult = getAnimatedValue(
                lerpWithCurve(layer.length, t, layer.lengthCurve, layer.lengthPos),
                layer.lengthAnim, time
            ) / 100;

            const col_ = getColor(t, layer, layer.opacityCurve, layer.opacityPos);

            strokeWeight(max(0.5, weight));
            stroke(col_);

            const x = col * cellW;
            const y = row * cellH;
            const rw = cellW * sizeMult;
            const rh = cellH * sizeMult;
            const offsetX = (cellW - rw) / 2;
            const offsetY = (cellH - rh) / 2;

            rect(x + offsetX, y + offsetY, rw, rh);
        }
    }
}

function drawDots(layer, time) {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const gridSize = Math.round(sqrt(getAnimatedValue(layer.count, layer.countAnim, time)));
    const cellW = w / gridSize;
    const cellH = h / gridSize;

    noStroke();

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const t = (row * gridSize + col) / (gridSize * gridSize - 1);
            const dotSize = getAnimatedValue(
                lerpWithCurve(layer.weight, t, layer.weightCurve, layer.weightPos),
                layer.weightAnim, time
            ) * 2;
            const col_ = getColor(t, layer, layer.opacityCurve, layer.opacityPos);

            fill(col_);
            circle(col * cellW + cellW / 2, row * cellH + cellH / 2, dotSize);
        }
    }
}

function drawTriangle(layer, time) {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const count = Math.round(getAnimatedValue(layer.count, layer.countAnim, time));

    const topX = w / 2, topY = h * 0.1;
    const leftX = w * 0.1, leftY = h * 0.9;
    const rightX = w * 0.9, rightY = h * 0.9;

    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;
        const y = lerp(topY, leftY, t);
        const progress = (y - topY) / (leftY - topY);
        const xLeft = lerp(topX, leftX, progress);
        const xRight = lerp(topX, rightX, progress);

        const weight = getAnimatedValue(
            lerpWithCurve(layer.weight, t, layer.weightCurve, layer.weightPos),
            layer.weightAnim, time
        );
        const col = getColor(t, layer, layer.opacityCurve, layer.opacityPos);

        strokeWeight(max(0.5, weight));
        stroke(col);
        line(xLeft, y, xRight, y);
    }
}

function renderLayer(layer, time) {
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
        case 'lines': drawLines(layer, time); break;
        case 'radial': drawRadial(layer, time); break;
        case 'circles': drawCircles(layer, time); break;
        case 'grid': drawGrid(layer, time); break;
        case 'dots': drawDots(layer, time); break;
        case 'triangle': drawTriangle(layer, time); break;
    }

    pop();
}

// =========================================
// Background
// =========================================

function drawBackground() {
    const w = state.canvasWidth;
    const h = state.canvasHeight;

    if (state.bgMode === 'solid') {
        const c = hexToRgb(state.bgSolid);
        background(c.r, c.g, c.b);
    } else {
        const c1 = hexToRgb(state.bgStart);
        const c2 = hexToRgb(state.bgEnd);

        if (state.bgGradientDir === 'vertical') {
            for (let y = 0; y < h; y++) {
                const t = y / h;
                const c = lerpColor3(c1, c2, t);
                stroke(c.r, c.g, c.b);
                line(0, y, w, y);
            }
        } else if (state.bgGradientDir === 'horizontal') {
            for (let x = 0; x < w; x++) {
                const t = x / w;
                const c = lerpColor3(c1, c2, t);
                stroke(c.r, c.g, c.b);
                line(x, 0, x, h);
            }
        } else {
            const maxR = Math.max(w, h) * 0.7;
            const cx = w / 2;
            const cy = h / 2;
            noStroke();
            for (let r = maxR; r > 0; r -= 2) {
                const t = 1 - r / maxR;
                const c = lerpColor3(c1, c2, t);
                fill(c.r, c.g, c.b);
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
        if (layer.visible) renderLayer(layer, state.time);
    });
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
            document.getElementById('directionSelector').style.display =
                state.pattern === 'lines' ? 'flex' : 'none';
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
    setupSingleControl('count', 'countValue', 'countSlider');

    // Range controls with curves
    ['weight', 'spacing', 'length', 'opacity'].forEach(param => {
        setupRangeControl(param);
        setupCurveControl(param);
    });

    // Animation toggles and panels
    ['count', 'weight', 'spacing', 'length', 'opacity'].forEach(param => {
        const toggle = document.querySelector(`.anim-toggle[data-param="${param}"] .anim-btn`);
        const panel = document.getElementById(`${param}AnimPanel`);

        if (toggle && panel) {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('active');
                panel.classList.toggle('hidden');
            });
        }

        setupAnimControl(param);
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

    // Background
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

    document.getElementById('bgStart').addEventListener('input', e => {
        state.bgStart = e.target.value;
        updateBgGradientPreview();
    });

    document.getElementById('bgEnd').addEventListener('input', e => {
        state.bgEnd = e.target.value;
        updateBgGradientPreview();
    });

    document.querySelectorAll('.bg-gradient-dir .dir-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bg-gradient-dir .dir-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.bgGradientDir = btn.dataset.dir;
        });
    });

    // Resolution
    document.getElementById('resApply').addEventListener('click', applyResolution);
    document.getElementById('resWidth').addEventListener('keydown', e => {
        if (e.key === 'Enter') applyResolution();
    });
    document.getElementById('resHeight').addEventListener('keydown', e => {
        if (e.key === 'Enter') applyResolution();
    });

    // Double-click reset
    document.querySelectorAll('.resetable').forEach(el => {
        el.addEventListener('dblclick', () => {
            resetAttribute(el.dataset.reset);
        });
    });

    // Add layer
    document.getElementById('addLayerBtn').addEventListener('click', createLayer);

    // Reset / Random
    document.getElementById('resetBtn').addEventListener('click', resetAll);
    document.getElementById('randomBtn').addEventListener('click', randomize);

    // Export
    document.getElementById('exportPng').addEventListener('click', () => {
        saveCanvas('vector-lab-' + Date.now(), 'png');
    });

    document.getElementById('exportSvg').addEventListener('click', () => {
        alert('SVG export coming soon!');
    });

    document.getElementById('saveJson').addEventListener('click', saveProject);
    document.getElementById('loadJson').addEventListener('change', loadProject);

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        if (e.target.matches('input, select')) return;
        if (e.code === 'Space') { e.preventDefault(); randomize(); }
        if (e.code === 'KeyR') resetAll();
    });
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

function setupCurveControl(param) {
    const curveSelect = document.getElementById(`${param}Curve`);
    const posSlider = document.getElementById(`${param}Pos`);

    if (curveSelect) {
        curveSelect.addEventListener('change', () => {
            state[`${param}Curve`] = curveSelect.value;
            saveStateToActiveLayer();
        });
    }

    if (posSlider) {
        posSlider.addEventListener('input', () => {
            state[`${param}Pos`] = parseFloat(posSlider.value);
            saveStateToActiveLayer();
        });
    }
}

function setupAnimControl(param) {
    const wave = document.getElementById(`${param}Wave`);
    const amp = document.getElementById(`${param}Amp`);
    const freq = document.getElementById(`${param}Freq`);

    if (wave) {
        wave.addEventListener('change', () => {
            state[`${param}Anim`].wave = wave.value;
            saveStateToActiveLayer();
        });
    }

    if (amp) {
        amp.addEventListener('input', () => {
            state[`${param}Anim`].amp = parseFloat(amp.value) || 0;
            saveStateToActiveLayer();
        });
    }

    if (freq) {
        freq.addEventListener('input', () => {
            state[`${param}Anim`].freq = parseFloat(freq.value) || 1;
            saveStateToActiveLayer();
        });
    }
}

function applyResolution() {
    const w = parseInt(document.getElementById('resWidth').value) || 800;
    const h = parseInt(document.getElementById('resHeight').value) || 800;
    state.canvasWidth = constrain(w, 100, 4000);
    state.canvasHeight = constrain(h, 100, 4000);
    resizeCanvas(state.canvasWidth, state.canvasHeight);
    document.getElementById('resWidth').value = state.canvasWidth;
    document.getElementById('resHeight').value = state.canvasHeight;
}

function updateColorGradientPreview() {
    const preview = document.getElementById('colorGradientPreview');
    if (preview) preview.style.background = `linear-gradient(90deg, ${state.colorStart}, ${state.colorEnd})`;
}

function updateBgGradientPreview() {
    const preview = document.getElementById('bgGradientPreview');
    if (preview) preview.style.background = `linear-gradient(90deg, ${state.bgStart}, ${state.bgEnd})`;
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

    // Ranges with curves
    ['weight', 'spacing', 'length', 'opacity'].forEach(param => {
        syncRange(param);
    });

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
    const curveSelect = document.getElementById(`${param}Curve`);
    const posSlider = document.getElementById(`${param}Pos`);

    if (startInput) startInput.value = state[param].start;
    if (endInput) endInput.value = state[param].end;
    if (startSlider) startSlider.value = state[param].start;
    if (endSlider) endSlider.value = state[param].end;
    if (curveSelect) curveSelect.value = state[`${param}Curve`];
    if (posSlider) posSlider.value = state[`${param}Pos`];

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
        state[`${param}Curve`] = DEFAULTS[`${param}Curve`];
        state[`${param}Pos`] = DEFAULTS[`${param}Pos`];
    }
    else if (['rotX', 'rotY', 'rotZ', 'posX', 'posY', 'scale'].includes(param)) {
        state[param] = DEFAULTS[param];
    }
    else if (param === 'color') {
        state.colorSolid = DEFAULTS.colorSolid;
        state.colorStart = DEFAULTS.colorStart;
        state.colorEnd = DEFAULTS.colorEnd;
    }
    else if (param === 'bg') {
        state.bgSolid = DEFAULTS.bgSolid;
        state.bgStart = DEFAULTS.bgStart;
        state.bgEnd = DEFAULTS.bgEnd;
    }

    syncUIWithState();
    saveStateToActiveLayer();
}

function resetAll() {
    Object.keys(DEFAULTS).forEach(key => {
        if (typeof DEFAULTS[key] === 'object' && !Array.isArray(DEFAULTS[key])) {
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

    const curves = ['linear', 'easeIn', 'easeOut', 'easeInOut'];
    state.weightCurve = curves[floor(random(curves.length))];
    state.spacingCurve = curves[floor(random(curves.length))];
    state.lengthCurve = curves[floor(random(curves.length))];
    state.opacityCurve = curves[floor(random(curves.length))];

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
// Save/Load
// =========================================

function saveProject() {
    const project = {
        version: '2.0',
        timestamp: Date.now(),
        resolution: { width: state.canvasWidth, height: state.canvasHeight },
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

            if (project.resolution) {
                state.canvasWidth = project.resolution.width || 800;
                state.canvasHeight = project.resolution.height || 800;
                resizeCanvas(state.canvasWidth, state.canvasHeight);
                document.getElementById('resWidth').value = state.canvasWidth;
                document.getElementById('resHeight').value = state.canvasHeight;
            }

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

            console.log('Project loaded');
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}
