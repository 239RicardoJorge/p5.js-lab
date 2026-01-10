/**
 * VECTOR.LAB — 80s Pattern Generator
 * Refactored for Grid System (Cols x Rows) & Split X/Y Control
 */

// --- UTILS (Vanilla to avoid p5 scope issues) ---
function mapV(n, start1, stop1, start2, stop2) {
    return ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
}
function lerpV(start, stop, amt) {
    return start + (stop - start) * amt;
}

const DEFAULTS = {
    shape: 'lines', // 'lines' or 'circles'
    cols: 10, rows: 10,

    // Rotation (Split X/Y)
    rotationX: { start: 0, end: 0 }, rotationXFadeStart: 0, rotationXFadeEnd: 100, rotationXCurve: 'linear', rotationXMult: 1, rotationXSteps: 100,
    rotationY: { start: 0, end: 0 }, rotationYFadeStart: 0, rotationYFadeEnd: 100, rotationYCurve: 'linear', rotationYMult: 1, rotationYSteps: 100,

    // Weight/Thickness (Split X/Y)
    weightX: { start: 2, end: 2 }, weightXFadeStart: 0, weightXFadeEnd: 100, weightXCurve: 'linear', weightXMult: 1, weightXSteps: 100,
    weightY: { start: 2, end: 2 }, weightYFadeStart: 0, weightYFadeEnd: 100, weightYCurve: 'linear', weightYMult: 1, weightYSteps: 100,

    // Length (Split X/Y) - Logic: % of cell size
    lengthX: { start: 100, end: 100 }, lengthXFadeStart: 0, lengthXFadeEnd: 100, lengthXCurve: 'linear', lengthXMult: 1, lengthXSteps: 100,
    lengthY: { start: 100, end: 100 }, lengthYFadeStart: 0, lengthYFadeEnd: 100, lengthYCurve: 'linear', lengthYMult: 1, lengthYSteps: 100,

    // Opacity (Split X/Y)
    opacityX: { start: 100, end: 100 }, opacityXFadeStart: 0, opacityXFadeEnd: 100, opacityXCurve: 'linear', opacityXMult: 1, opacityXSteps: 100,
    opacityY: { start: 100, end: 100 }, opacityYFadeStart: 0, opacityYFadeEnd: 100, opacityYCurve: 'linear', opacityYMult: 1, opacityYSteps: 100,

    // Color
    colors: ['#ffffff'], colorMode: 'solid', colorAxis: 'x', colorFadeStart: 0, colorFadeEnd: 100, colorSteps: 100,

    // Global
    rotX: 0, rotY: 0, rotZ: 0, posX: 50, posY: 50, scale: 100,
    bgColors: ['#000000'], bgMode: 'solid', bgDir: 'vertical'
};

const state = {
    canvas: null, canvasWidth: 800, canvasHeight: 800,
    ...JSON.parse(JSON.stringify(DEFAULTS)),
    colorPresets: [],
    bgPresets: [],
    layers: [], activeLayerId: null
};

// Logarithmic Steps Helpers
function toLogSteps(sliderVal, maxSteps = 100) {
    if (maxSteps <= 20) return Math.round(mapV(sliderVal, 0, 100, 1, maxSteps));
    if (sliderVal <= 50) return Math.round(mapV(sliderVal, 0, 50, 1, 20));
    return Math.round(mapV(sliderVal, 50, 100, 20, maxSteps));
}
function fromLogSteps(stepsVal, maxSteps = 100) {
    if (maxSteps <= 20) return mapV(stepsVal, 1, maxSteps, 0, 100);
    if (stepsVal <= 20) return mapV(stepsVal, 1, 20, 0, 50);
    return mapV(stepsVal, 20, maxSteps, 50, 100);
}

// Color Utils
function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 255, g: 255, b: 255 };
}

function lerpColor3(c1, c2, t) {
    return {
        r: Math.round(c1.r + (c2.r - c1.r) * t),
        g: Math.round(c1.g + (c2.g - c1.g) * t),
        b: Math.round(c1.b + (c2.b - c1.b) * t)
    };
}

function applyCurve(t, type) {
    if (type === 'easeIn') return t * t;
    if (type === 'easeOut') return 1 - (1 - t) * (1 - t);
    if (type === 'easeInOut') return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return t;
}

function getValueWithFade(range, rawT, fs, fe, curve, steps, mult) {
    const fStart = fs / 100, fEnd = fe / 100;
    let t = rawT;
    if (steps && steps < 100) {
        t = Math.floor(t * steps) / (steps - 1);
        t = Math.min(1, Math.max(0, t));
    }
    let val;
    if (t <= fStart) val = range.start;
    else if (t >= fEnd) val = range.end;
    else val = lerpV(range.start, range.end, applyCurve((t - fStart) / (fEnd - fStart), curve));
    return val * (mult ?? 1);
}

function getGradientColor(colors, rawT, fadeStart, fadeEnd, steps) {
    if (!colors || colors.length === 0) return { r: 255, g: 255, b: 255 };
    if (colors.length === 1) return hexToRgb(colors[0]);

    const fs = (fadeStart ?? 0) / 100, fe = (fadeEnd ?? 100) / 100;
    let t;
    if (rawT <= fs) t = 0;
    else if (rawT >= fe) t = 1;
    else t = (rawT - fs) / (fe - fs);

    if (steps && steps < 100) {
        t = Math.floor(t * steps) / (steps - 1);
        t = Math.min(1, Math.max(0, t));
    }

    const scaledT = t * (colors.length - 1);
    const index = Math.floor(scaledT);
    const innerT = scaledT - index;

    if (index >= colors.length - 1) return hexToRgb(colors[colors.length - 1]);
    return lerpColor3(hexToRgb(colors[index]), hexToRgb(colors[index + 1]), innerT);
}

// --- SETUP & DRAW ---

function setup() {
    try {
        state.canvas = createCanvas(800, 800, WEBGL);
        state.canvas.parent('canvas');

        // Error handling for initUI
        try {
            initUI();
        } catch (e) {
            console.error("UI Init Error:", e);
        }

        state.layers.push({ id: Date.now(), ...JSON.parse(JSON.stringify(DEFAULTS)) });
        state.activeLayerId = state.layers[0].id;

        updateLayersUI();
        loadLayerToState(state.layers[0]);
        applyResolution();
    } catch (e) {
        alert("Setup Error: " + e.message);
    }
}

function draw() {
    try {
        const rx = radians(state.rotX), ry = radians(state.rotY), rz = radians(state.rotZ);
        const tx = map(state.posX, 0, 100, -width / 2, width / 2);
        const ty = map(state.posY, 0, 100, -height / 2, height / 2);
        const sc = state.scale / 100;

        if (state.bgMode === 'solid' && state.bgColors.length > 0) background(state.bgColors[0]);
        else drawGradientBackground();

        push();
        translate(tx, ty, 0);
        rotateX(rx); rotateY(ry); rotateZ(rz);
        scale(sc);

        state.layers.forEach(layer => {
            if (layer.visible !== false) {
                if (layer.id === state.activeLayerId) {
                    Object.assign(layer, getCurrentStateData());
                }
                renderLayer(layer);
            }
        });

        pop();
    } catch (e) {
        // Prevent spamming
        if (frameCount % 60 === 0) console.error("Draw Error:", e);
    }
}

function getCurrentStateData() {
    const keys = Object.keys(DEFAULTS).filter(k => k !== 'bgColors' && k !== 'bgMode' && k !== 'bgDir');
    const data = {};
    keys.forEach(k => {
        if (Array.isArray(state[k])) data[k] = [...state[k]];
        else if (typeof state[k] === 'object') data[k] = { ...state[k] };
        else data[k] = state[k];
    });
    return data;
}

function drawGradientBackground() {
    push();
    resetMatrix();
    translate(-width / 2, -height / 2);
    noStroke();
    const stops = state.bgColors.length - 1;
    if (stops < 1) { background(0); pop(); return; }

    if (state.bgDir === 'vertical') {
        for (let y = 0; y <= height; y += 4) { // Optimization: step 4
            const t = y / height;
            const c = getGradientColor(state.bgColors, t, 0, 100);
            fill(c.r, c.g, c.b);
            rect(0, y, width, 4);
        }
    } else {
        for (let x = 0; x <= width; x += 4) {
            const t = x / width;
            const c = getGradientColor(state.bgColors, t, 0, 100);
            fill(c.r, c.g, c.b);
            rect(x, 0, 4, height);
        }
    }
    pop();
}

// --- RENDER LOGIC ---

function renderLayer(layer) {
    const cols = layer.cols || 10;
    const rows = layer.rows || 10;
    const cellW = state.canvasWidth / cols;
    const cellH = state.canvasHeight / rows;
    const startX = -state.canvasWidth / 2;
    const startY = -state.canvasHeight / 2;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const normX = cols > 1 ? col / (cols - 1) : 0;
            const normY = rows > 1 ? row / (rows - 1) : 0;

            const wX = getValueWithFade(layer.weightX, normX, layer.weightXFadeStart, layer.weightXFadeEnd, layer.weightXCurve, layer.weightXSteps, layer.weightXMult);
            const wY = getValueWithFade(layer.weightY, normY, layer.weightYFadeStart, layer.weightYFadeEnd, layer.weightYCurve, layer.weightYSteps, layer.weightYMult);
            const weight = (wX + wY) / 2;

            const oX = getValueWithFade(layer.opacityX, normX, layer.opacityXFadeStart, layer.opacityXFadeEnd, layer.opacityXCurve, layer.opacityXSteps, layer.opacityXMult);
            const oY = getValueWithFade(layer.opacityY, normY, layer.opacityYFadeStart, layer.opacityYFadeEnd, layer.opacityYCurve, layer.opacityYSteps, layer.opacityYMult);
            const opacity = (oX + oY) / 2;

            const lX = getValueWithFade(layer.lengthX, normX, layer.lengthXFadeStart, layer.lengthXFadeEnd, layer.lengthXCurve, layer.lengthXSteps, layer.lengthXMult);
            const lY = getValueWithFade(layer.lengthY, normY, layer.lengthYFadeStart, layer.lengthYFadeEnd, layer.lengthYCurve, layer.lengthYSteps, layer.lengthYMult);
            const lenPct = (lX + lY) / 2;

            const rX = getValueWithFade(layer.rotationX, normX, layer.rotationXFadeStart, layer.rotationXFadeEnd, layer.rotationXCurve, layer.rotationXSteps, layer.rotationXMult);
            const rY = getValueWithFade(layer.rotationY, normY, layer.rotationYFadeStart, layer.rotationYFadeEnd, layer.rotationYCurve, layer.rotationYSteps, layer.rotationYMult);
            const rotation = rX + rY;

            const cProgress = layer.colorAxis === 'y' ? normY : normX;
            const colVal = (layer.colorMode === 'fade')
                ? getGradientColor(layer.colors, cProgress, layer.colorFadeStart, layer.colorFadeEnd, layer.colorSteps)
                : hexToRgb(layer.colors[0]);

            push();
            const cx = startX + col * cellW + cellW / 2;
            const cy = startY + row * cellH + cellH / 2;
            translate(cx, cy, 0);
            rotateZ(radians(rotation));

            stroke(colVal.r, colVal.g, colVal.b, mapV(opacity, 0, 100, 0, 255));
            strokeWeight(Math.max(0.1, weight)); // Ensure visible weight
            noFill();

            const maxSize = Math.min(cellW, cellH);
            const actualSize = maxSize * (lenPct / 100);

            if (layer.shape === 'circles') {
                circle(0, 0, actualSize);
            } else {
                line(0, -actualSize / 2, 0, actualSize / 2);
            }
            pop();
        }
    }
}

// --- UI SETUP ---

function initUI() {
    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.shape = btn.dataset.shape;
            saveStateToActiveLayer();
        };
    });

    setupSingleControl('cols', 'colsValue', 'colsSlider');
    setupSingleControl('rows', 'rowsValue', 'rowsSlider');

    setupAttributeGroup('rotation');
    setupAttributeGroup('weight');
    setupAttributeGroup('length');
    setupAttributeGroup('opacity');

    setupColorSystem();

    setupSingleControl('rotX', 'rotXValue', 'rotX');
    setupSingleControl('rotY', 'rotYValue', 'rotY');
    setupSingleControl('rotZ', 'rotZValue', 'rotZ');
    setupSingleControl('posX', 'posXValue', null);
    setupSingleControl('posY', 'posYValue', null);
    setupSingleControl('scale', 'scaleValue', 'scaleSlider');

    setupBgSystem();

    document.getElementById('resetBtn').onclick = resetAll;
    document.getElementById('randomBtn').onclick = randomize;
    document.getElementById('exportPng').onclick = () => saveCanvas('pattern', 'png');
    document.getElementById('saveJson').onclick = saveProject;
    document.getElementById('loadJson').onchange = loadProject;
    document.getElementById('resApply').onclick = applyResolution;

    document.querySelectorAll('.resetable').forEach(el => {
        el.onclick = () => resetAttribute(el.dataset.reset);
    });

    const addLayerBtn = document.getElementById('addLayer');
    if (addLayerBtn) addLayerBtn.onclick = addNewLayer;
}

function setupAttributeGroup(param) {
    const toggle = document.querySelector(`.axis-toggle[data-param="${param}"]`);
    if (toggle) {
        toggle.querySelectorAll('.axis-btn').forEach(btn => {
            btn.onclick = () => {
                const axis = btn.dataset.axis;
                toggle.querySelectorAll('.axis-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const xContent = document.getElementById(`${param}XContent`);
                const yContent = document.getElementById(`${param}YContent`);

                if (xContent) {
                    xContent.classList.toggle('active', axis === 'x');
                    xContent.classList.toggle('hidden', axis !== 'x');
                }
                if (yContent) {
                    yContent.classList.toggle('active', axis === 'y');
                    yContent.classList.toggle('hidden', axis !== 'y');
                }
            };
        });
    }
    setupRangeControl(`${param}X`);
    setupRangeControl(`${param}Y`);
    setupAdvancedControls(`${param}X`);
    setupAdvancedControls(`${param}Y`);
}

function setupSingleControl(param, inputId, sliderId) {
    const input = document.getElementById(inputId);
    const slider = sliderId ? document.getElementById(sliderId) : null;
    if (input) input.oninput = () => {
        const v = parseFloat(input.value);
        if (slider) slider.value = v;
        state[param] = v;
        saveStateToActiveLayer();
    };
    if (slider) slider.oninput = () => {
        const v = parseFloat(slider.value);
        if (input) input.value = v;
        state[param] = v;
        saveStateToActiveLayer();
    };
}

function setupRangeControl(param) {
    const sI = document.getElementById(`${param}Start`), eI = document.getElementById(`${param}End`);
    const sS = document.getElementById(`${param}SliderStart`), eS = document.getElementById(`${param}SliderEnd`);
    const range = document.getElementById(`${param}Range`);

    if (!sI || !eI || !sS || !eS || !range) return;

    function update() {
        const min = parseFloat(sS.min), max = parseFloat(sS.max);
        const startPct = ((parseFloat(sS.value) - min) / (max - min)) * 100;
        const endPct = ((parseFloat(eS.value) - min) / (max - min)) * 100;

        range.style.left = `${Math.min(startPct, endPct)}%`;
        range.style.right = `${100 - Math.max(startPct, endPct)}%`;

        state[param].start = parseFloat(sS.value);
        state[param].end = parseFloat(eS.value);
        saveStateToActiveLayer();
    }
    sI.oninput = () => { sS.value = sI.value; update(); };
    eI.oninput = () => { eS.value = eI.value; update(); };
    sS.oninput = () => { sI.value = sS.value; update(); };
    eS.oninput = () => { eI.value = eS.value; update(); };
    update();
}

function setupAdvancedControls(param) {
    const fs = document.getElementById(`${param}FadeStart`), fe = document.getElementById(`${param}FadeEnd`);
    if (fs) fs.oninput = () => { state[`${param}FadeStart`] = parseFloat(fs.value); saveStateToActiveLayer(); };
    if (fe) fe.oninput = () => { state[`${param}FadeEnd`] = parseFloat(fe.value); saveStateToActiveLayer(); };

    const curve = document.getElementById(`${param}Curve`);
    if (curve) curve.oninput = () => { state[`${param}Curve`] = curve.value; saveStateToActiveLayer(); };

    const mult = document.getElementById(`${param}Mult`);
    if (mult) mult.oninput = () => { state[`${param}Mult`] = parseFloat(mult.value); saveStateToActiveLayer(); };

    const steps = document.getElementById(`${param}Steps`), stepsInput = document.getElementById(`${param}StepsInput`);
    if (steps) steps.oninput = () => {
        state[`${param}Steps`] = toLogSteps(parseInt(steps.value), 100);
        if (stepsInput) stepsInput.value = state[`${param}Steps`];
        saveStateToActiveLayer();
    };
    if (stepsInput) stepsInput.oninput = () => {
        let val = parseInt(stepsInput.value);
        state[`${param}Steps`] = val;
        if (steps) steps.value = fromLogSteps(val, 100);
        saveStateToActiveLayer();
    };
}

function setupColorSystem() {
    document.getElementById('colorModeSolid').onclick = () => { state.colorMode = 'solid'; updateColorMode(); saveStateToActiveLayer(); };
    document.getElementById('colorModeFade').onclick = () => { state.colorMode = 'fade'; updateColorMode(); saveStateToActiveLayer(); };
    document.getElementById('addColorStop').onclick = () => { state.colors.push('#ffffff'); updateColorStops(); saveStateToActiveLayer(); };
    document.getElementById('saveColorPreset').onclick = saveColorPreset;

    const toggle = document.getElementById('colorAxisToggle');
    if (toggle) toggle.querySelectorAll('.axis-btn').forEach(btn => {
        btn.onclick = () => {
            toggle.querySelectorAll('.axis-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.colorAxis = btn.dataset.axis;
            saveStateToActiveLayer();
        };
    });

    const cfs = document.getElementById('colorFadeStart'), cfe = document.getElementById('colorFadeEnd');
    if (cfs) cfs.oninput = () => { state.colorFadeStart = parseFloat(cfs.value); saveStateToActiveLayer(); };
    if (cfe) cfe.oninput = () => { state.colorFadeEnd = parseFloat(cfe.value); saveStateToActiveLayer(); };

    const steps = document.getElementById('colorSteps'), stepsInput = document.getElementById('colorStepsInput');
    if (steps) steps.oninput = () => {
        state.colorSteps = toLogSteps(parseInt(steps.value), 100);
        if (stepsInput) stepsInput.value = state.colorSteps;
        saveStateToActiveLayer();
    };
    renderColorPresets();

    // Default Presets Init
    state.colorPresets = [...defaultColorPresets];
    renderColorPresets();
}

function renderColorPresets() {
    const container = document.getElementById('colorPresets');
    if (!container) return;
    container.innerHTML = '';
    state.colorPresets.forEach((preset, i) => {
        const btn = document.createElement('button');
        btn.className = 'color-preset';
        btn.style.background = preset.colors.length === 1 ? preset.colors[0] : `linear-gradient(135deg, ${preset.colors.join(', ')})`;
        btn.onclick = () => {
            state.colors = [...preset.colors];
            state.colorMode = preset.colors.length > 1 ? 'fade' : 'solid';
            updateColorStops(); updateColorMode(); saveStateToActiveLayer();
        };
        container.appendChild(btn);
    });
}

function updateColorMode() {
    const solidBtn = document.getElementById('colorModeSolid');
    const fadeBtn = document.getElementById('colorModeFade');
    const axisToggle = document.getElementById('colorAxisToggle');
    const fadeControls = document.getElementById('colorFadeControls');

    if (solidBtn) solidBtn.classList.toggle('active', state.colorMode === 'solid');
    if (fadeBtn) fadeBtn.classList.toggle('active', state.colorMode === 'fade');
    if (axisToggle) axisToggle.classList.toggle('hidden', state.colorMode === 'solid');
    if (fadeControls) fadeControls.classList.toggle('hidden', state.colorMode === 'solid');
}

function updateColorStops() {
    const container = document.getElementById('colorStops');
    if (!container) return;
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
    if (bar) bar.style.background = state.colors.length === 1 ? state.colors[0] : `linear-gradient(90deg, ${state.colors.join(', ')})`;
}

function saveColorPreset() {
    state.colorPresets.push({ colors: [...state.colors], name: `Custom ${state.colorPresets.length + 1}` });
    renderColorPresets();
}

// BG System
const defaultColorPresets = [
    { colors: ['#ffffff'], name: 'White' },
    { colors: ['#ff6b35', '#ff3366'], name: 'Sunset' },
    { colors: ['#ff3366', '#00d4ff'], name: 'Neon' }
];

function setupBgSystem() {
    state.bgPresets = [
        { colors: ['#000000'], dir: 'solid', name: 'Black' },
        { colors: ['#0a0a1a', '#1a1a3e'], dir: 'vertical', name: 'Night' }
    ];

    document.getElementById('bgModeSolid').onclick = () => { state.bgMode = 'solid'; updateBgMode(); };
    document.getElementById('bgModeFade').onclick = () => { state.bgMode = 'fade'; updateBgMode(); };
    document.getElementById('addBgStop').onclick = () => { state.bgColors.push('#333333'); updateBgStops(); };

    document.querySelectorAll('.bg-direction .dir-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.bg-direction .dir-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.bgDir = btn.dataset.dir;
        };
    });
    updateBgStops(); renderBgPresets();
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
        stop.querySelector('input').oninput = e => { state.bgColors[i] = e.target.value; };
        const rm = stop.querySelector('.remove-stop');
        if (rm) rm.onclick = () => { state.bgColors.splice(i, 1); updateBgStops(); };
        container.appendChild(stop);
    });
}
function renderBgPresets() {
    const container = document.getElementById('bgPresets');
    container.innerHTML = '';
    state.bgPresets.forEach(preset => {
        const btn = document.createElement('button');
        btn.className = 'color-preset';
        btn.style.background = preset.colors.length === 1 ? preset.colors[0] : `linear-gradient(135deg, ${preset.colors.join(', ')})`;
        btn.onclick = () => {
            state.bgColors = [...preset.colors];
            state.bgMode = preset.dir === 'solid' ? 'solid' : 'fade';
            state.bgDir = preset.dir;
            updateBgStops(); updateBgMode();
        };
        container.appendChild(btn);
    });
}

// Helpers
function resetAttribute(param) {
    if (['rotation', 'weight', 'length', 'opacity'].includes(param)) {
        ['X', 'Y'].forEach(axis => {
            const p = param + axis;
            state[p] = { ...DEFAULTS[p] };
            state[p + 'FadeStart'] = DEFAULTS[p + 'FadeStart'];
            state[p + 'FadeEnd'] = DEFAULTS[p + 'FadeEnd'];
            state[p + 'Curve'] = DEFAULTS[p + 'Curve'];
            state[p + 'Steps'] = DEFAULTS[p + 'Steps'];
            state[p + 'Mult'] = DEFAULTS[p + 'Mult'];
        });
    } else if (param === 'grid') {
        state.cols = DEFAULTS.cols;
        state.rows = DEFAULTS.rows;
    } else if (param === 'color') {
        state.colors = [...DEFAULTS.colors];
        state.colorMode = DEFAULTS.colorMode;
    }
    syncUIWithState();
}

function syncUIWithState() {
    document.querySelectorAll('.shape-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.shape === state.shape));

    document.getElementById('colsValue').value = state.cols;
    document.getElementById('colsSlider').value = state.cols;
    document.getElementById('rowsValue').value = state.rows;
    document.getElementById('rowsSlider').value = state.rows;

    ['rotation', 'weight', 'length', 'opacity'].forEach(param => {
        ['X', 'Y'].forEach(axis => {
            const p = param + axis;
            const startSlider = document.getElementById(`${p}SliderStart`);
            if (startSlider) {
                document.getElementById(`${p}Start`).value = state[p].start;
                document.getElementById(`${p}End`).value = state[p].end;
                document.getElementById(`${p}SliderStart`).value = state[p].start;
                document.getElementById(`${p}SliderEnd`).value = state[p].end;
                document.getElementById(`${p}FadeStart`).value = state[`${p}FadeStart`];
                document.getElementById(`${p}FadeEnd`).value = state[`${p}FadeEnd`];
                document.getElementById(`${p}Curve`).value = state[`${p}Curve`];
                document.getElementById(`${p}Mult`).value = state[`${p}Mult`] ?? 1;
                document.getElementById(`${p}StepsInput`).value = state[`${p}Steps`] ?? 100;
            }
        });
    });
    updateColorStops(); updateColorMode();
}

function resetAll() {
    Object.keys(DEFAULTS).forEach(k => {
        if (Array.isArray(DEFAULTS[k])) state[k] = [...DEFAULTS[k]];
        else if (typeof DEFAULTS[k] === 'object') state[k] = { ...DEFAULTS[k] };
        else state[k] = DEFAULTS[k];
    });
    syncUIWithState();
    saveStateToActiveLayer();
}

function randomize() {
    state.cols = Math.floor(Math.random() * 45) + 5;
    state.rows = Math.floor(Math.random() * 45) + 5;
    ['rotation', 'weight', 'length', 'opacity'].forEach(param => {
        ['X', 'Y'].forEach(axis => {
            const key = param + axis;
            const min = param === 'rotation' ? -180 : (param === 'length' || param === 'opacity' ? 20 : 1);
            const max = param === 'rotation' ? 180 : (param === 'length' || param === 'opacity' ? 100 : 20);
            state[key].start = Math.floor(Math.random() * (max - min)) + min;
            state[key].end = Math.floor(Math.random() * (max - min)) + min;
        });
    });
    syncUIWithState();
    saveStateToActiveLayer();
}

function addNewLayer() {
    const id = Date.now();
    state.layers.push({ id, ...JSON.parse(JSON.stringify(DEFAULTS)) });
    state.activeLayerId = id;
    loadLayerToState(state.layers[state.layers.length - 1]);
    updateLayersUI();
}
function saveStateToActiveLayer() {
    const layer = state.layers.find(l => l.id === state.activeLayerId);
    if (layer) Object.assign(layer, getCurrentStateData());
}
function loadLayerToState(layer) {
    if (!layer) return;
    Object.keys(layer).forEach(k => {
        if (k !== 'id' && k !== 'visible' && k !== 'name' && k in state) {
            if (Array.isArray(layer[k])) state[k] = [...layer[k]];
            else if (typeof layer[k] === 'object') state[k] = { ...layer[k] };
            else state[k] = layer[k];
        }
    });
    syncUIWithState();
}
function updateLayersUI() {
    const container = document.getElementById('layersList');
    if (!container) return;
    container.innerHTML = '';
    state.layers.slice().reverse().forEach(layer => {
        const el = document.createElement('div');
        el.className = `layer-item ${layer.id === state.activeLayerId ? 'active' : ''}`;
        el.innerHTML = `<span class="layer-vis ${layer.visible !== false ? '' : 'hidden'}">👁</span><span class="layer-name">Layer ${state.layers.indexOf(layer) + 1}</span><span class="layer-del">×</span>`;
        el.onclick = (e) => {
            if (e.target.classList.contains('layer-vis')) {
                layer.visible = layer.visible === false ? true : false;
                e.target.classList.toggle('hidden');
                return;
            }
            if (e.target.classList.contains('layer-del')) {
                if (state.layers.length <= 1) return;
                state.layers = state.layers.filter(l => l.id !== layer.id);
                if (state.activeLayerId === layer.id) state.activeLayerId = state.layers[0].id;
                loadLayerToState(state.layers.find(l => l.id === state.activeLayerId));
                updateLayersUI();
                return;
            }
            state.activeLayerId = layer.id;
            loadLayerToState(layer);
            updateLayersUI();
        };
        container.appendChild(el);
    });
}
function saveProject() {
    const project = { version: '5.0', state: state };
    saveJSON(project, `vector-lab-${Date.now()}.json`);
}
function loadProject(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
        try {
            const p = JSON.parse(event.target.result);
            if (p.state) {
                Object.assign(state, p.state);
                syncUIWithState();
            }
        } catch (err) { console.error(err); }
    };
    reader.readAsText(file);
}
function applyResolution() {
    const w = parseInt(document.getElementById('resWidth').value) || 800;
    const h = parseInt(document.getElementById('resHeight').value) || 800;
    state.canvasWidth = w;
    state.canvasHeight = h;
    resizeCanvas(w, h);
}
