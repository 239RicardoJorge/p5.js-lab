/**
 * p5.js playground
 * Grid System with Split X/Y Control
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
    colorsX: ['#ff6b35'], colorsY: ['#ff6b35'], colorAxis: 'x',
    colorXFadeStart: 0, colorXFadeEnd: 100, colorXSteps: 100,
    colorYFadeStart: 0, colorYFadeEnd: 100, colorYSteps: 100,

    // Global
    rotX: 0, rotY: 0, rotZ: 0, posX: 50, posY: 50, scale: 100,
    bgColors: ['#000000'], bgMode: 'solid', bgDir: 'vertical',
    bgFadeStart: 0, bgFadeEnd: 100, bgSteps: 100
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

        state.layers.push({ id: Date.now(), name: 'Layer 1', ...JSON.parse(JSON.stringify(DEFAULTS)) });
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
    const keys = Object.keys(DEFAULTS).filter(k => !k.startsWith('bg'));
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
            const c = getGradientColor(state.bgColors, t, state.bgFadeStart ?? 0, state.bgFadeEnd ?? 100, state.bgSteps ?? 100);
            fill(c.r, c.g, c.b);
            rect(0, y, width, 4);
        }
    } else if (state.bgDir === 'horizontal') {
        for (let x = 0; x <= width; x += 4) {
            const t = x / width;
            const c = getGradientColor(state.bgColors, t, state.bgFadeStart ?? 0, state.bgFadeEnd ?? 100, state.bgSteps ?? 100);
            fill(c.r, c.g, c.b);
            rect(x, 0, 4, height);
        }
    } else if (state.bgDir === 'radial') {
        // Simple radial approximation
        for (let r = 0; r <= width; r += 5) {
            const t = map(r, 0, width / 1.5, 0, 1);
            const c = getGradientColor(state.bgColors, Math.min(1, Math.max(0, t)), state.bgFadeStart ?? 0, state.bgFadeEnd ?? 100, state.bgSteps ?? 100);
            fill(c.r, c.g, c.b);
            ellipse(0, 0, r * 2, r * 2); // Draw centered radial? Or just circles from center?
        }
        // Actually radial gradient in p5 is tricky without shaders or heavy loop. 
        // Existing code didn't hold radial logic shown in view? 
        // Logic lines 205-210 only handled 'else' (horizontal).
        // I'll stick to Vertical/Horizontal updates first. 
        // Wait, line 204 was 'else', so it assumed horizontal.
        // My replacement adds 'radial' check if user selects it.
        // I should probably stick to what logic supports or improve it.
        // Given I added 'radial' button in HTML, I should support it.
        // Standard radial: center of canvas.
        // I'll leave 'else' as Horizontal for now, and add Radial logic later if needed. 
        // Actually I'll stick to Vertical/Horizontal to avoid performance regression unless requested.
        // Replacing lines 197-210.
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

            let colVal;
            const cX = (layer.colorsX || layer.colors || ['#ffffff']);
            const cY = (layer.colorsY || layer.colors || ['#ffffff']);

            if (layer.colorAxis === 'y') {
                colVal = getGradientColor(cY, normY, layer.colorYFadeStart, layer.colorYFadeEnd, layer.colorYSteps);
            } else if (layer.colorAxis === 'xy') {
                const rgbX = getGradientColor(cX, normX, layer.colorXFadeStart, layer.colorXFadeEnd, layer.colorXSteps);
                const rgbY = getGradientColor(cY, normY, layer.colorYFadeStart, layer.colorYFadeEnd, layer.colorYSteps);
                colVal = { r: (rgbX.r + rgbY.r) / 2, g: (rgbX.g + rgbY.g) / 2, b: (rgbX.b + rgbY.b) / 2 };
            } else { // x or none
                colVal = getGradientColor(cX, normX, layer.colorXFadeStart, layer.colorXFadeEnd, layer.colorXSteps);
            }

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

    // Enter key on resolution inputs applies resolution
    document.getElementById('resWidth').onkeydown = (e) => { if (e.key === 'Enter') applyResolution(); };
    document.getElementById('resHeight').onkeydown = (e) => { if (e.key === 'Enter') applyResolution(); };

    document.querySelectorAll('.resetable').forEach(el => {
        el.ondblclick = () => resetAttribute(el.dataset.reset);
        el.style.cursor = 'pointer';
        el.title = 'Double-click to reset';
    });

    const addLayerBtn = document.getElementById('addLayer');
    if (addLayerBtn) addLayerBtn.onclick = addNewLayer;
}

function setupAttributeGroup(param) {
    // Multi-state toggle (NEW) - allows independent X and Y activation
    const toggle = document.querySelector(`.axis-toggle-multi[data-param="${param}"]`);
    if (toggle) {
        toggle.querySelectorAll('.axis-btn-multi').forEach(btn => {
            btn.onclick = () => {
                // Toggle this button's active state (multi-select allowed)
                btn.classList.toggle('active');

                const axis = btn.dataset.axis;
                const panel = document.getElementById(`${param}${axis.toUpperCase()}Panel`);

                if (panel) {
                    panel.classList.toggle('hidden', !btn.classList.contains('active'));
                }
            };
        });
    }

    // Setup advanced toggle buttons
    ['X', 'Y'].forEach(axis => {
        const advToggle = document.querySelector(`.advanced-toggle[data-target="${param}${axis}Advanced"]`);
        if (advToggle) {
            advToggle.onclick = () => {
                advToggle.classList.toggle('expanded');
                const panel = document.getElementById(`${param}${axis}Advanced`);
                if (panel) {
                    panel.classList.toggle('hidden');
                }
            };
        }
    });

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

        // Update preview values (extract base param name from e.g. "rotationX")
        const baseParam = param.replace(/[XY]$/, '');
        updatePreviewValues(baseParam);

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
    const fadeRange = document.getElementById(`${param}FadeRange`);

    function updateFadeRange() {
        if (fadeRange && fs && fe) {
            const startPct = parseFloat(fs.value);
            const endPct = parseFloat(fe.value);
            fadeRange.style.left = `${Math.min(startPct, endPct)}%`;
            fadeRange.style.right = `${100 - Math.max(startPct, endPct)}%`;
        }
    }

    if (fs) fs.oninput = () => {
        state[`${param}FadeStart`] = parseFloat(fs.value);
        updateFadeRange();
        saveStateToActiveLayer();
    };
    if (fe) fe.oninput = () => {
        state[`${param}FadeEnd`] = parseFloat(fe.value);
        updateFadeRange();
        saveStateToActiveLayer();
    };
    updateFadeRange();

    const curve = document.getElementById(`${param}Curve`);
    if (curve) curve.oninput = () => {
        state[`${param}Curve`] = curve.value;
        saveStateToActiveLayer();
    };

    const mult = document.getElementById(`${param}Mult`);
    if (mult) mult.oninput = () => {
        state[`${param}Mult`] = parseFloat(mult.value);
        saveStateToActiveLayer();
    };

    // Steps as number input (value = number of steps, not percentage)
    const steps = document.getElementById(`${param}Steps`);
    if (steps) steps.oninput = () => {
        state[`${param}Steps`] = parseInt(steps.value);
        saveStateToActiveLayer();
    };
}

// Check if advanced settings differ from defaults
function updateAdvancedModifiedIndicator(param) {
    const indicator = document.getElementById(`${param}Modified`);
    if (!indicator) return;

    const fadeStart = state[`${param}FadeStart`] ?? 0;
    const fadeEnd = state[`${param}FadeEnd`] ?? 100;
    const curve = state[`${param}Curve`] ?? 'linear';
    const mult = state[`${param}Mult`] ?? 1;
    const steps = state[`${param}Steps`] ?? 100;

    // Check if any value differs from default
    const isModified = fadeStart !== 0 || fadeEnd !== 100 || curve !== 'linear' || mult !== 1 || steps !== 100;

    indicator.classList.toggle('show', isModified);
}

// Update preview value displays
function updatePreviewValues(param) {
    ['X', 'Y'].forEach(axis => {
        const startPreview = document.getElementById(`${param}${axis}PreviewStart`);
        const endPreview = document.getElementById(`${param}${axis}PreviewEnd`);
        const key = `${param}${axis}`;

        if (startPreview && state[key]) {
            startPreview.textContent = formatPreviewValue(param, state[key].start);
        }
        if (endPreview && state[key]) {
            endPreview.textContent = formatPreviewValue(param, state[key].end);
        }
    });
}

function formatPreviewValue(param, value) {
    if (param === 'rotation') return `${Math.round(value)}°`;
    if (param === 'weight') return value.toFixed(1);
    return `${Math.round(value)}%`;
}

function setupColorSystem() {
    // Initialize colors for X and Y if not present
    if (!state.colorsX) state.colorsX = [...(state.colors || ['#ff6b35'])];
    if (!state.colorsY) state.colorsY = [...(state.colors || ['#ff6b35'])];

    // Setup color for both X and Y axes
    ['X', 'Y'].forEach(axis => {
        const addBtn = document.getElementById(`addColorStop${axis}`);
        if (addBtn) {
            addBtn.onclick = () => {
                state[`colors${axis}`].push('#ffffff');
                updateColorStopsForAxis(axis);
                saveStateToActiveLayer();
            };
        }

        // Fade controls
        const fs = document.getElementById(`color${axis}FadeStart`);
        const fe = document.getElementById(`color${axis}FadeEnd`);
        const range = document.getElementById(`color${axis}FadeRange`);

        function updateRange() {
            if (range && fs && fe) {
                const startPct = parseFloat(fs.value);
                const endPct = parseFloat(fe.value);
                range.style.left = `${Math.min(startPct, endPct)}%`;
                range.style.right = `${100 - Math.max(startPct, endPct)}%`;
            }
        }

        if (fs) fs.oninput = () => { state[`color${axis}FadeStart`] = parseFloat(fs.value); updateRange(); saveStateToActiveLayer(); };
        if (fe) fe.oninput = () => { state[`color${axis}FadeEnd`] = parseFloat(fe.value); updateRange(); saveStateToActiveLayer(); };
        updateRange();

        const steps = document.getElementById(`color${axis}Steps`);
        if (steps) steps.oninput = () => { state[`color${axis}Steps`] = parseInt(steps.value); saveStateToActiveLayer(); };

        updateColorStopsForAxis(axis);
    });

    document.getElementById('saveColorPreset').onclick = saveColorPreset;

    // Color axis toggle
    const toggle = document.getElementById('colorAxisToggle');
    if (toggle) toggle.querySelectorAll('.axis-btn-multi').forEach(btn => {
        btn.onclick = () => {
            btn.classList.toggle('active');

            const xActive = toggle.querySelector('[data-axis="x"]').classList.contains('active');
            const yActive = toggle.querySelector('[data-axis="y"]').classList.contains('active');

            if (xActive && yActive) state.colorAxis = 'xy';
            else if (xActive) state.colorAxis = 'x';
            else if (yActive) state.colorAxis = 'y';
            else state.colorAxis = 'none';

            const axis = btn.dataset.axis;
            const panel = document.getElementById(`color${axis.toUpperCase()}Panel`);
            if (panel) panel.classList.toggle('hidden', !btn.classList.contains('active'));

            saveStateToActiveLayer();
        };
    });

    renderColorPresets();
    state.colorPresets = [...defaultColorPresets];
    renderColorPresets();
}

// Update color stops for a specific axis (X or Y)
function updateColorStopsForAxis(axis) {
    const container = document.getElementById(`colorStops${axis}`);
    if (!container) return;
    const colorKey = `colors${axis}`;
    if (!state[colorKey]) state[colorKey] = [...(state.colors || ['#ff6b35'])];

    container.innerHTML = '';
    state[colorKey].forEach((color, i) => {
        const stop = document.createElement('div');
        stop.className = 'color-stop';
        stop.innerHTML = `
            <input type="color" value="${color}">
            <input type="text" class="hex-input" value="${color}" maxlength="7" spellcheck="false">
            ${state[colorKey].length > 1 ? '<button class="remove-stop">×</button>' : ''}
        `;

        const colorInput = stop.querySelector('input[type="color"]');
        const hexInput = stop.querySelector('.hex-input');

        colorInput.oninput = e => {
            state[colorKey][i] = e.target.value;
            hexInput.value = e.target.value;
            updateGradientPreviewForAxis(axis);
            saveStateToActiveLayer();
        };

        hexInput.onchange = e => {
            let val = e.target.value;
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                state[colorKey][i] = val;
                colorInput.value = val;
                updateGradientPreviewForAxis(axis);
                saveStateToActiveLayer();
            } else {
                hexInput.value = state[colorKey][i];
            }
        };

        const rm = stop.querySelector('.remove-stop');
        if (rm) rm.onclick = () => {
            state[colorKey].splice(i, 1);
            updateColorStopsForAxis(axis);
            saveStateToActiveLayer();
        };
        container.appendChild(stop);
    });
    updateGradientPreviewForAxis(axis);
}

function updateGradientPreviewForAxis(axis) {
    const bar = document.getElementById(`colorGradientPreview${axis}`);
    const colorKey = `colors${axis}`;
    if (bar && state[colorKey]) {
        bar.style.background = state[colorKey].length === 1 ? state[colorKey][0] : `linear-gradient(90deg, ${state[colorKey].join(', ')})`;
    }
}

// Legacy wrappers
function updateColorStops() {
    updateColorStopsForAxis('X');
    updateColorStopsForAxis('Y');
}

function updateGradientPreview() {
    updateGradientPreviewForAxis('X');
    updateGradientPreviewForAxis('Y');
}

function updateColorMode() {
    // No-op
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
            state.colorsX = [...preset.colors];
            state.colorsY = [...preset.colors];
            updateColorStops();
            saveStateToActiveLayer();
        };
        container.appendChild(btn);
    });
}

function saveColorPreset() {
    // Save current X colors if X or XY mode, else Y colors if Y mode, default to X
    const colors = state.colorAxis === 'y' ? state.colorsY : state.colorsX;
    state.colorPresets.push({ colors: [...(colors || ['#ff6b35'])], name: `Custom ${state.colorPresets.length + 1}` });
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

    // Init BG State if missing
    if (state.bgFadeStart === undefined) state.bgFadeStart = 0;
    if (state.bgFadeEnd === undefined) state.bgFadeEnd = 100;
    if (state.bgSteps === undefined) state.bgSteps = 100;

    // Fade/Steps Controls
    const fs = document.getElementById('bgFadeStart');
    const fe = document.getElementById('bgFadeEnd');
    const range = document.getElementById('bgFadeRange');
    const steps = document.getElementById('bgSteps');

    function updateBgRange() {
        if (range && fs && fe) {
            const startPct = parseFloat(fs.value);
            const endPct = parseFloat(fe.value);
            range.style.left = `${Math.min(startPct, endPct)}%`;
            range.style.right = `${100 - Math.max(startPct, endPct)}%`;
        }
    }

    if (fs) fs.oninput = () => { state.bgFadeStart = parseFloat(fs.value); updateBgRange(); };
    if (fe) fe.oninput = () => { state.bgFadeEnd = parseFloat(fe.value); updateBgRange(); };
    if (steps) steps.oninput = () => { state.bgSteps = parseInt(steps.value); };
    updateBgRange();

    document.getElementById('addBgStop').onclick = () => { state.bgColors.push('#333333'); updateBgStops(); };

    const dirContainer = document.getElementById('bgDirectionContainer');
    if (dirContainer) {
        dirContainer.querySelectorAll('.dir-btn').forEach(btn => {
            btn.onclick = () => {
                dirContainer.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.bgDir = btn.dataset.dir;
            };
        });
    }

    const saveBtn = document.getElementById('saveBgPreset');
    if (saveBtn) saveBtn.onclick = () => {
        state.bgPresets.push({ colors: [...state.bgColors], dir: state.bgDir, name: 'Custom' });
        renderBgPresets();
    };

    updateBgStops(); renderBgPresets();
}

function updateBgStops() {
    const container = document.getElementById('bgStops');
    if (!container) return;
    container.innerHTML = '';
    state.bgColors.forEach((color, i) => {
        const stop = document.createElement('div');
        stop.className = 'color-stop';
        stop.innerHTML = `
            <input type="color" value="${color}">
            <input type="text" class="hex-input" value="${color}" maxlength="7" spellcheck="false">
            ${state.bgColors.length > 1 ? '<button class="remove-stop">×</button>' : ''}
        `;

        const colorInput = stop.querySelector('input[type="color"]');
        const hexInput = stop.querySelector('.hex-input');

        colorInput.oninput = e => {
            state.bgColors[i] = e.target.value;
            hexInput.value = e.target.value;
        };

        hexInput.onchange = e => {
            let val = e.target.value;
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                state.bgColors[i] = val;
                colorInput.value = val;
            } else {
                hexInput.value = state.bgColors[i];
            }
        };

        const rm = stop.querySelector('.remove-stop');
        if (rm) rm.onclick = () => { state.bgColors.splice(i, 1); updateBgStops(); };
        container.appendChild(stop);
    });

    // Update visibility of Advanced Controls
    const adv = document.getElementById('bgAdvancedControls');
    if (adv) adv.classList.toggle('hidden', state.bgColors.length <= 1);

    // Update Gradient Preview
    const bar = document.getElementById('bgGradientPreview');
    if (bar) bar.style.background = state.bgColors.length === 1 ? state.bgColors[0] : `linear-gradient(90deg, ${state.bgColors.join(', ')})`;
}

function renderBgPresets() {
    const container = document.getElementById('bgPresets');
    if (!container) return;
    container.innerHTML = '';
    state.bgPresets.forEach(preset => {
        const btn = document.createElement('button');
        btn.className = 'color-preset';
        btn.style.background = preset.colors.length === 1 ? preset.colors[0] : `linear-gradient(135deg, ${preset.colors.join(', ')})`;
        btn.onclick = () => {
            state.bgColors = [...preset.colors];
            state.bgDir = preset.dir || 'vertical';
            // Sync direction buttons
            const dirContainer = document.getElementById('bgDirectionContainer');
            if (dirContainer) {
                dirContainer.querySelectorAll('.dir-btn').forEach(b => b.classList.toggle('active', b.dataset.dir === state.bgDir));
            }
            updateBgStops();
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
    } else if (param === 'bg') {
        state.bgColors = [...DEFAULTS.bgColors];
        state.bgDir = DEFAULTS.bgDir;
        state.bgFadeStart = DEFAULTS.bgFadeStart;
        state.bgFadeEnd = DEFAULTS.bgFadeEnd;
        state.bgSteps = DEFAULTS.bgSteps;
        updateBgStops();
    } else if (param === 'color') {
        state.colorsX = [...DEFAULTS.colorsX];
        state.colorsY = [...DEFAULTS.colorsY];
        state.colorAxis = DEFAULTS.colorAxis;
        state.colorXFadeStart = DEFAULTS.colorXFadeStart;
        state.colorXFadeEnd = DEFAULTS.colorXFadeEnd;
        state.colorXSteps = DEFAULTS.colorXSteps;
        state.colorYFadeStart = DEFAULTS.colorYFadeStart;
        state.colorYFadeEnd = DEFAULTS.colorYFadeEnd;
        state.colorYSteps = DEFAULTS.colorYSteps;
        updateColorStops();
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
                const startInput = document.getElementById(`${p}Start`);
                const endInput = document.getElementById(`${p}End`);
                const fadeStart = document.getElementById(`${p}FadeStart`);
                const fadeEnd = document.getElementById(`${p}FadeEnd`);
                const fadeRange = document.getElementById(`${p}FadeRange`);
                const stepsInput = document.getElementById(`${p}Steps`);
                const curve = document.getElementById(`${p}Curve`);
                const mult = document.getElementById(`${p}Mult`);

                if (startInput) startInput.value = state[p].start;
                if (endInput) endInput.value = state[p].end;
                startSlider.value = state[p].start;
                document.getElementById(`${p}SliderEnd`).value = state[p].end;

                if (fadeStart) fadeStart.value = state[`${p}FadeStart`] ?? 0;
                if (fadeEnd) fadeEnd.value = state[`${p}FadeEnd`] ?? 100;
                if (curve) curve.value = state[`${p}Curve`] ?? 'linear';
                if (mult) mult.value = state[`${p}Mult`] ?? 1;
                if (stepsInput) stepsInput.value = state[`${p}Steps`] ?? 10;

                // Update fade range display
                if (fadeRange && fadeStart && fadeEnd) {
                    const startPct = parseFloat(fadeStart.value);
                    const endPct = parseFloat(fadeEnd.value);
                    fadeRange.style.left = `${Math.min(startPct, endPct)}%`;
                    fadeRange.style.right = `${100 - Math.max(startPct, endPct)}%`;
                }
            }
        });
    });

    // Sync color axis
    const colorToggle = document.getElementById('colorAxisToggle');
    if (colorToggle) {
        const xBtn = colorToggle.querySelector('[data-axis="x"]');
        const yBtn = colorToggle.querySelector('[data-axis="y"]');
        const xActive = state.colorAxis === 'x' || state.colorAxis === 'xy';
        const yActive = state.colorAxis === 'y' || state.colorAxis === 'xy';
        if (xBtn) xBtn.classList.toggle('active', xActive);
        if (yBtn) yBtn.classList.toggle('active', yActive);

        const xPanel = document.getElementById('colorXPanel');
        const yPanel = document.getElementById('colorYPanel');
        if (xPanel) xPanel.classList.toggle('hidden', !xActive);
        if (yPanel) yPanel.classList.toggle('hidden', !yActive);
    }

    // Sync color fade controls
    ['X', 'Y'].forEach(axis => {
        const fs = document.getElementById(`color${axis}FadeStart`);
        const fe = document.getElementById(`color${axis}FadeEnd`);
        const range = document.getElementById(`color${axis}FadeRange`);
        const steps = document.getElementById(`color${axis}Steps`);

        if (fs) fs.value = state[`color${axis}FadeStart`] ?? 0;
        if (fe) fe.value = state[`color${axis}FadeEnd`] ?? 100;
        if (steps) steps.value = state[`color${axis}Steps`] ?? 100;

        if (range && fs && fe) {
            const startPct = parseFloat(fs.value);
            const endPct = parseFloat(fe.value);
            range.style.left = `${Math.min(startPct, endPct)}%`;
            range.style.right = `${100 - Math.max(startPct, endPct)}%`;
        }
    });

    // Sync BG Controls
    const bgFs = document.getElementById('bgFadeStart');
    const bgFe = document.getElementById('bgFadeEnd');
    const bgRange = document.getElementById('bgFadeRange');
    const bgSteps = document.getElementById('bgSteps');

    if (bgFs) bgFs.value = state.bgFadeStart ?? 0;
    if (bgFe) bgFe.value = state.bgFadeEnd ?? 100;
    if (bgSteps) bgSteps.value = state.bgSteps ?? 100;

    if (bgRange && bgFs && bgFe) {
        const startPct = parseFloat(bgFs.value);
        const endPct = parseFloat(bgFe.value);
        bgRange.style.left = `${Math.min(startPct, endPct)}%`;
        bgRange.style.right = `${100 - Math.max(startPct, endPct)}%`;
    }

    const bgDirContainer = document.getElementById('bgDirectionContainer');
    if (bgDirContainer) {
        bgDirContainer.querySelectorAll('.dir-btn').forEach(b => b.classList.toggle('active', b.dataset.dir === state.bgDir));
    }

    updateColorStops();
    updateBgStops();
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
    // Grid
    state.cols = Math.floor(Math.random() * 45) + 5;
    state.rows = Math.floor(Math.random() * 45) + 5;

    // Shape
    const shapes = ['line', 'circle', 'square', 'triangle'];
    state.shape = shapes[Math.floor(Math.random() * shapes.length)];

    // All attribute parameters
    ['rotation', 'weight', 'length', 'opacity'].forEach(param => {
        ['X', 'Y'].forEach(axis => {
            const key = param + axis;
            const min = param === 'rotation' ? -180 : (param === 'length' || param === 'opacity' ? 20 : 1);
            const max = param === 'rotation' ? 180 : (param === 'length' || param === 'opacity' ? 100 : 20);
            state[key].start = Math.floor(Math.random() * (max - min)) + min;
            state[key].end = Math.floor(Math.random() * (max - min)) + min;

            // Advanced params
            state[`${key}FadeStart`] = Math.floor(Math.random() * 50);
            state[`${key}FadeEnd`] = 50 + Math.floor(Math.random() * 50);
            state[`${key}Mult`] = Math.round((0.5 + Math.random() * 2) * 10) / 10;
            state[`${key}Steps`] = Math.floor(Math.random() * 20) + 5;
        });
    });

    // Colors
    const numColorsX = Math.floor(Math.random() * 3) + 1;
    const numColorsY = Math.floor(Math.random() * 3) + 1;
    state.colorsX = [];
    state.colorsY = [];
    for (let i = 0; i < numColorsX; i++) {
        state.colorsX.push('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
    }
    for (let i = 0; i < numColorsY; i++) {
        state.colorsY.push('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
    }
    state.colorAxis = ['x', 'y', 'xy'][Math.floor(Math.random() * 3)];

    syncUIWithState();
    saveStateToActiveLayer();
}

function addNewLayer() {
    const id = Date.now();
    const layerNum = state.layers.length + 1;
    state.layers.push({ id, name: `Layer ${layerNum}`, ...JSON.parse(JSON.stringify(DEFAULTS)) });
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

    // Migration for legacy layers
    if (layer.colors && !layer.colorsX) state.colorsX = [...layer.colors];
    if (layer.colorFadeStart !== undefined) state.colorXFadeStart = layer.colorFadeStart;
    if (layer.colorFadeEnd !== undefined) state.colorXFadeEnd = layer.colorFadeEnd;
    if (layer.colorSteps !== undefined) state.colorXSteps = layer.colorSteps;

    syncUIWithState();
}
function updateLayersUI() {
    const container = document.getElementById('layersList');
    if (!container) return;
    container.innerHTML = '';
    state.layers.slice().reverse().forEach((layer, revIdx) => {
        const actualIdx = state.layers.length - 1 - revIdx;
        const el = document.createElement('div');
        el.className = `layer-item ${layer.id === state.activeLayerId ? 'active' : ''}`;
        el.innerHTML = `
            <span class="layer-vis ${layer.visible !== false ? 'on' : ''}" title="Toggle visibility"></span>
            <span class="layer-name">${layer.name || 'Layer ' + (actualIdx + 1)}</span>
            <span class="layer-order">
                <button class="layer-up" title="Move up" ${actualIdx === state.layers.length - 1 ? 'disabled' : ''}>↑</button>
                <button class="layer-down" title="Move down" ${actualIdx === 0 ? 'disabled' : ''}>↓</button>
            </span>
            <span class="layer-del" title="Delete">×</span>
        `;

        // Visibility toggle
        el.querySelector('.layer-vis').onclick = (e) => {
            e.stopPropagation();
            layer.visible = layer.visible === false ? true : false;
            updateLayersUI();
        };

        // Move up
        el.querySelector('.layer-up').onclick = (e) => {
            e.stopPropagation();
            if (actualIdx < state.layers.length - 1) {
                [state.layers[actualIdx], state.layers[actualIdx + 1]] = [state.layers[actualIdx + 1], state.layers[actualIdx]];
                updateLayersUI();
            }
        };

        // Move down
        el.querySelector('.layer-down').onclick = (e) => {
            e.stopPropagation();
            if (actualIdx > 0) {
                [state.layers[actualIdx], state.layers[actualIdx - 1]] = [state.layers[actualIdx - 1], state.layers[actualIdx]];
                updateLayersUI();
            }
        };

        // Delete
        el.querySelector('.layer-del').onclick = (e) => {
            e.stopPropagation();
            if (state.layers.length <= 1) return;
            state.layers = state.layers.filter(l => l.id !== layer.id);
            if (state.activeLayerId === layer.id) state.activeLayerId = state.layers[0].id;
            loadLayerToState(state.layers.find(l => l.id === state.activeLayerId));
            updateLayersUI();
        };

        // Select layer
        el.onclick = () => {
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
