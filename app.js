/**
 * VECTOR.LAB — 80s Pattern Generator
 */

const DEFAULTS = {
    count: 20, countRate: 0, countRateCurve: 'sine',
    weight: { start: 2, end: 2 }, weightAxis: 'x', weightFadeStart: 0, weightFadeEnd: 100, weightCurve: 'linear', weightRate: 0, weightRateCurve: 'sine',
    spacing: { start: 1, end: 1 }, spacingAxis: 'x', spacingFadeStart: 0, spacingFadeEnd: 100, spacingCurve: 'linear', spacingRate: 0, spacingRateCurve: 'sine',
    length: { start: 100, end: 100 }, lengthAxis: 'x', lengthFadeStart: 0, lengthFadeEnd: 100, lengthCurve: 'linear', lengthRate: 0, lengthRateCurve: 'sine',
    opacity: { start: 100, end: 100 }, opacityAxis: 'x', opacityFadeStart: 0, opacityFadeEnd: 100, opacityCurve: 'linear', opacityRate: 0, opacityRateCurve: 'sine',
    colors: ['#ffffff'], colorMode: 'solid', colorAxis: 'x',
    rotX: 0, rotY: 0, rotZ: 0, posX: 50, posY: 50, scale: 100,
    bgColors: ['#000000'], bgMode: 'solid', bgDir: 'vertical'
};

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
    canvas: null, canvasWidth: 800, canvasHeight: 800, time: 0,
    pattern: 'lines',
    ...JSON.parse(JSON.stringify(DEFAULTS)),
    colorPresets: [...defaultColorPresets],
    bgPresets: [...defaultBgPresets],
    layers: [], activeLayerId: null, draggedLayerId: null
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

function getWaveValue(type, phase) {
    const p = phase % 1;
    if (type === 'sine') return (Math.sin(p * TWO_PI) + 1) / 2;
    if (type === 'triangle') return p < 0.5 ? p * 2 : 2 - p * 2;
    if (type === 'square') return p < 0.5 ? 1 : 0;
    if (type === 'saw') return p;
    return 0;
}

function getValueWithFade(range, rawT, fs, fe, curve, rate, rateCurve) {
    let baseStart = range.start, baseEnd = range.end;
    if (rate > 0) {
        const wave = getWaveValue(rateCurve, state.time * rate);
        const mid = (range.start + range.end) / 2;
        const amp = Math.abs(range.end - range.start) / 2 || mid * 0.5;
        baseStart = mid + amp * (wave - 0.5);
        baseEnd = mid - amp * (wave - 0.5);
    }
    const fStart = fs / 100, fEnd = fe / 100;
    if (rawT <= fStart) return baseStart;
    if (rawT >= fEnd) return baseEnd;
    return lerp(baseStart, baseEnd, applyCurve((rawT - fStart) / (fEnd - fStart), curve));
}

function getGradientColor(colors, t) {
    if (colors.length === 1) return hexToRgb(colors[0]);
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
        ['Axis', 'FadeStart', 'FadeEnd', 'Curve', 'Rate', 'RateCurve'].forEach(s => {
            if (state[p + s] !== undefined) layer[p + s] = state[p + s];
        });
    });
    layer.colors = [...state.colors];
    layer.colorMode = state.colorMode;
    layer.colorAxis = state.colorAxis;
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
        ['Axis', 'FadeStart', 'FadeEnd', 'Curve', 'Rate', 'RateCurve'].forEach(s => {
            if (layer[p + s] !== undefined) state[p + s] = layer[p + s];
        });
    });
    state.colors = [...layer.colors];
    state.colorMode = layer.colorMode;
    state.colorAxis = layer.colorAxis;
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
        ['Axis', 'FadeStart', 'FadeEnd', 'Curve', 'Rate', 'RateCurve'].forEach(s => {
            if (state[p + s] !== undefined) layer[p + s] = state[p + s];
        });
    });
    layer.colors = [...state.colors];
    layer.colorMode = state.colorMode;
    layer.colorAxis = state.colorAxis;
    ['rotX', 'rotY', 'rotZ', 'posX', 'posY', 'scale'].forEach(p => layer[p] = state[p]);
    updateLayersUI();
}

function updateLayersUI() {
    const list = document.getElementById('layersList');
    if (!list) return;
    list.innerHTML = '';
    [...state.layers].reverse().forEach(layer => {
        const item = document.createElement('div');
        item.className = `layer-item${layer.id === state.activeLayerId ? ' active' : ''}`;
        item.draggable = true;
        item.innerHTML = `<div class="layer-visibility ${layer.visible ? 'visible' : ''}">${layer.visible ? '◉' : '○'}</div><div class="layer-info"><div class="layer-name">${layer.name}</div><div class="layer-pattern">${layer.pattern}</div></div><button class="layer-delete">×</button>`;
        item.addEventListener('click', e => { if (!e.target.closest('.layer-visibility, .layer-delete')) selectLayer(layer.id); });
        item.querySelector('.layer-visibility').onclick = e => { e.stopPropagation(); layer.visible = !layer.visible; updateLayersUI(); };
        item.querySelector('.layer-delete').onclick = e => { e.stopPropagation(); deleteLayer(layer.id); };
        list.appendChild(item);
    });
}

// Pattern Renderers
function drawLines(layer) {
    const w = state.canvasWidth, h = state.canvasHeight, count = layer.count;
    for (let i = 0; i < count; i++) {
        const tx = count > 1 ? i / (count - 1) : 0.5;
        const weight = getValueWithFade(layer.weight, layer.weightAxis === 'x' ? tx : 0.5, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve, layer.weightRate, layer.weightRateCurve);
        const lengthPct = getValueWithFade(layer.length, layer.lengthAxis === 'x' ? tx : 0.5, layer.lengthFadeStart, layer.lengthFadeEnd, layer.lengthCurve, layer.lengthRate, layer.lengthRateCurve) / 100;
        const opacityVal = getValueWithFade(layer.opacity, layer.opacityAxis === 'x' ? tx : 0.5, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve, layer.opacityRate, layer.opacityRateCurve);
        const col = layer.colorMode === 'solid' ? hexToRgb(layer.colors[0]) : getGradientColor(layer.colors, layer.colorAxis === 'x' ? tx : 0.5);
        const x = tx * w, halfGap = (1 - lengthPct) / 2 * h;
        strokeWeight(max(0.5, weight));
        stroke(col.r, col.g, col.b, opacityVal / 100 * 255);
        line(x, halfGap, x, h - halfGap);
    }
}

function drawRadial(layer) {
    const w = state.canvasWidth, h = state.canvasHeight, cx = w / 2, cy = h / 2, count = layer.count, radius = Math.min(w, h) * 0.7;
    for (let i = 0; i < count; i++) {
        const t = i / count, angle = t * TWO_PI;
        const weight = getValueWithFade(layer.weight, t, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve, layer.weightRate, layer.weightRateCurve);
        const lengthPct = getValueWithFade(layer.length, t, layer.lengthFadeStart, layer.lengthFadeEnd, layer.lengthCurve, layer.lengthRate, layer.lengthRateCurve) / 100;
        const opacityVal = getValueWithFade(layer.opacity, t, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve, layer.opacityRate, layer.opacityRateCurve);
        const col = layer.colorMode === 'solid' ? hexToRgb(layer.colors[0]) : getGradientColor(layer.colors, t);
        strokeWeight(max(0.5, weight));
        stroke(col.r, col.g, col.b, opacityVal / 100 * 255);
        const innerR = radius * (1 - lengthPct);
        line(cx + cos(angle) * innerR, cy + sin(angle) * innerR, cx + cos(angle) * radius, cy + sin(angle) * radius);
    }
}

function drawCircles(layer) {
    const w = state.canvasWidth, h = state.canvasHeight, cx = w / 2, cy = h / 2, count = layer.count, maxR = Math.min(w, h) * 0.45;
    noFill();
    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5, r = (t * 0.9 + 0.1) * maxR;
        const weight = getValueWithFade(layer.weight, t, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve, layer.weightRate, layer.weightRateCurve);
        const opacityVal = getValueWithFade(layer.opacity, t, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve, layer.opacityRate, layer.opacityRateCurve);
        const col = layer.colorMode === 'solid' ? hexToRgb(layer.colors[0]) : getGradientColor(layer.colors, t);
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
            const wt = getAxisProgress(col, row, gs, gs, layer.weightAxis);
            const weight = getValueWithFade(layer.weight, wt, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve, layer.weightRate, layer.weightRateCurve);
            const lt = getAxisProgress(col, row, gs, gs, layer.lengthAxis);
            const sizeMult = getValueWithFade(layer.length, lt, layer.lengthFadeStart, layer.lengthFadeEnd, layer.lengthCurve, layer.lengthRate, layer.lengthRateCurve) / 100;
            const ot = getAxisProgress(col, row, gs, gs, layer.opacityAxis);
            const opacityVal = getValueWithFade(layer.opacity, ot, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve, layer.opacityRate, layer.opacityRateCurve);
            const ct = getAxisProgress(col, row, gs, gs, layer.colorAxis);
            const c = layer.colorMode === 'solid' ? hexToRgb(layer.colors[0]) : getGradientColor(layer.colors, ct);
            strokeWeight(max(0.5, weight));
            stroke(c.r, c.g, c.b, opacityVal / 100 * 255);
            const x = col * cW, y = row * cH, rw = cW * sizeMult, rh = cH * sizeMult;
            rect(x + (cW - rw) / 2, y + (cH - rh) / 2, rw, rh);
        }
    }
}

function drawDots(layer) {
    const w = state.canvasWidth, h = state.canvasHeight, gs = Math.max(2, Math.round(sqrt(layer.count))), cW = w / gs, cH = h / gs;
    noStroke();
    for (let row = 0; row < gs; row++) {
        for (let col = 0; col < gs; col++) {
            const wt = getAxisProgress(col, row, gs, gs, layer.weightAxis);
            const dotSize = getValueWithFade(layer.weight, wt, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve, layer.weightRate, layer.weightRateCurve) * 2;
            const ot = getAxisProgress(col, row, gs, gs, layer.opacityAxis);
            const opacityVal = getValueWithFade(layer.opacity, ot, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve, layer.opacityRate, layer.opacityRateCurve);
            const ct = getAxisProgress(col, row, gs, gs, layer.colorAxis);
            const c = layer.colorMode === 'solid' ? hexToRgb(layer.colors[0]) : getGradientColor(layer.colors, ct);
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
        const y = lerp(topY, leftY, t), progress = (y - topY) / (leftY - topY);
        const xLeft = lerp(topX, w * 0.1, progress), xRight = lerp(topX, w * 0.9, progress);
        const weight = getValueWithFade(layer.weight, t, layer.weightFadeStart, layer.weightFadeEnd, layer.weightCurve, layer.weightRate, layer.weightRateCurve);
        const opacityVal = getValueWithFade(layer.opacity, t, layer.opacityFadeStart, layer.opacityFadeEnd, layer.opacityCurve, layer.opacityRate, layer.opacityRateCurve);
        const col = layer.colorMode === 'solid' ? hexToRgb(layer.colors[0]) : getGradientColor(layer.colors, t);
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
    state.time += deltaTime * 0.001;
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
    setupRatePanel('count');

    // Range controls
    ['weight', 'spacing', 'length', 'opacity'].forEach(param => {
        setupRangeControl(param);
        setupAxisToggle(param);
        setupFadePosition(param);
        setupRatePanel(param);
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
    input.oninput = () => { slider.value = input.value; state[param] = parseFloat(input.value); saveStateToActiveLayer(); };
    slider.oninput = () => { input.value = slider.value; state[param] = parseFloat(slider.value); saveStateToActiveLayer(); };
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
    if (curve) curve.onchange = () => { state[`${param}Curve`] = curve.value; saveStateToActiveLayer(); };
}

function setupRatePanel(param) {
    const btn = document.querySelector(`.rate-btn[data-param="${param}"]`);
    const panel = document.getElementById(`${param}RatePanel`);
    const rateInput = document.getElementById(`${param}Rate`);
    const rateCurve = document.getElementById(`${param}RateCurve`);
    if (btn && panel) {
        btn.onclick = () => { btn.classList.toggle('active'); panel.classList.toggle('hidden'); };
    }
    if (rateInput) rateInput.oninput = () => { state[`${param}Rate`] = parseFloat(rateInput.value); saveStateToActiveLayer(); };
    if (rateCurve) rateCurve.onchange = () => { state[`${param}RateCurve`] = rateCurve.value; saveStateToActiveLayer(); };
}

// Color System
function setupColorSystem() {
    document.getElementById('colorModeSolid').onclick = () => { state.colorMode = 'solid'; updateColorMode(); saveStateToActiveLayer(); };
    document.getElementById('colorModeFade').onclick = () => { state.colorMode = 'fade'; updateColorMode(); saveStateToActiveLayer(); };
    document.getElementById('addColorStop').onclick = () => { state.colors.push('#ffffff'); updateColorStops(); saveStateToActiveLayer(); };
    document.getElementById('saveColorPreset').onclick = saveColorPreset;
    setupAxisToggle('color');
}

function updateColorMode() {
    document.getElementById('colorModeSolid').classList.toggle('active', state.colorMode === 'solid');
    document.getElementById('colorModeFade').classList.toggle('active', state.colorMode === 'fade');
    document.getElementById('colorAxisToggle').classList.toggle('hidden', state.colorMode === 'solid');
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
    ['weight', 'spacing', 'length', 'opacity'].forEach(p => {
        document.getElementById(`${p}Start`).value = state[p].start;
        document.getElementById(`${p}End`).value = state[p].end;
        document.getElementById(`${p}SliderStart`).value = state[p].start;
        document.getElementById(`${p}SliderEnd`).value = state[p].end;
        document.getElementById(`${p}FadeStart`).value = state[`${p}FadeStart`];
        document.getElementById(`${p}FadeEnd`).value = state[`${p}FadeEnd`];
        document.getElementById(`${p}Curve`).value = state[`${p}Curve`];
    });
    ['rotX', 'rotY', 'rotZ', 'posX', 'posY', 'scale'].forEach(p => {
        const s = document.getElementById(p), i = document.getElementById(`${p}Value`);
        if (s) s.value = state[p];
        if (i) i.value = state[p];
    });
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
        state[`${param}Rate`] = DEFAULTS[`${param}Rate`];
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
    state.spacing = { start: random(0.3, 2), end: random(0.3, 2) };
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
    const project = { version: '4.0', resolution: { width: state.canvasWidth, height: state.canvasHeight }, bg: { colors: state.bgColors, mode: state.bgMode, dir: state.bgDir }, layers: state.layers, colorPresets: state.colorPresets, bgPresets: state.bgPresets };
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
