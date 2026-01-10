/**
 * VECTOR.LAB — 80s Pattern Generator
 */

const DEFAULTS = {
    count: 20,
    weight: { start: 2, end: 2 }, weightAxis: 'x', weightFadeStart: 0, weightFadeEnd: 100, weightCurve: 'linear', weightMult: 1, weightSteps: 100,
    spacing: { start: 1, end: 1 }, spacingAxis: 'x', spacingFadeStart: 0, spacingFadeEnd: 100, spacingCurve: 'linear', spacingMult: 1, spacingSteps: 100, spacingFit: true,
    length: { start: 100, end: 100 }, lengthAxis: 'x', lengthFadeStart: 0, lengthFadeEnd: 100, lengthCurve: 'linear', lengthMult: 1, lengthSteps: 100,
    opacity: { start: 100, end: 100 }, opacityAxis: 'x', opacityFadeStart: 0, opacityFadeEnd: 100, opacityCurve: 'linear', opacityMult: 1, opacitySteps: 100,
    colors: ['#ffffff'], colorMode: 'solid', colorAxis: 'x', colorFadeStart: 0, colorFadeEnd: 100, colorSteps: 100,
    rotX: 0, rotY: 0, rotZ: 0, posX: 50, posY: 50, scale: 100,
    bgColors: ['#000000'], bgMode: 'solid', bgDir: 'vertical'
};

// Logarithmic Steps Helpers
function toLogSteps(sliderVal, maxSteps = 100) {
    if (maxSteps <= 20) return Math.round(map(sliderVal, 0, 100, 1, maxSteps));
    if (sliderVal <= 50) return Math.round(map(sliderVal, 0, 50, 1, 20));
    return Math.round(map(sliderVal, 50, 100, 20, maxSteps));
}
function fromLogSteps(stepsVal, maxSteps = 100) {
    if (maxSteps <= 20) return map(stepsVal, 1, maxSteps, 0, 100);
    if (stepsVal <= 20) return map(stepsVal, 1, 20, 0, 50);
    return map(stepsVal, 20, maxSteps, 50, 100);
}

const defaultColorPresets = [
    { colors: ['#ffffff'], name: 'White' },
    { colors: ['#ff6b35', '#ff3366'], name: 'Sunset' },
    { colors: ['#ff3366', '#00d4ff'], name: 'Neon' },
    { colors: ['#00d4ff', '#ffffff'], name: 'Ice' },
    { colors: ['#ffcc00', '#ff6b35', '#ff3366'], name: 'Fire' },
    { colors: ['#00ff88', '#00d4ff', '#8855ff'], name: 'Aurora' }
];

const defaultBgPresets = [
    { colors: ['#000000'], dir: 'solid', name: 'Black' },
    { colors: ['#ffffff'], dir: 'solid', name: 'White' },
    { colors: ['#0a0a1a', '#1a1a3e'], dir: 'vertical', name: 'Night' },
    { colors: ['#1a0a2a', '#0a1a2a'], dir: 'horizontal', name: 'Deep' }
];

const state = {
    canvas: null, canvasWidth: 800, canvasHeight: 800,
    pattern: 'lines',
    ...JSON.parse(JSON.stringify(DEFAULTS)),
    colorPresets: [...defaultColorPresets],
    bgPresets: [...defaultBgPresets],
    layers: [], activeLayerId: null
};

// Utilities
function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 255, g: 255, b: 255 };
}

function lerpColor3(c1, c2, t) {
    return { r: Math.round(c1.r + (c2.r - c1.r) * t), g: Math.round(c1.g + (c2.g - c1.g) * t), b: Math.round(c1.b + (c2.b - c1.b) * t) };
}

function applyCurve(t, type) {
    if (type === 'easeIn') return t * t;
    if (type === 'easeOut') return 1 - (1 - t) * (1 - t);
    if (type === 'easeInOut') return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return t;
}

function getValueWithFade(range, rawT, fs, fe, curve, steps, mult) {
    const fStart = fs / 100, fEnd = fe / 100;

    // Apply steps (quantize time/progress) like color
    let t = rawT;
    if (steps && steps < 100) {
        t = Math.floor(t * steps) / (steps - 1);
        t = Math.min(1, t);
    }

    let val;
    if (t <= fStart) val = range.start;
    else if (t >= fEnd) val = range.end;
    else val = lerp(range.start, range.end, applyCurve((t - fStart) / (fEnd - fStart), curve));

    return val * (mult ?? 1);
}

function getGradientColor(colors, rawT, fadeStart, fadeEnd, steps) {
    if (colors.length === 1) return hexToRgb(colors[0]);

    // Apply fade position
    const fs = (fadeStart ?? 0) / 100, fe = (fadeEnd ?? 100) / 100;
    let t;
    if (rawT <= fs) t = 0;
    else if (rawT >= fe) t = 1;
    else t = (rawT - fs) / (fe - fs);

    // Apply steps (posterization)
    if (steps && steps < 100) {
        t = Math.floor(t * steps) / (steps - 1);
        t = Math.min(1, t);
    }

    const seg = (colors.length - 1) * t;
    const i = Math.floor(seg);
    return lerpColor3(hexToRgb(colors[Math.min(i, colors.length - 1)]), hexToRgb(colors[Math.min(i + 1, colors.length - 1)]), seg - i);
}

function getAxisProgress(col, row, cX, cY, axis) {
    const tx = cX > 1 ? col / (cX - 1) : 0.5, ty = cY > 1 ? row / (cY - 1) : 0.5;
    return axis === 'x' ? tx : axis === 'y' ? ty : (tx + ty) / 2;
}

// Layer System
function createLayerFromState() {
    const layer = { id: Date.now(), name: `Layer ${state.layers.length + 1}`, visible: true, pattern: state.pattern };
    ['count', 'weight', 'spacing', 'length', 'opacity'].forEach(p => {
        if (typeof state[p] === 'object') layer[p] = { ...state[p] };
        else layer[p] = state[p];
        ['Axis', 'FadeStart', 'FadeEnd', 'Curve', 'Mult', 'Steps', 'Fit'].forEach(s => {
            if (state[p + s] !== undefined) layer[p + s] = state[p + s];
        });
    });
    layer.colors = [...state.colors];
    layer.colorMode = state.colorMode;
    layer.colorAxis = state.colorAxis;
    layer.colorFadeStart = state.colorFadeStart;
    layer.colorFadeEnd = state.colorFadeEnd;
    layer.colorSteps = state.colorSteps;
    ['rotX', 'rotY', 'rotZ', 'posX', 'posY', 'scale'].forEach(p => layer[p] = state[p]);
    return layer;
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
    const i = state.layers.findIndex(l => l.id === id);
    if (i !== -1) {
        state.layers.splice(i, 1);
        if (state.activeLayerId === id) {
            state.activeLayerId = state.layers[state.layers.length - 1].id;
            loadLayerToState(getActiveLayer());
        }
        updateLayersUI();
    }
}

function getActiveLayer() { return state.layers.find(l => l.id === state.activeLayerId); }

function selectLayer(id) {
    state.activeLayerId = id;
    loadLayerToState(getActiveLayer());
    updateLayersUI();
}

function loadLayerToState(layer) {
    if (!layer) return;
    state.pattern = layer.pattern;
    ['count', 'weight', 'spacing', 'length', 'opacity'].forEach(p => {
        if (typeof layer[p] === 'object') state[p] = { ...layer[p] };
        else state[p] = layer[p];
        ['Axis', 'FadeStart', 'FadeEnd', 'Curve', 'Mult', 'Steps', 'Fit'].forEach(s => {
            if (layer[p + s] !== undefined) state[p + s] = layer[p + s];
        });
    });
    state.colors = [...layer.colors];
    state.colorMode = layer.colorMode;
    state.colorAxis = layer.colorAxis;
    state.colorFadeStart = layer.colorFadeStart ?? DEFAULTS.colorFadeStart;
    state.colorFadeEnd = layer.colorFadeEnd ?? DEFAULTS.colorFadeEnd;
    state.colorSteps = layer.colorSteps ?? DEFAULTS.colorSteps;
    ['rotX', 'rotY', 'rotZ', 'posX', 'posY', 'scale'].forEach(p => state[p] = layer[p]);
    syncUIWithState();
}

function saveStateToActiveLayer() {
    const layer = getActiveLayer();
    if (!layer) return;
    layer.pattern = state.pattern;
    ['count', 'weight', 'spacing', 'length', 'opacity'].forEach(p => {
        if (typeof state[p] === 'object') layer[p] = { ...state[p] };
        else layer[p] = state[p];
        ['Axis', 'FadeStart', 'FadeEnd', 'Curve', 'Mult', 'Steps', 'Fit'].forEach(s => {
            if (state[p + s] !== undefined) layer[p + s] = state[p + s];
        });
    });
    layer.colors = [...state.colors];
    layer.colorMode = state.colorMode;
    layer.colorAxis = state.colorAxis;
    layer.colorFadeStart = state.colorFadeStart;
    layer.colorFadeEnd = state.colorFadeEnd;
    layer.colorSteps = state.colorSteps;
    ['rotX', 'rotY', 'rotZ', 'posX', 'posY', 'scale'].forEach(p => layer[p] = state[p]);
    updateLayersUI();
}

function moveLayer(id, direction) {
    const idx = state.layers.findIndex(l => l.id === id);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= state.layers.length) return;
    [state.layers[idx], state.layers[newIdx]] = [state.layers[newIdx], state.layers[idx]];
    updateLayersUI();
}

function updateLayersUI() {
    const list = document.getElementById('layersList');
    if (!list) return;
    list.innerHTML = '';
    [...state.layers].reverse().forEach((layer, i) => {
        const realIdx = state.layers.length - 1 - i;
        const item = document.createElement('div');
        item.className = `layer-item${layer.id === state.activeLayerId ? ' active' : ''}`;
        item.innerHTML = `
            <div class="layer-visibility ${layer.visible ? 'visible' : ''}">${layer.visible ? '◉' : '○'}</div>
            <div class="layer-info">
                <div class="layer-name">${layer.name}</div>
                <div class="layer-pattern">${layer.pattern}</div>
            </div>
            <div class="layer-arrows">
                <button class="layer-arrow up" ${realIdx === state.layers.length - 1 ? 'disabled' : ''}>↑</button>
                <button class="layer-arrow down" ${realIdx === 0 ? 'disabled' : ''}>↓</button>
            </div>
            <button class="layer-delete">×</button>`;
        item.addEventListener('click', e => { if (!e.target.closest('.layer-visibility, .layer-delete, .layer-arrow')) selectLayer(layer.id); });
        item.querySelector('.layer-visibility').onclick = e => { e.stopPropagation(); layer.visible = !layer.visible; updateLayersUI(); };
        item.querySelector('.layer-delete').onclick = e => { e.stopPropagation(); deleteLayer(layer.id); };
        item.querySelector('.layer-arrow.up').onclick = e => { e.stopPropagation(); moveLayer(layer.id, 'up'); };
        item.querySelector('.layer-arrow.down').onclick = e => { e.stopPropagation(); moveLayer(layer.id, 'down'); };
        list.appendChild(item);
    });
}

// Pattern Renderers
function drawLines(layer) {
    const w = state.canvasWidth, h = state.canvasHeight, count = layer.count;

    // 1. Calculate Weights first (needed for Gap spacing)
    const weights = [];
    for (let i = 0; i < count; i++) {
        const indexT = count > 1 ? i / (count - 1) : 0.5;
        const axisT = layer.weightAxis === 'x' ? indexT : 0.5;
        weights.push(getValueWithFade(layer.weight, axisT, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve, layer.weightSteps, layer.weightMult));
    }

    // 2. Calculate Positions (Gap-based logic)
    // Position[i] is the CENTER of the element.
    // Distance between Center[i-1] and Center[i] = (Weight[i-1] / 2) + Gap + (Weight[i] / 2)
    let positions = [0];
    let cumulative = 0;
    const ABS_UNIT = 40; // Base gap unit. Spacing 1 = 40px Gap.

    for (let i = 1; i < count; i++) {
        const indexT = count > 1 ? i / (count - 1) : 0.5;
        const gapMult = getValueWithFade(layer.spacing, layer.spacingAxis === 'x' ? indexT : 0.5, layer.spacingFadeStart, layer.spacingFadeEnd, layer.spacingCurve, layer.spacingSteps, layer.spacingMult);
        const gap = gapMult * ABS_UNIT;

        const dist = (weights[i - 1] / 2) + gap + (weights[i] / 2);
        cumulative += dist;
        positions.push(cumulative);
    }

    const maxCenter = cumulative; // Position of last center (relative to first=0)
    const fit = layer.spacingFit ?? true;

    // 3. Layout Dimensions & Centering
    const paddingLeft = weights[0] / 2;
    const paddingRight = weights[count - 1] / 2;
    const totalBoundingWidth = maxCenter + paddingLeft + paddingRight;

    let startX = 0;
    if (!fit) {
        // Center the Bounding Box in the Canvas
        const leftEdge = (w - totalBoundingWidth) / 2;
        startX = leftEdge + paddingLeft;
    }

    for (let i = 0; i < count; i++) {
        const indexT = count > 1 ? i / (count - 1) : 0.5;
        let tx;

        if (fit) {
            tx = maxCenter > 0.0001 ? positions[i] / maxCenter : 0;
        } else {
            tx = (startX + positions[i]) / w;
        }

        const weight = weights[i];
        const lengthPct = getValueWithFade(layer.length, layer.lengthAxis === 'x' ? indexT : 0.5, layer.lengthFadeStart, layer.lengthFadeEnd, layer.lengthCurve, layer.lengthSteps, layer.lengthMult) / 100;
        const opacityVal = getValueWithFade(layer.opacity, layer.opacityAxis === 'x' ? indexT : 0.5, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve, layer.opacitySteps, layer.opacityMult);
        const col = layer.colorMode === 'solid' ? hexToRgb(layer.colors[0]) : getGradientColor(layer.colors, layer.colorAxis === 'x' ? indexT : 0.5, layer.colorFadeStart, layer.colorFadeEnd, layer.colorSteps);

        const x = tx * w, halfGap = (1 - lengthPct) / 2 * h;
        strokeWeight(max(0.5, weight));
        stroke(col.r, col.g, col.b, opacityVal / 100 * 255);
        line(x, halfGap, x, h - halfGap);
    }
}

function drawRadial(layer) {
    const w = state.canvasWidth, h = state.canvasHeight, cx = w / 2, cy = h / 2, count = layer.count, radius = Math.min(w, h) * 0.45;
    for (let i = 0; i < count; i++) {
        const t = i / count, angle = t * TWO_PI;
        const spacingMult = getValueWithFade(layer.spacing, t, layer.spacingFadeStart, layer.spacingFadeEnd, layer.spacingCurve, layer.spacingSteps, layer.spacingMult);
        const weight = getValueWithFade(layer.weight, t, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve, layer.weightSteps, layer.weightMult);
        const lengthPct = getValueWithFade(layer.length, t, layer.lengthFadeStart, layer.lengthFadeEnd, layer.lengthCurve, layer.lengthSteps, layer.lengthMult) / 100;
        const opacityVal = getValueWithFade(layer.opacity, t, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve, layer.opacitySteps, layer.opacityMult);
        const col = layer.colorMode === 'solid' ? hexToRgb(layer.colors[0]) : getGradientColor(layer.colors, t, layer.colorFadeStart, layer.colorFadeEnd, layer.colorSteps);
        strokeWeight(max(0.5, weight));
        stroke(col.r, col.g, col.b, opacityVal / 100 * 255);
        const outerR = radius * spacingMult;
        const innerR = outerR * (1 - lengthPct);
        line(cx + cos(angle) * innerR, cy + sin(angle) * innerR, cx + cos(angle) * outerR, cy + sin(angle) * outerR);
    }
}

function drawCircles(layer) {
    const w = state.canvasWidth, h = state.canvasHeight, cx = w / 2, cy = h / 2, count = layer.count, maxR = Math.min(w, h) * 0.45;
    noFill();
    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;
        const spacingMult = getValueWithFade(layer.spacing, t, layer.spacingFadeStart, layer.spacingFadeEnd, layer.spacingCurve, layer.spacingSteps, layer.spacingMult);
        const r = (t * 0.9 + 0.1) * maxR * spacingMult;
        const weight = getValueWithFade(layer.weight, t, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve, layer.weightSteps, layer.weightMult);
        const opacityVal = getValueWithFade(layer.opacity, t, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve, layer.opacitySteps, layer.opacityMult);
        const col = layer.colorMode === 'solid' ? hexToRgb(layer.colors[0]) : getGradientColor(layer.colors, t, layer.colorFadeStart, layer.colorFadeEnd, layer.colorSteps);
        strokeWeight(max(0.5, weight));
        stroke(col.r, col.g, col.b, opacityVal / 100 * 255);
        circle(cx, cy, r * 2);
    }
}

function drawGrid(layer) {
    const w = state.canvasWidth, h = state.canvasHeight, gs = Math.max(2, Math.round(sqrt(layer.count))), cW = w / gs, cH = h / gs;
    noFill();
    for (let row = 0; row < gs; row++) {
        for (let col = 0; col < gs; col++) {
            const st = getAxisProgress(col, row, gs, gs, layer.spacingAxis);
            const spacingMult = getValueWithFade(layer.spacing, st, layer.spacingFadeStart, layer.spacingFadeEnd, layer.spacingCurve, layer.spacingSteps, layer.spacingMult);
            const wt = getAxisProgress(col, row, gs, gs, layer.weightAxis);
            const weight = getValueWithFade(layer.weight, wt, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve, layer.weightSteps, layer.weightMult);
            const lt = getAxisProgress(col, row, gs, gs, layer.lengthAxis);
            const sizeMult = getValueWithFade(layer.length, lt, layer.lengthFadeStart, layer.lengthFadeEnd, layer.lengthCurve, layer.lengthSteps, layer.lengthMult) / 100;
            const ot = getAxisProgress(col, row, gs, gs, layer.opacityAxis);
            const opacityVal = getValueWithFade(layer.opacity, ot, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve, layer.opacitySteps, layer.opacityMult);
            const ct = getAxisProgress(col, row, gs, gs, layer.colorAxis);
            const c = layer.colorMode === 'solid' ? hexToRgb(layer.colors[0]) : getGradientColor(layer.colors, ct, layer.colorFadeStart, layer.colorFadeEnd, layer.colorSteps);
            strokeWeight(max(0.5, weight));
            stroke(c.r, c.g, c.b, opacityVal / 100 * 255);
            const rw = cW * sizeMult * spacingMult, rh = cH * sizeMult * spacingMult;
            const x = col * cW, y = row * cH;
            rect(x + (cW - rw) / 2, y + (cH - rh) / 2, rw, rh);
        }
    }
}

function drawDots(layer) {
    const w = state.canvasWidth, h = state.canvasHeight, gs = Math.max(2, Math.round(sqrt(layer.count))), cW = w / gs, cH = h / gs;
    noStroke();
    for (let row = 0; row < gs; row++) {
        for (let col = 0; col < gs; col++) {
            const st = getAxisProgress(col, row, gs, gs, layer.spacingAxis);
            const spacingMult = getValueWithFade(layer.spacing, st, layer.spacingFadeStart, layer.spacingFadeEnd, layer.spacingCurve, layer.spacingSteps, layer.spacingMult);
            const wt = getAxisProgress(col, row, gs, gs, layer.weightAxis);
            const dotSize = getValueWithFade(layer.weight, wt, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve, layer.weightSteps, layer.weightMult) * 2 * spacingMult;
            const ot = getAxisProgress(col, row, gs, gs, layer.opacityAxis);
            const opacityVal = getValueWithFade(layer.opacity, ot, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve, layer.opacitySteps, layer.opacityMult);
            const ct = getAxisProgress(col, row, gs, gs, layer.colorAxis);
            const c = layer.colorMode === 'solid' ? hexToRgb(layer.colors[0]) : getGradientColor(layer.colors, ct, layer.colorFadeStart, layer.colorFadeEnd, layer.colorSteps);
            fill(c.r, c.g, c.b, opacityVal / 100 * 255);
            circle(col * cW + cW / 2, row * cH + cH / 2, dotSize);
        }
    }
}

function drawTriangle(layer) {
    const w = state.canvasWidth, h = state.canvasHeight, count = layer.count;
    const topX = w / 2, topY = h * 0.1, leftY = h * 0.9;
    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;
        const spacingMult = getValueWithFade(layer.spacing, t, layer.spacingFadeStart, layer.spacingFadeEnd, layer.spacingCurve, layer.spacingSteps, layer.spacingMult);
        const adjustedT = t * spacingMult;
        const y = lerp(topY, leftY, Math.min(1, adjustedT)), progress = (y - topY) / (leftY - topY);
        const xLeft = lerp(topX, w * 0.1, progress), xRight = lerp(topX, w * 0.9, progress);
        const weight = getValueWithFade(layer.weight, t, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve, layer.weightSteps, layer.weightMult);
        const opacityVal = getValueWithFade(layer.opacity, t, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve, layer.opacitySteps, layer.opacityMult);
        const col = layer.colorMode === 'solid' ? hexToRgb(layer.colors[0]) : getGradientColor(layer.colors, t, layer.colorFadeStart, layer.colorFadeEnd, layer.colorSteps);
        strokeWeight(max(0.5, weight));
        stroke(col.r, col.g, col.b, opacityVal / 100 * 255);
        line(xLeft, y, xRight, y);
    }
}

function renderLayer(layer) {
    push();
    const w = state.canvasWidth, h = state.canvasHeight, cx = w / 2, cy = h / 2;
    translate(cx, cy);
    rotate(radians(layer.rotZ));
    scale(1, cos(radians(layer.rotX)));
    applyMatrix(1, 0, tan(radians(layer.rotY * 0.5)), 1, 0, 0);
    translate((layer.posX - 50) * w / 100, (layer.posY - 50) * h / 100);
    scale(layer.scale / 100);
    translate(-cx, -cy);
    const renderers = { lines: drawLines, radial: drawRadial, circles: drawCircles, grid: drawGrid, dots: drawDots, triangle: drawTriangle };
    if (renderers[layer.pattern]) renderers[layer.pattern](layer);
    pop();
}

function drawBackground() {
    const w = state.canvasWidth, h = state.canvasHeight, colors = state.bgColors;
    if (state.bgMode === 'solid' || colors.length === 1) {
        const c = hexToRgb(colors[0]);
        background(c.r, c.g, c.b);
    } else if (state.bgDir === 'vertical') {
        for (let y = 0; y < h; y++) { const c = getGradientColor(colors, y / h); stroke(c.r, c.g, c.b); line(0, y, w, y); }
    } else if (state.bgDir === 'horizontal') {
        for (let x = 0; x < w; x++) { const c = getGradientColor(colors, x / w); stroke(c.r, c.g, c.b); line(x, 0, x, h); }
    } else if (state.bgDir === 'radial') {
        const maxR = Math.max(w, h) * 0.7, cx = w / 2, cy = h / 2;
        noStroke();
        for (let r = maxR; r > 0; r -= 2) { const c = getGradientColor(colors, 1 - r / maxR); fill(c.r, c.g, c.b); circle(cx, cy, r * 2); }
    }
}

// p5.js
function setup() {
    state.canvas = createCanvas(state.canvasWidth, state.canvasHeight);
    state.canvas.parent('canvas');
    pixelDensity(2);
    frameRate(60);
    document.getElementById('resWidth').value = state.canvasWidth;
    document.getElementById('resHeight').value = state.canvasHeight;
    createLayer();
    initUI();
}

function draw() {
    drawBackground();
    state.layers.forEach(layer => { if (layer.visible) renderLayer(layer); });
}

// UI Init
function initUI() {
    // Patterns
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

    // Range controls
    ['weight', 'spacing', 'length', 'opacity'].forEach(param => {
        setupRangeControl(param);
        setupAxisToggle(param);
        setupFadePosition(param);
    });

    // Colors
    setupColorSystem();
    setupBgSystem();

    // Transform
    ['rotX', 'rotY', 'rotZ', 'posX', 'posY', 'scale'].forEach(param => {
        const slider = document.getElementById(param);
        const input = document.getElementById(`${param}Value`);
        if (slider && input) {
            slider.oninput = () => { state[param] = parseFloat(slider.value); input.value = slider.value; saveStateToActiveLayer(); };
            input.oninput = () => { state[param] = parseFloat(input.value) || 0; slider.value = state[param]; saveStateToActiveLayer(); };
        }
    });

    // Resolution
    document.getElementById('resApply').onclick = applyResolution;

    // Resets
    document.querySelectorAll('.resetable').forEach(el => el.addEventListener('dblclick', () => resetAttribute(el.dataset.reset)));

    // Layers
    document.getElementById('addLayerBtn').onclick = createLayer;

    // Toolbar
    document.getElementById('resetBtn').onclick = resetAll;
    document.getElementById('randomBtn').onclick = randomize;
    document.getElementById('exportPng').onclick = () => saveCanvas('vector-lab-' + Date.now(), 'png');
    document.getElementById('saveJson').onclick = saveProject;
    document.getElementById('loadJson').onchange = loadProject;

    // Keyboard
    document.onkeydown = e => {
        if (e.target.matches('input, select')) return;
        if (e.code === 'Space') { e.preventDefault(); randomize(); }
        if (e.code === 'KeyR') resetAll();
    };

    updateColorStops();
    updateBgStops();
    renderColorPresets();
    renderBgPresets();
}

function setupSingleControl(param, inputId, sliderId) {
    const input = document.getElementById(inputId), slider = document.getElementById(sliderId);
    input.oninput = () => {
        slider.value = input.value;
        state[param] = parseFloat(input.value);
        if (param === 'count') updateStepsLimit(state.count);
        saveStateToActiveLayer();
    };
    slider.oninput = () => {
        input.value = slider.value;
        state[param] = parseFloat(slider.value);
        if (param === 'count') updateStepsLimit(state.count);
        saveStateToActiveLayer();
    };
}

function setupRangeControl(param) {
    const sI = document.getElementById(`${param}Start`), eI = document.getElementById(`${param}End`);
    const sS = document.getElementById(`${param}SliderStart`), eS = document.getElementById(`${param}SliderEnd`);
    const range = document.getElementById(`${param}Range`);
    function update() {
        const min = parseFloat(sS.min), max = parseFloat(sS.max);
        const startPct = ((parseFloat(sS.value) - min) / (max - min)) * 100;
        const endPct = ((parseFloat(eS.value) - min) / (max - min)) * 100;
        range.style.left = `${Math.min(startPct, endPct)}%`;
        range.style.right = `${100 - Math.max(startPct, endPct)}%`;
        state[param] = { start: parseFloat(sS.value), end: parseFloat(eS.value) };
        saveStateToActiveLayer();
    }
    sI.oninput = () => { sS.value = sI.value; update(); };
    eI.oninput = () => { eS.value = eI.value; update(); };
    sS.oninput = () => { sI.value = sS.value; update(); };
    eS.oninput = () => { eI.value = eS.value; update(); };
    update();
}

function setupAxisToggle(param) {
    const toggle = document.querySelector(`.axis-toggle[data-param="${param}"]`);
    if (!toggle) return;
    toggle.querySelectorAll('.axis-btn').forEach(btn => {
        btn.onclick = () => {
            toggle.querySelectorAll('.axis-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state[`${param}Axis`] = btn.dataset.axis;
            saveStateToActiveLayer();
        };
    });
}

function setupFadePosition(param) {
    const fs = document.getElementById(`${param}FadeStart`), fe = document.getElementById(`${param}FadeEnd`), curve = document.getElementById(`${param}Curve`);
    if (fs) fs.oninput = () => { state[`${param}FadeStart`] = parseFloat(fs.value); saveStateToActiveLayer(); };
    if (fe) fe.oninput = () => { state[`${param}FadeEnd`] = parseFloat(fe.value); saveStateToActiveLayer(); };

    const mult = document.getElementById(`${param}Mult`);
    const steps = document.getElementById(`${param}Steps`);
    const stepsInput = document.getElementById(`${param}StepsInput`);

    if (mult) mult.oninput = () => { state[`${param}Mult`] = parseFloat(mult.value); saveStateToActiveLayer(); };
    if (steps) steps.oninput = () => {
        const maxVal = state.count || 100;
        const val = toLogSteps(parseInt(steps.value), maxVal);
        state[`${param}Steps`] = val;
        if (stepsInput) stepsInput.value = val;
        saveStateToActiveLayer();
    };
    if (stepsInput) stepsInput.oninput = () => {
        const maxVal = state.count || 100;
        let val = parseInt(stepsInput.value);
        if (val < 1) val = 1; if (val > maxVal) val = maxVal;
        state[`${param}Steps`] = val;
        if (steps) steps.value = fromLogSteps(val, maxVal);
        saveStateToActiveLayer();
    };

    if (param === 'spacing') {
        const fitBtn = document.getElementById('spacingFitBtn');
        if (fitBtn) fitBtn.onclick = () => {
            state.spacingFit = !state.spacingFit;
            syncUIWithState();
            saveStateToActiveLayer();
        };
    }
}

function updateStepsLimit(maxVal) {
    if (!maxVal) maxVal = 100;
    ['weight', 'spacing', 'length', 'opacity', 'color'].forEach(p => {
        const input = document.getElementById(`${p}StepsInput`);
        const slider = document.getElementById(`${p}Steps`);

        if (input) input.max = maxVal;

        const stepsKey = p === 'color' ? 'colorSteps' : `${p}Steps`;
        let current = state[stepsKey];

        // Clamp if current exceeds new max
        if (current > maxVal) {
            state[stepsKey] = maxVal;
            current = maxVal;
            if (input) input.value = current;
        }

        // Update slider position to reflect current steps within new range
        if (slider) slider.value = fromLogSteps(current, maxVal);
    });
}



// Color System
function setupColorSystem() {
    document.getElementById('colorModeSolid').onclick = () => { state.colorMode = 'solid'; updateColorMode(); saveStateToActiveLayer(); };
    document.getElementById('colorModeFade').onclick = () => { state.colorMode = 'fade'; updateColorMode(); saveStateToActiveLayer(); };
    document.getElementById('addColorStop').onclick = () => { state.colors.push('#ffffff'); updateColorStops(); saveStateToActiveLayer(); };
    document.getElementById('saveColorPreset').onclick = saveColorPreset;
    setupAxisToggle('color');

    // Color fade position
    const cfs = document.getElementById('colorFadeStart'), cfe = document.getElementById('colorFadeEnd');
    if (cfs) cfs.oninput = () => { state.colorFadeStart = parseFloat(cfs.value); saveStateToActiveLayer(); };
    if (cfe) cfe.oninput = () => { state.colorFadeEnd = parseFloat(cfe.value); saveStateToActiveLayer(); };

    // Color steps
    const stepsSlider = document.getElementById('colorSteps'), stepsInput = document.getElementById('colorStepsInput');
    if (stepsSlider) stepsSlider.oninput = () => {
        const maxVal = state.count || 100;
        state.colorSteps = toLogSteps(parseInt(stepsSlider.value), maxVal);
        if (stepsInput) stepsInput.value = state.colorSteps;
        saveStateToActiveLayer();
    };
    if (stepsInput) stepsInput.oninput = () => {
        const maxVal = state.count || 100;
        let val = parseInt(stepsInput.value);
        if (val < 1) val = 1; if (val > maxVal) val = maxVal;
        state.colorSteps = val;
        if (stepsSlider) stepsSlider.value = fromLogSteps(val, maxVal);
        saveStateToActiveLayer();
    };
}

function updateColorMode() {
    document.getElementById('colorModeSolid').classList.toggle('active', state.colorMode === 'solid');
    document.getElementById('colorModeFade').classList.toggle('active', state.colorMode === 'fade');
    document.getElementById('colorAxisToggle').classList.toggle('hidden', state.colorMode === 'solid');
    document.getElementById('colorFadeControls').classList.toggle('hidden', state.colorMode === 'solid');
}

function updateColorStops() {
    const container = document.getElementById('colorStops');
    container.innerHTML = '';
    state.colors.forEach((color, i) => {
        const stop = document.createElement('div');
        stop.className = 'color-stop';
        stop.innerHTML = `<input type="color" value="${color}">${state.colors.length > 1 ? '<button class="remove-stop">×</button>' : ''}`;
        stop.querySelector('input').oninput = e => { state.colors[i] = e.target.value; updateGradientPreview(); saveStateToActiveLayer(); };
        const rm = stop.querySelector('.remove-stop');
        if (rm) rm.onclick = () => { state.colors.splice(i, 1); updateColorStops(); saveStateToActiveLayer(); };
        container.appendChild(stop);
    });
    updateGradientPreview();
}

function updateGradientPreview() {
    const bar = document.getElementById('colorGradientPreview');
    bar.style.background = state.colors.length === 1 ? state.colors[0] : `linear-gradient(90deg, ${state.colors.join(', ')})`;
}

function renderColorPresets() {
    const container = document.getElementById('colorPresets');
    container.innerHTML = '';
    state.colorPresets.forEach((preset, i) => {
        const btn = document.createElement('button');
        btn.className = 'color-preset';
        btn.style.background = preset.colors.length === 1 ? preset.colors[0] : `linear-gradient(135deg, ${preset.colors.join(', ')})`;
        btn.title = preset.name;
        if (i >= defaultColorPresets.length) btn.innerHTML = '<button class="delete-preset">×</button>';
        btn.onclick = e => {
            if (e.target.classList.contains('delete-preset')) { state.colorPresets.splice(i, 1); renderColorPresets(); return; }
            state.colors = [...preset.colors];
            state.colorMode = preset.colors.length > 1 ? 'fade' : 'solid';
            updateColorStops(); updateColorMode(); saveStateToActiveLayer();
        };
        container.appendChild(btn);
    });
}

function saveColorPreset() {
    state.colorPresets.push({ colors: [...state.colors], name: `Custom ${state.colorPresets.length + 1}` });
    renderColorPresets();
}

// Background System
function setupBgSystem() {
    document.getElementById('bgModeSolid').onclick = () => { state.bgMode = 'solid'; updateBgMode(); };
    document.getElementById('bgModeFade').onclick = () => { state.bgMode = 'fade'; updateBgMode(); };
    document.getElementById('addBgStop').onclick = () => { state.bgColors.push('#333333'); updateBgStops(); };
    document.getElementById('saveBgPreset').onclick = saveBgPreset;
    document.querySelectorAll('.bg-direction .dir-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.bg-direction .dir-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.bgDir = btn.dataset.dir;
        };
    });
}

function updateBgMode() {
    document.getElementById('bgModeSolid').classList.toggle('active', state.bgMode === 'solid');
    document.getElementById('bgModeFade').classList.toggle('active', state.bgMode === 'fade');
    document.getElementById('bgDirectionContainer').classList.toggle('hidden', state.bgMode === 'solid');
}

function updateBgStops() {
    const container = document.getElementById('bgStops');
    container.innerHTML = '';
    state.bgColors.forEach((color, i) => {
        const stop = document.createElement('div');
        stop.className = 'color-stop';
        stop.innerHTML = `<input type="color" value="${color}">${state.bgColors.length > 1 ? '<button class="remove-stop">×</button>' : ''}`;
        stop.querySelector('input').oninput = e => { state.bgColors[i] = e.target.value; updateBgPreview(); };
        const rm = stop.querySelector('.remove-stop');
        if (rm) rm.onclick = () => { state.bgColors.splice(i, 1); updateBgStops(); };
        container.appendChild(stop);
    });
    updateBgPreview();
}

function updateBgPreview() {
    const bar = document.getElementById('bgGradientPreview');
    bar.style.background = state.bgColors.length === 1 ? state.bgColors[0] : `linear-gradient(90deg, ${state.bgColors.join(', ')})`;
}

function renderBgPresets() {
    const container = document.getElementById('bgPresets');
    container.innerHTML = '';
    state.bgPresets.forEach((preset, i) => {
        const btn = document.createElement('button');
        btn.className = 'color-preset';
        btn.style.background = preset.colors.length === 1 ? preset.colors[0] : `linear-gradient(135deg, ${preset.colors.join(', ')})`;
        btn.title = preset.name;
        if (i >= defaultBgPresets.length) btn.innerHTML = '<button class="delete-preset">×</button>';
        btn.onclick = e => {
            if (e.target.classList.contains('delete-preset')) { state.bgPresets.splice(i, 1); renderBgPresets(); return; }
            state.bgColors = [...preset.colors];
            state.bgMode = preset.colors.length > 1 ? 'fade' : 'solid';
            state.bgDir = preset.dir || 'vertical';
            updateBgStops(); updateBgMode();
        };
        container.appendChild(btn);
    });
}

function saveBgPreset() {
    state.bgPresets.push({ colors: [...state.bgColors], dir: state.bgDir, name: `Custom ${state.bgPresets.length + 1}` });
    renderBgPresets();
}

function applyResolution() {
    const w = parseInt(document.getElementById('resWidth').value) || 800;
    const h = parseInt(document.getElementById('resHeight').value) || 800;
    state.canvasWidth = constrain(w, 100, 4000);
    state.canvasHeight = constrain(h, 100, 4000);
    resizeCanvas(state.canvasWidth, state.canvasHeight);
}

function syncUIWithState() {
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.pattern === state.pattern));
    document.getElementById('countValue').value = state.count;
    document.getElementById('countSlider').value = state.count;
    // Dynamic Steps Limit Update
    updateStepsLimit(state.count);

    ['weight', 'spacing', 'length', 'opacity'].forEach(p => {
        document.getElementById(`${p}Start`).value = state[p].start;
        document.getElementById(`${p}End`).value = state[p].end;
        document.getElementById(`${p}SliderStart`).value = state[p].start;
        document.getElementById(`${p}SliderEnd`).value = state[p].end;
        document.getElementById(`${p}FadeStart`).value = state[`${p}FadeStart`];
        document.getElementById(`${p}FadeEnd`).value = state[`${p}FadeEnd`];
        document.getElementById(`${p}Curve`).value = state[`${p}Curve`];
        const mult = document.getElementById(`${p}Mult`);
        const steps = document.getElementById(`${p}Steps`);
        const stepsInput = document.getElementById(`${p}StepsInput`);
        if (mult) mult.value = state[`${p}Mult`] ?? 1;
        if (steps) steps.value = fromLogSteps(state[`${p}Steps`] ?? 100, state.count);
        if (stepsInput) stepsInput.value = state[`${p}Steps`] ?? 100;
    });
    // Spacing Fit Sync
    const fitBtn = document.getElementById('spacingFitBtn');
    if (fitBtn) fitBtn.classList.toggle('active', state.spacingFit ?? true);

    ['rotX', 'rotY', 'rotZ', 'posX', 'posY', 'scale'].forEach(p => {
        const s = document.getElementById(p), i = document.getElementById(`${p}Value`);
        if (s) s.value = state[p];
        if (i) i.value = state[p];
    });
    // Color fade sync
    const cfs = document.getElementById('colorFadeStart'), cfe = document.getElementById('colorFadeEnd');
    const stepsSlider = document.getElementById('colorSteps'), stepsInput = document.getElementById('colorStepsInput');
    if (cfs) cfs.value = state.colorFadeStart;
    if (cfe) cfe.value = state.colorFadeEnd;
    if (stepsSlider) stepsSlider.value = fromLogSteps(state.colorSteps, state.count);
    if (stepsInput) stepsInput.value = state.colorSteps;
    updateColorStops();
    updateColorMode();
}

function resetAttribute(param) {
    if (param === 'count') state.count = DEFAULTS.count;
    else if (['weight', 'spacing', 'length', 'opacity'].includes(param)) {
        state[param] = { ...DEFAULTS[param] };
        state[`${param}FadeStart`] = DEFAULTS[`${param}FadeStart`];
        state[`${param}FadeEnd`] = DEFAULTS[`${param}FadeEnd`];
        state[`${param}Curve`] = DEFAULTS[`${param}Curve`];
        state[`${param}Mult`] = DEFAULTS[`${param}Mult`];
        state[`${param}Steps`] = DEFAULTS[`${param}Steps`];
        if (param === 'spacing') state.spacingFit = DEFAULTS.spacingFit;
    }
    else if (['rotX', 'rotY', 'rotZ', 'posX', 'posY', 'scale'].includes(param)) state[param] = DEFAULTS[param];
    else if (param === 'color') { state.colors = [...DEFAULTS.colors]; state.colorMode = 'solid'; }
    else if (param === 'bg') { state.bgColors = [...DEFAULTS.bgColors]; state.bgMode = 'solid'; }
    syncUIWithState();
    saveStateToActiveLayer();
}

function resetAll() {
    Object.keys(DEFAULTS).forEach(k => {
        if (Array.isArray(DEFAULTS[k])) state[k] = [...DEFAULTS[k]];
        else if (typeof DEFAULTS[k] === 'object') state[k] = { ...DEFAULTS[k] };
        else state[k] = DEFAULTS[k];
    });
    syncUIWithState();
    updateBgStops();
    updateBgMode();
    saveStateToActiveLayer();
}

function randomize() {
    const patterns = ['lines', 'radial', 'circles', 'grid', 'dots', 'triangle'];
    state.pattern = patterns[floor(random(patterns.length))];
    state.count = floor(random(10, 60));
    state.weight = { start: random(0.5, 15), end: random(0.5, 15) };
    state.spacing = { start: random(0.5, 2), end: random(0.5, 2) };
    state.length = { start: random(50, 100), end: random(50, 100) };
    state.opacity = { start: random(60, 100), end: random(60, 100) };
    const preset = state.colorPresets[floor(random(state.colorPresets.length))];
    state.colors = [...preset.colors];
    state.colorMode = preset.colors.length > 1 ? 'fade' : 'solid';
    state.rotZ = floor(random(-90, 90));
    syncUIWithState();
    saveStateToActiveLayer();
}

function saveProject() {
    const project = { version: '5.0', resolution: { width: state.canvasWidth, height: state.canvasHeight }, bg: { colors: state.bgColors, mode: state.bgMode, dir: state.bgDir }, layers: state.layers, colorPresets: state.colorPresets, bgPresets: state.bgPresets };
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
    reader.onload = event => {
        try {
            const p = JSON.parse(event.target.result);
            if (p.resolution) { state.canvasWidth = p.resolution.width; state.canvasHeight = p.resolution.height; resizeCanvas(state.canvasWidth, state.canvasHeight); }
            if (p.bg) { state.bgColors = p.bg.colors; state.bgMode = p.bg.mode || 'solid'; state.bgDir = p.bg.dir || 'vertical'; updateBgStops(); updateBgMode(); }
            if (p.layers) { state.layers = p.layers; state.activeLayerId = state.layers[0].id; loadLayerToState(getActiveLayer()); updateLayersUI(); }
            if (p.colorPresets) { state.colorPresets = p.colorPresets; renderColorPresets(); }
            if (p.bgPresets) { state.bgPresets = p.bgPresets; renderBgPresets(); }
        } catch (err) { alert('Error: ' + err.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
}
