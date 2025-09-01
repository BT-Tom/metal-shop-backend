const canvas = document.getElementById('flashings-canvas');
const ctx = canvas.getContext('2d');
const nodeLabelsDiv = document.getElementById('node-labels');
let nodes = [];
let lines = [];
let history = [];
let redoStack = [];
let mode = 'draw'; // or 'edit'
let drawingLine = null;
const NODE_RADIUS = 16;

let flashingLength = 2400; // Default length in mm

// Tapered flashing
let taperedMode = false;
let taperedNodes = [];
let taperedLines = [];

// Paint side feature
let paintMode = false;
let paintedSides = {}; // key: line index, value: 'left' or 'right'

// --- Controls ---
document.getElementById('tapered-toggle').onclick = function() {
    taperedMode = !taperedMode;
    if (taperedMode) {
        // Copy nodes and lines, offset by 100mm right and up
        taperedNodes = nodes.map(n => ({
            x: n.x + 100,
            y: n.y - 100
        }));
        taperedLines = lines.map(l => ({ ...l }));
    } else {
        taperedNodes = [];
        taperedLines = [];
    }
    draw();
};

document.getElementById('paint-side-toggle').onclick = function() {
    paintMode = !paintMode;
    this.classList.toggle('btn-primary', paintMode);
    this.classList.toggle('btn-warning', !paintMode);
};

document.getElementById('draw-mode').onclick = function() {
    mode = 'draw';
    this.classList.add('btn-primary');
    this.classList.remove('btn-outline-secondary');
    document.getElementById('edit-mode').classList.remove('btn-primary');
    document.getElementById('edit-mode').classList.add('btn-outline-secondary');
    startNodeIdx = nodes.length > 0 ? nodes.length - 1 : null;
    draw();
};

document.getElementById('edit-mode').onclick = function() {
    mode = mode === 'edit' ? 'draw' : 'edit';
    if (mode === 'edit') {
        this.classList.add('btn-primary');
        this.classList.remove('btn-outline-secondary');
    } else {
        this.classList.remove('btn-primary');
        this.classList.add('btn-outline-secondary');
    }
    draw();
};

document.getElementById('undo').onclick = undo;
document.getElementById('redo').onclick = redo;
// Colour swatches for custom flashing selection
const SWATCHES = [
    { name: 'Dover White', color: 'rgb(237,234,227)' },
    { name: 'Surfmist', color: 'rgb(229,227,216)' },
    { name: 'Evening Haze', color: 'rgb(193,184,167)' },
    { name: 'Classic Cream', color: 'rgb(223,202,156)' },
    { name: 'Paperbark', color: 'rgb(203,188,165)' },
    { name: 'Dune', color: 'rgb(186,179,171)' },
    { name: 'Southerly', color: 'rgb(210,209,203)' },
    { name: 'Shale Grey', color: 'rgb(190,188,187)' },
    { name: 'Bluegum', color: 'rgb(141,146,150)' },
    { name: 'Windspray', color: 'rgb(142,149,149)' },
    { name: 'Gully', color: 'rgb(119,115,107)' },
    { name: 'Jasper', color: 'rgb(114,80,70)' },
    { name: 'Manor Red', color: '#5E1D0E' },
    { name: 'Wallaby', color: 'rgb(108,103,99)' },
    { name: 'Basalt', color: 'rgb(95,94,95)' },
    { name: 'Woodland Grey', color: 'rgb(77,81,79)' },
    { name: 'Monument', color: 'rgb(50,54,56)' },
    { name: 'Night Sky', color: 'rgb(34,35,36)' },
    { name: 'Ironstone', color: 'rgb(71,65,66)' },
    { name: 'Deep Ocean', color: 'rgb(59,68,75)' },
    { name: 'Cottage Green', color: 'rgb(62,84,78)' },
    { name: 'Pale Eucalypt', color: 'rgb(104,126,107)' }
];
let selectedColour = null;

function renderSwatches() {
    // prefer the summary swatch container if present
    const container = document.getElementById('summary-colour-swatches') || document.getElementById('colour-swatches');
    if (!container) return;
    container.innerHTML = '';
    // restore last selected colour from localStorage if present
    try {
        const stored = localStorage.getItem('preferredColour');
        if (stored) selectedColour = stored;
    } catch (e) {}
    SWATCHES.forEach(s => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'swatch-btn';
        btn.title = s.name;
        btn.style.width = '28px';
        btn.style.height = '28px';
        btn.style.borderRadius = '50%';
        btn.style.border = '2px solid #ddd';
        btn.style.background = s.color;
        btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
    btn.style.marginBottom = '6px';
    btn.style.flex = '0 0 28px';
        btn.onclick = () => {
            selectedColour = s.name;
            document.getElementById('flashing-colour').value = s.name;
            // persist selection
            try { localStorage.setItem('preferredColour', s.name); } catch (e) {}
            // indicate selected
            const host = document.getElementById('summary-colour-swatches') || document.getElementById('colour-swatches');
            if (host) host.querySelectorAll('.swatch-btn').forEach(x => x.style.outline = '');
            btn.style.outline = '3px solid #1976d2';
        };
        container.appendChild(btn);
    });

    // if a colour was restored, mark it visually
    if (selectedColour) {
        document.getElementById('flashing-colour').value = selectedColour;
        const host = document.getElementById('summary-colour-swatches') || document.getElementById('colour-swatches');
        if (host) {
            Array.from(host.querySelectorAll('.swatch-btn')).forEach(b => {
                if (b.title === selectedColour) b.style.outline = '3px solid #1976d2';
            });
        }
    }
}

renderSwatches();

document.getElementById('add-to-cart').onclick = async function() {
    try {
        // export canvas as PNG data URL
        const dataUrl = canvas.toDataURL('image/png');
        const totalWidth = getTotalWidth();
        const bends = getBendCount();
        const area = Math.round((totalWidth * flashingLength) / 1e6 * 100) / 100; // m2
        const length_mm = flashingLength;
        const quantity = parseInt(document.getElementById('flash-quantity') ? document.getElementById('flash-quantity').value : '1', 10) || 1;
        // optional metadata: nodes/lines snapshot + selected colour
        const metadata = { nodes, lines };
        const colour = document.getElementById('flashing-colour').value || selectedColour || null;

    const payload = { imageData: dataUrl, area, bends, length_mm, metadata, quantity, colour };
        const res = await fetch('/api/flashing/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            // show a quick notification and go to cart
            alert('Custom flashing added to cart');
            window.location.href = '/cart.html';
        } else if (json.message === 'login_required') {
            // show login prompt
            alert('Please log in to add custom flashings to your cart.');
            window.location.href = '/login.html';
        } else {
            alert('Failed to add flashing: ' + (json.message || 'unknown'));
        }
    } catch (err) {
        console.error('Add to cart error', err);
        alert('Error adding to cart: ' + err.message);
    }
};

// --- Geometry helpers ---
function getDistance(a, b) {
    return Math.round(Math.hypot(a.x - b.x, a.y - b.y));
}

function getAngle(a, b, c) {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const magAB = Math.hypot(ab.x, ab.y);
    const magCB = Math.hypot(cb.x, cb.y);
    let angle = Math.acos(dot / (magAB * magCB)) * (180 / Math.PI);
    if (isNaN(angle)) angle = 0;
    return angle;
}

// --- Editing helpers ---
function updateLineLength(lineIdx, newLength) {
    const line = lines[lineIdx];
    const start = nodes[line.start];
    const end = nodes[line.end];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const currentLength = Math.hypot(dx, dy);
    if (currentLength === 0) return;
    const scale = newLength / currentLength;
    end.x = start.x + dx * scale;
    end.y = start.y + dy * scale;
    line.length = newLength;
    if (taperedMode) {
        taperedNodes = nodes.map(n => ({
            x: n.x + 100,
            y: n.y - 100
        }));
        taperedLines = lines.map(l => ({ ...l }));
    }
    draw();
}

function updateNodeAngle(nodeIdx, newAngle) {
    if (nodeIdx <= 0 || nodeIdx >= nodes.length - 1) return;
    const prev = nodes[nodeIdx - 1];
    const curr = nodes[nodeIdx];
    const next = nodes[nodeIdx + 1];
    const len = getDistance(curr, next);
    const anglePrev = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angleRad = anglePrev + ((180 - newAngle) * Math.PI / 180);
    next.x = curr.x + len * Math.cos(angleRad);
    next.y = curr.y + len * Math.sin(angleRad);
    if (taperedMode) {
        taperedNodes = nodes.map(n => ({
            x: n.x + 100,
            y: n.y - 100
        }));
        taperedLines = lines.map(l => ({ ...l }));
    }
    draw();
}

function updateTaperedLineLength(lineIdx, newLength) {
    const line = taperedLines[lineIdx];
    const start = taperedNodes[line.start];
    const end = taperedNodes[line.end];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const currentLength = Math.hypot(dx, dy);
    if (currentLength === 0) return;
    const scale = newLength / currentLength;
    end.x = start.x + dx * scale;
    end.y = start.y + dy * scale;
    line.length = newLength;
    draw();
}

function updateTaperedNodeAngle(nodeIdx, newAngle) {
    if (nodeIdx <= 0 || nodeIdx >= taperedNodes.length - 1) return;
    const prev = taperedNodes[nodeIdx - 1];
    const curr = taperedNodes[nodeIdx];
    const next = taperedNodes[nodeIdx + 1];
    const len = getDistance(curr, next);
    const anglePrev = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angleRad = anglePrev + ((180 - newAngle) * Math.PI / 180);
    next.x = curr.x + len * Math.cos(angleRad);
    next.y = curr.y + len * Math.sin(angleRad);
    draw();
}

// --- History ---
function saveHistory() {
    history.push({
        nodes: JSON.parse(JSON.stringify(nodes)),
        lines: JSON.parse(JSON.stringify(lines)),
        taperedNodes: JSON.parse(JSON.stringify(taperedNodes)),
        taperedLines: JSON.parse(JSON.stringify(taperedLines)),
        taperedMode: taperedMode,
        paintedSides: JSON.parse(JSON.stringify(paintedSides))
    });
    if (history.length > 100) history.shift();
}

function undo() {
    if (history.length > 0) {
        redoStack.push({
            nodes: JSON.parse(JSON.stringify(nodes)),
            lines: JSON.parse(JSON.stringify(lines)),
            taperedNodes: JSON.parse(JSON.stringify(taperedNodes)),
            taperedLines: JSON.parse(JSON.stringify(taperedLines)),
            taperedMode: taperedMode,
            paintedSides: JSON.parse(JSON.stringify(paintedSides))
        });
        const last = history.pop();
        nodes = JSON.parse(JSON.stringify(last.nodes));
        lines = JSON.parse(JSON.stringify(last.lines));
        taperedNodes = JSON.parse(JSON.stringify(last.taperedNodes));
        taperedLines = JSON.parse(JSON.stringify(last.taperedLines));
        taperedMode = last.taperedMode;
        paintedSides = JSON.parse(JSON.stringify(last.paintedSides));
        startNodeIdx = nodes.length > 0 ? nodes.length - 1 : null;
        draw();
    } else {
        redoStack.push({
            nodes: JSON.parse(JSON.stringify(nodes)),
            lines: JSON.parse(JSON.stringify(lines)),
            taperedNodes: JSON.parse(JSON.stringify(taperedNodes)),
            taperedLines: JSON.parse(JSON.stringify(taperedLines)),
            taperedMode: taperedMode,
            paintedSides: JSON.parse(JSON.stringify(paintedSides))
        });
        nodes = [];
        lines = [];
        taperedNodes = [];
        taperedLines = [];
        taperedMode = false;
        paintedSides = {};
        startNodeIdx = null;
        draw();
    }
}

function redo() {
    if (redoStack.length > 0) {
        history.push({
            nodes: JSON.parse(JSON.stringify(nodes)),
            lines: JSON.parse(JSON.stringify(lines)),
            taperedNodes: JSON.parse(JSON.stringify(taperedNodes)),
            taperedLines: JSON.parse(JSON.stringify(taperedLines)),
            taperedMode: taperedMode,
            paintedSides: JSON.parse(JSON.stringify(paintedSides))
        });
        const next = redoStack.pop();
        nodes = JSON.parse(JSON.stringify(next.nodes));
        lines = JSON.parse(JSON.stringify(next.lines));
        taperedNodes = JSON.parse(JSON.stringify(next.taperedNodes));
        taperedLines = JSON.parse(JSON.stringify(next.taperedLines));
        taperedMode = next.taperedMode;
        paintedSides = JSON.parse(JSON.stringify(next.paintedSides));
        startNodeIdx = nodes.length > 0 ? nodes.length - 1 : null;
        draw();
    }
}

// --- Drawing ---
let startNodeIdx = null;

canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('touchstart', handlePointerDown);

function handlePointerDown(e) {
    const pos = getTouchPos(e);

    // Paint mode: click a line to mark painted side
    if (paintMode) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const start = nodes[line.start];
            const end = nodes[line.end];
            // Check if click is near the line
            const dist = Math.abs((end.y - start.y) * pos.x - (end.x - start.x) * pos.y + end.x * start.y - end.y * start.x) /
                Math.hypot(end.x - start.x, end.y - start.y);
            if (dist < 12) { // threshold
                paintedSides[i] = getLineSide(line, pos);
                saveHistory();
                draw();
                break;
            }
        }
        return;
    }

    if (mode === 'draw') {
        const nodeIdx = nodes.findIndex(n => Math.hypot(n.x - pos.x, n.y - pos.y) < NODE_RADIUS);
        if (nodeIdx === -1) {
            // Add new node
            nodes.push({ x: pos.x, y: pos.y });
            saveHistory();
            draw();
            if (startNodeIdx !== null) {
                // Connect previous node to this one
                lines.push({ start: startNodeIdx, end: nodes.length - 1, length: null, angle: null });
                saveHistory();
                draw();
                startNodeIdx = nodes.length - 1;
            } else {
                startNodeIdx = nodes.length - 1;
            }
            // If tapered mode, update tapered drawing
            if (taperedMode) {
                taperedNodes = nodes.map(n => ({
                    x: n.x + 100,
                    y: n.y - 100
                }));
                taperedLines = lines.map(l => ({ ...l }));
            }
        } else {
            if (startNodeIdx !== null && startNodeIdx !== nodeIdx) {
                // Connect to existing node
                lines.push({ start: startNodeIdx, end: nodeIdx, length: null, angle: null });
                saveHistory();
                draw();
                startNodeIdx = nodeIdx;
                if (taperedMode) {
                    taperedNodes = nodes.map(n => ({
                        x: n.x + 100,
                        y: n.y - 100
                    }));
                    taperedLines = lines.map(l => ({ ...l }));
                }
            } else {
                startNodeIdx = nodeIdx;
            }
        }
    }
}

function getTouchPos(e) {
    let rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.touches) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = e.offsetX;
        y = e.offsetY;
    }
    return { x, y };
}

// Helper to get which side was clicked for painting
function getLineSide(line, mouse) {
    const start = nodes[line.start];
    const end = nodes[line.end];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    // Perpendicular vector
    const px = -dy;
    const py = dx;
    // Midpoint
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    // Mouse vector from midpoint
    const mxv = mouse.x - mx;
    const myv = mouse.y - my;
    // Dot product to determine side
    return (mxv * px + myv * py) > 0 ? 'left' : 'right';
}

// --- Summary ---
function getTotalWidth() {
    return lines.reduce((sum, line) => {
        return sum + (line.length || getDistance(nodes[line.start], nodes[line.end]));
    }, 0);
}

function getBendCount() {
    return nodes.length > 2 ? nodes.length - 2 : 0;
}

function updateSummary() {
    const summaryDiv = document.getElementById('flashing-summary');
    if (!summaryDiv) return;
    const totalWidth = getTotalWidth();
    const bends = getBendCount();
    const area = Math.round((totalWidth * flashingLength) / 1e6 * 100) / 100; // m², rounded to 2 decimals

            // Place Colour swatches directly under the drawing area and above the length input
            summaryDiv.innerHTML = `
                    <strong>Total Width:</strong> ${totalWidth} mm<br>
                    <strong>Bends:</strong> ${bends}<br>
                    <div style="margin-top:8px;">
                        <strong>Colour:</strong>
                        <div id="summary-colour-swatches" style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-left:8px; vertical-align:middle; max-width:360px;"></div>
                    </div>
                    <br>
                    <label for="flashing-length"><strong>Flashing Length (mm):</strong></label>
                    <input type="number" id="flashing-length" value="${flashingLength}" min="1" style="width:100px;">
                    <button id="flashing-length-confirm" class="node-label-btn" style="vertical-align:middle;margin-left:8px;">✔</button>
                    <br>
                    <label for="flash-quantity"><strong>Quantity:</strong></label>
                    <input type="number" id="flash-quantity" value="1" min="1" style="width:80px; margin-left:8px;" />
                    <br>
                    <strong>Total Area:</strong> ${area} m²
            `;

    const input = document.getElementById('flashing-length');
    const confirmBtn = document.getElementById('flashing-length-confirm');

    function confirmLength() {
        flashingLength = parseInt(input.value, 10) || flashingLength;
        updateSummary();
        draw();
    }

    confirmBtn.onclick = confirmLength;
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            confirmBtn.click();
        }
    });

    // After summary DOM is rebuilt, re-render swatches into the new container
    renderSwatches();
}

// --- Draw ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw grid
    ctx.strokeStyle = "#eee";
    for (let x = 0; x <= canvas.width; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw tapered flashing first (behind)
    if (taperedMode && taperedNodes.length > 1) {
        ctx.globalAlpha = 0.7;
        taperedLines.forEach(line => {
            ctx.strokeStyle = "#ff9800";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(taperedNodes[line.start].x, taperedNodes[line.start].y);
            ctx.lineTo(taperedNodes[line.end].x, taperedNodes[line.end].y);
            ctx.stroke();

            // Length label parallel to line (for back drawing)
            const x1 = taperedNodes[line.start].x;
            const y1 = taperedNodes[line.start].y;
            const x2 = taperedNodes[line.end].x;
            const y2 = taperedNodes[line.end].y;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const angle = Math.atan2(y2 - y1, x2 - x1);

            ctx.save();
            ctx.translate(mx, my);
            ctx.rotate(angle);
            ctx.fillStyle = "#ff9800";
            ctx.font = "bold 16px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillText(`${line.length || getDistance(taperedNodes[line.start], taperedNodes[line.end])}mm`, 0, -8);
            ctx.restore();
        });
        taperedNodes.forEach((node) => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = "#ff9800";
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        // Draw protractor arcs and angle values for tapered flashing
        for (let i = 1; i < taperedNodes.length - 1; i++) {
            const prev = taperedNodes[i - 1];
            const curr = taperedNodes[i];
            const next = taperedNodes[i + 1];
            const angleDeg = getAngle(prev, curr, next);

            // Calculate directions
            const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
            const v2 = { x: next.x - curr.x, y: next.y - curr.y };
            let a1 = Math.atan2(v1.y, v1.x);
            let a2 = Math.atan2(v2.y, v2.x);

            // Ensure arc is drawn on the internal angle
            let delta = a2 - a1;
            if (delta <= -Math.PI) delta += 2 * Math.PI;
            if (delta > Math.PI) delta -= 2 * Math.PI;
            if (delta < 0) {
                [a1, a2] = [a2, a1];
                delta = -delta;
            }

            ctx.save();
            ctx.strokeStyle = "#ff9800";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(curr.x, curr.y, 32, a1, a2, false);
            ctx.stroke();
            ctx.restore();

            // Draw angle value inside arc, in red, always upright and to the right
            ctx.save();
            ctx.fillStyle = "#d32f2f";
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            const midAngle = a1 + delta / 2;
            const labelX = curr.x + 44 * Math.cos(midAngle);
            const labelY = curr.y + 44 * Math.sin(midAngle);
            ctx.translate(labelX, labelY);
            ctx.rotate(0);
            ctx.fillText(`${Math.round(angleDeg)}°`, 0, 0);
            ctx.restore();
        }
        // Draw faded dotted grey connection lines between corresponding nodes
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = "rgba(128,128,128,0.5)";
        ctx.lineWidth = 2;
        for (let i = 0; i < Math.min(nodes.length, taperedNodes.length); i++) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(taperedNodes[i].x, taperedNodes[i].y);
            ctx.stroke();

            // Draw flashing length label parallel to the dotted line
            const mx = (nodes[i].x + taperedNodes[i].x) / 2;
            const my = (nodes[i].y + taperedNodes[i].y) / 2;
            const angle = Math.atan2(taperedNodes[i].y - nodes[i].y, taperedNodes[i].x - nodes[i].x);

            ctx.save();
            ctx.translate(mx, my);
            ctx.rotate(angle);
            ctx.fillStyle = "#888";
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillText(`${flashingLength}mm`, 0, -8);
            ctx.restore();
        }
        ctx.setLineDash([]);
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    // Draw main flashing (in front)
    lines.forEach((line, idx) => {
        ctx.strokeStyle = "#007bff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(nodes[line.start].x, nodes[line.start].y);
        ctx.lineTo(nodes[line.end].x, nodes[line.end].y);
        ctx.stroke();

        // Highlight painted side
        if (paintedSides[idx]) {
            const start = nodes[line.start];
            const end = nodes[line.end];
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            // Perpendicular offset
            const offset = 8;
            const len = Math.hypot(dx, dy);
            const ox = -dy / len * offset;
            const oy = dx / len * offset;
            let sx = start.x + ox, sy = start.y + oy, ex = end.x + ox, ey = end.y + oy;
            if (paintedSides[idx] === 'right') {
                sx = start.x - ox; sy = start.y - oy;
                ex = end.x - ox; ey = end.y - oy;
            }
            ctx.save();
            ctx.strokeStyle = "#43a047"; // green for painted
            ctx.lineWidth = 6;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Length label parallel to line
        const x1 = nodes[line.start].x;
        const y1 = nodes[line.start].y;
        const x2 = nodes[line.end].x;
        const y2 = nodes[line.end].y;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const angle = Math.atan2(y2 - y1, x2 - x1);

        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(angle);
        ctx.fillStyle = "#222";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(`${line.length || getDistance(nodes[line.start], nodes[line.end])}mm`, 0, -8);
        ctx.restore();
    });
    nodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#007bff";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Draw protractor arcs and angle values for main flashing
    for (let i = 1; i < nodes.length - 1; i++) {
        const prev = nodes[i - 1];
        const curr = nodes[i];
        const next = nodes[i + 1];
        const angleDeg = getAngle(prev, curr, next);

        // Calculate directions
        const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
        const v2 = { x: next.x - curr.x, y: next.y - curr.y };
        let a1 = Math.atan2(v1.y, v1.x);
        let a2 = Math.atan2(v2.y, v2.x);

        // Ensure arc is drawn on the internal angle
        let delta = a2 - a1;
        if (delta <= -Math.PI) delta += 2 * Math.PI;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < 0) {
            [a1, a2] = [a2, a1];
            delta = -delta;
        }

        ctx.save();
        ctx.strokeStyle = "#ff9800";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(curr.x, curr.y, 32, a1, a2, false);
        ctx.stroke();
        ctx.restore();

        // Draw angle value inside arc, in red, always upright and to the right
        ctx.save();
        ctx.fillStyle = "#d32f2f";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const midAngle = a1 + delta / 2;
        const labelX = curr.x + 44 * Math.cos(midAngle);
        const labelY = curr.y + 44 * Math.sin(midAngle);
        ctx.translate(labelX, labelY);
        ctx.rotate(0);
        ctx.fillText(`${Math.round(angleDeg)}°`, 0, 0);
        ctx.restore();
    }

    // Draw node/line labels for editing
    nodeLabelsDiv.innerHTML = '';
    if (mode === 'edit') {
        if (taperedMode) {
            // Edit the tapered flashing
            taperedLines.forEach((line, idx) => {
                const x1 = taperedNodes[line.start].x;
                const y1 = taperedNodes[line.start].y;
                const x2 = taperedNodes[line.end].x;
                const y2 = taperedNodes[line.end].y;
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;

                const group = document.createElement('div');
                group.className = 'node-label-group';
                group.style.left = `${mx + canvas.offsetLeft + 20}px`;
                group.style.top = `${my + canvas.offsetTop - 20}px`;

                const lengthInput = document.createElement('input');
                lengthInput.type = 'number';
                lengthInput.value = line.length || getDistance(taperedNodes[line.start], taperedNodes[line.end]);
                lengthInput.min = 1;
                lengthInput.className = 'node-label-input';
                lengthInput.placeholder = '__mm';

                let checkBtn = document.createElement('button');
                checkBtn.className = 'node-label-btn';
                checkBtn.innerHTML = '✔';
                checkBtn.style.opacity = 0;
                checkBtn.onclick = (e) => {
                    e.preventDefault();
                    updateTaperedLineLength(idx, parseFloat(lengthInput.value));
                    checkBtn.style.opacity = 0;
                    lengthInput.blur();
                };

                lengthInput.oninput = () => {
                    checkBtn.style.opacity = 1;
                };
                lengthInput.onblur = () => {
                    setTimeout(() => { checkBtn.style.opacity = 0; }, 200);
                };
                // Add Enter key support for line length
                lengthInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        checkBtn.click();
                    }
                });

                group.appendChild(lengthInput);
                group.appendChild(checkBtn);
                nodeLabelsDiv.appendChild(group);
            });
            // Angle input at each node (except first and last)
            for (let i = 1; i < taperedNodes.length - 1; i++) {
                const prev = taperedNodes[i - 1];
                const curr = taperedNodes[i];
                const next = taperedNodes[i + 1];
                const angleDeg = getAngle(prev, curr, next);

                const group = document.createElement('div');
                group.className = 'node-label-group angle';
                group.style.left = `${curr.x + canvas.offsetLeft - 30}px`;
                group.style.top = `${curr.y + canvas.offsetTop - 40}px`;

                const angleInput = document.createElement('input');
                angleInput.type = 'number';
                angleInput.value = Math.round(angleDeg);
                angleInput.className = 'node-label-input angle';
                angleInput.placeholder = '__°';

                let checkBtn = document.createElement('button');
                checkBtn.className = 'node-label-btn angle';
                checkBtn.innerHTML = '∠';
                checkBtn.style.opacity = 0;
                checkBtn.onclick = (e) => {
                    e.preventDefault();
                    updateTaperedNodeAngle(i, parseFloat(angleInput.value));
                    checkBtn.style.opacity = 0;
                    angleInput.blur();
                };

                angleInput.oninput = () => {
                    checkBtn.style.opacity = 1;
                };
                angleInput.onblur = () => {
                    setTimeout(() => { checkBtn.style.opacity = 0; }, 200);
                };
                // Add Enter key support for angle
                angleInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        checkBtn.click();
                    }
                });

                group.appendChild(angleInput);
                group.appendChild(checkBtn);
                nodeLabelsDiv.appendChild(group);
            }
        } else {
            // Edit the main flashing (as before)
            lines.forEach((line, idx) => {
                const x1 = nodes[line.start].x;
                const y1 = nodes[line.start].y;
                const x2 = nodes[line.end].x;
                const y2 = nodes[line.end].y;
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;

                const group = document.createElement('div');
                group.className = 'node-label-group';
                group.style.left = `${mx + canvas.offsetLeft + 20}px`;
                group.style.top = `${my + canvas.offsetTop - 20}px`;

                const lengthInput = document.createElement('input');
                lengthInput.type = 'number';
                lengthInput.value = line.length || getDistance(nodes[line.start], nodes[line.end]);
                lengthInput.min = 1;
                lengthInput.className = 'node-label-input';
                lengthInput.placeholder = '__mm';

                let checkBtn = document.createElement('button');
                checkBtn.className = 'node-label-btn';
                checkBtn.innerHTML = '✔';
                checkBtn.style.opacity = 0;
                checkBtn.onclick = (e) => {
                    e.preventDefault();
                    updateLineLength(idx, parseFloat(lengthInput.value));
                    checkBtn.style.opacity = 0;
                    lengthInput.blur();
                };

                lengthInput.oninput = () => {
                    checkBtn.style.opacity = 1;
                };
                lengthInput.onblur = () => {
                    setTimeout(() => { checkBtn.style.opacity = 0; }, 200);
                };
                // Add Enter key support for line length
                lengthInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        checkBtn.click();
                    }
                });

                group.appendChild(lengthInput);
                group.appendChild(checkBtn);
                nodeLabelsDiv.appendChild(group);
            });
            for (let i = 1; i < nodes.length - 1; i++) {
                const prev = nodes[i - 1];
                const curr = nodes[i];
                const next = nodes[i + 1];
                const angleDeg = getAngle(prev, curr, next);

                const group = document.createElement('div');
                group.className = 'node-label-group angle';
                group.style.left = `${curr.x + canvas.offsetLeft - 30}px`;
                group.style.top = `${curr.y + canvas.offsetTop - 40}px`;

                const angleInput = document.createElement('input');
                angleInput.type = 'number';
                angleInput.value = Math.round(angleDeg);
                angleInput.className = 'node-label-input angle';
                angleInput.placeholder = '__°';

                let checkBtn = document.createElement('button');
                checkBtn.className = 'node-label-btn angle';
                checkBtn.innerHTML = '∠';
                checkBtn.style.opacity = 0;
                checkBtn.onclick = (e) => {
                    e.preventDefault();
                    updateNodeAngle(i, parseFloat(angleInput.value));
                    checkBtn.style.opacity = 0;
                    angleInput.blur();
                };

                angleInput.oninput = () => {
                    checkBtn.style.opacity = 1;
                };
                angleInput.onblur = () => {
                    setTimeout(() => { checkBtn.style.opacity = 0; }, 200);
                };
                // Add Enter key support for angle
                angleInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        checkBtn.click();
                    }
                });

                group.appendChild(angleInput);
                group.appendChild(checkBtn);
                nodeLabelsDiv.appendChild(group);
            }
        }
    }
    updateSummary();
}

draw();