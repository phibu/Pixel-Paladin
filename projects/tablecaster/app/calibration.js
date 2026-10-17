// Tablecaster Calibration (#63): a four-corner perspective warp (homography as CSS matrix3d on the Battlefield svg),
// one profile per screen, and the wizard that sets it up inside the projection view.
//
// Transform stack, inside out: Layout content -> Swap sides -> Mirror (both inside the svg, engine.js) -> warp (this file,
// on the svg element). Swap sides and Mirror never touch the profile.
//
// Profile (localStorage, device state, never in the hash; Reset device data clears every key under `tablecaster.`):
//   tablecaster.calibration.<W>x<H>   JSON { v: 1, quad: [[x,y] TL, TR, BR, BL], screen: [W, H], savedAt: ISO }
//   W×H = CSS `screen.width` × `screen.height` of the window that shows the render. quad = fractions of the
//   render window (the projection stage, = the viewport/screen in the projection view). Unknown screen = not calibrated.
//
// Wizard: place (TL, TR, BR, BL with crosshair lines) -> refine (drag handles, nudge pad) -> verify (three 10″ bars;
// Yes saves, No goes back to refine). Adjust starts at refine. Esc cancels and keeps the stored profile.
// Wall mode (state.wall): no warp, no wizard, no prompt; the stored profile stays.

export const W = 60, H = 44;
export const PREFIX = 'tablecaster.calibration.';
export const CORNER_NAMES = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
const STEPS = [1, 10, 0.25];
export const HINT_MS = 6000;

// ---------- math ----------
// 3×3 homography mapping 4 src points onto 4 dst points (h22 = 1), Gaussian elimination with partial pivoting.
export function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) if (r !== c) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}
export const applyH = (M, [x, y]) => {
  const w = M[2][0] * x + M[2][1] * y + M[2][2];
  return [(M[0][0] * x + M[0][1] * y + M[0][2]) / w, (M[1][0] * x + M[1][1] * y + M[1][2]) / w];
};
export const css3d = (M) => `matrix3d(${[M[0][0], M[1][0], 0, M[2][0], M[0][1], M[1][1], 0, M[2][1], 0, 0, 1, 0, M[0][2], M[1][2], 0, M[2][2]].join(',')})`;

// ---------- profiles ----------
export const screenKey = (scr = screen) => `${Math.round(scr.width)}x${Math.round(scr.height)}`;
export const profileKey = (key = screenKey()) => PREFIX + key;
const validQuad = (q) => Array.isArray(q) && q.length === 4 && q.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite));
export function loadProfile(key = screenKey()) {
  try {
    const p = JSON.parse(localStorage.getItem(profileKey(key)));
    return p && p.v === 1 && validQuad(p.quad) ? p : null;
  } catch { return null; }
}
export function saveProfile(quad, scr = screen) {
  const p = { v: 1, quad: quad.map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)]), screen: [Math.round(scr.width), Math.round(scr.height)], savedAt: new Date().toISOString() };
  try { localStorage.setItem(profileKey(screenKey(scr)), JSON.stringify(p)); } catch { /* not persisted: kept for this session */ }
  return p;
}

const NS = 'vector-effect="non-scaling-stroke"';

// stage: the projection stage (holds the svg). panelEl: the setup panel section, or null (?projector).
// projection: { dispatch, isProjecting, setKeyOverride } from projection.js. getState: app state (wall).
// redraw(): re-render the Battlefield (calls afterDraw again).
export function createCalibration({ stage, svg, panelEl, projection, getState, redraw }) {
  const html = document.documentElement;
  const listeners = new Set();
  let profile = null;   // the stored profile for the current screen
  let key = '';
  let cal = null;       // wizard: { step, placed: [[fx,fy]], cursor: [fx,fy], quad: [[fx,fy]×4], sel, stepIdx, history: [] }
  let sessionQuad = null; // saved while storage is blocked: still used for this session
  let drawnStep = null;   // the wizard step the svg decorations were last drawn for

  // ---------- DOM: overlay (crosshair, handles) + HUD with the nudge pad ----------
  stage.insertAdjacentHTML('beforeend', `
    <div class="tc-cal" data-cal hidden>
      <svg class="tc-cal-ov" data-cal-overlay xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg>
      <div class="tc-cal-hud" data-cal-hud role="dialog" aria-label="Calibration"></div>
    </div>
    <div class="tc-cal-prompt" data-cal-prompt role="status">
      <span>Not calibrated for this screen.</span>
      <button type="button" data-cal-action="start">Calibrate <kbd>C</kbd></button>
    </div>`);
  const root = stage.querySelector('[data-cal]');
  const ov = root.querySelector('[data-cal-overlay]');
  const hud = root.querySelector('[data-cal-hud]');
  const promptEl = stage.querySelector('[data-cal-prompt]');

  // ---------- panel: status + Calibrate button (room for Reset device data in .tc-cal-actions) ----------
  if (panelEl) {
    panelEl.innerHTML = `
      <p class="eyebrow" id="tc-cal-h">Calibration</p>
      <p class="tc-cal-status" data-cal-status></p>
      <div class="tc-cal-actions" data-cal-actions>
        <button type="button" class="btn btn-ghost tc-cal-btn" data-action="calibrate">Calibrate</button>
      </div>`;
    panelEl.addEventListener('click', (e) => { if (e.target.closest('[data-action=calibrate]')) projection.dispatch('calibrate'); });
  }

  const rect = () => { const r = stage.getBoundingClientRect(); return { w: r.width || 1, h: r.height || 1 }; };
  const toPx = (q) => { const { w, h } = rect(); return q.map(([x, y]) => [x * w, y * h]); };
  const currentQuad = () => (cal && cal.step !== 'place' ? cal.quad : profile?.quad || sessionQuad);

  // ---------- warp ----------
  function applyWarp() {
    const s = getState();
    const quad = projection.isProjecting() && !s.wall ? currentQuad() : null;
    if (!quad) { svg.style.cssText = ''; return; }
    const { w, h } = rect();
    const b = Math.min(w / W, h / H);
    const M = homography([[0, 0], [W * b, 0], [W * b, H * b], [0, H * b]], toPx(quad));
    svg.style.cssText = `position:absolute;left:0;top:0;width:${W * b}px;height:${H * b}px;max-width:none;transform-origin:0 0;transform:${css3d(M)}`;
  }

  // Called by app.js after every render: verify bars and corner marks in inch space, outside Swap/Mirror.
  function afterDraw() {
    if (!cal || cal.step === 'place') return;
    const g = 'var(--pp-warning, #f5a524)';
    let s = `<g data-cal-marks>`;
    for (const [x, y] of [[0, 0], [W, 0], [W, H], [0, H]]) s += `<path d="M${x} ${y}h${x ? -2 : 2}M${x} ${y}v${y ? -2 : 2}" stroke="${g}" stroke-width="4" fill="none" ${NS}/>`;
    if (cal.step === 'verify') {
      const bar = (x, y, id, label) => `<g data-cal-bar="${id}"><rect x="${x}" y="${y}" width="10" height=".35" fill="${g}"/>`
        + `<path d="M${x} ${y - 0.4}v1.15M${x + 10} ${y - 0.4}v1.15" stroke="${g}" stroke-width="2" ${NS}/>`
        + `<text x="${x + 5}" y="${y - 0.3}" text-anchor="middle" font-size=".7" fill="${g}" font-family="ui-monospace,Consolas,monospace">${label}</text></g>`;
      s += bar(3, 3, 'tl', '10″') + bar(25, 21.825, 'centre', '10″') + bar(47, 41, 'br', '10″');
    }
    svg.insertAdjacentHTML('beforeend', s + '</g>');
  }

  // ---------- status ----------
  function refresh() {
    const k = screenKey();
    if (k !== key) { key = k; profile = loadProfile(k); sessionQuad = null; }
    const s = getState();
    const calibrated = !!(profile || sessionQuad);
    html.toggleAttribute('data-calibrated', calibrated);
    if (cal) html.dataset.calibrating = cal.step; else delete html.dataset.calibrating;
    promptEl.hidden = calibrated || !!cal || !!s.wall || !projection.isProjecting();
    if (panelEl) {
      const st = panelEl.querySelector('[data-cal-status]');
      const btn = panelEl.querySelector('[data-action=calibrate]');
      const size = key.replace('x', ' × ');
      st.dataset.state = s.wall ? 'wall' : calibrated ? 'calibrated' : 'none';
      st.textContent = s.wall
        ? `Wall mode is on: no Calibration. ${calibrated ? 'The table Calibration for this screen is kept.' : ''}`.trim()
        : calibrated ? `Calibrated for this screen (${size}).` : `Not calibrated for this screen (${size}).`;
      btn.textContent = calibrated ? 'Adjust' : 'Calibrate';
      btn.disabled = !!s.wall;
    }
    applyWarp();
  }

  // ---------- wizard ----------
  function begin(step) {
    if (getState().wall) return false;
    if (!projection.isProjecting()) projection.dispatch('enter');
    const q = profile?.quad || sessionQuad;
    if (step === 'refine' && !q) step = 'place';
    cal = { step, placed: [], cursor: [0.5, 0.5], quad: q ? q.map((p) => p.slice()) : null, sel: 0, stepIdx: 0, history: [] };
    projection.setKeyOverride(onKey);
    show();
    return true;
  }
  const start = () => begin(profile || sessionQuad ? 'refine' : 'place');
  const adjust = () => begin('refine');
  function end() {
    cal = null;
    projection.setKeyOverride(null);
    root.hidden = true;
    drawnStep = null;
    redraw();
    refresh();
  }
  function cancel() { if (cal) end(); }
  function finish() {
    const p = saveProfile(cal.quad);
    profile = loadProfile(key) || null;
    if (!profile) sessionQuad = p.quad;
    end();
    for (const fn of listeners) fn(p);
  }
  function setStep(step) {
    cal.step = step;
    if (step === 'place') { cal.placed = []; cal.cursor = [0.5, 0.5]; }
    show();
  }
  function place(pt) {
    cal.placed.push(pt);
    if (cal.placed.length === 4) { cal.quad = cal.placed.map((p) => p.slice()); cal.sel = 0; cal.history = []; cal.step = 'refine'; }
    show();
  }
  function undo() {
    if (cal.step === 'place') cal.placed.pop();
    else if (cal.step === 'refine' && cal.history.length) cal.quad = cal.history.pop();
    show();
  }
  function nudge(dx, dy, px = STEPS[cal.stepIdx]) {
    const { w, h } = rect();
    if (cal.step === 'place') cal.cursor = [cal.cursor[0] + (dx * px) / w, cal.cursor[1] + (dy * px) / h];
    else if (cal.step === 'refine') {
      cal.history.push(cal.quad.map((p) => p.slice()));
      const c = cal.quad[cal.sel];
      cal.quad[cal.sel] = [c[0] + (dx * px) / w, c[1] + (dy * px) / h];
    }
    show();
  }
  const select = (i) => { cal.sel = ((i % 4) + 4) % 4; show(); };

  // ---------- keys (override the projection keys while calibrating) ----------
  const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  function onKey(e) {
    if (!cal || e.ctrlKey || e.metaKey) return false;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const step = cal.step;
    if (k === 'Escape') { cancel(); return true; }
    if (ARROWS[k]) { if (step !== 'verify') nudge(...ARROWS[k], e.shiftKey ? 10 : e.altKey ? 0.25 : 1); return true; }
    if (k === 'Tab') { if (step === 'refine') select(cal.sel + (e.shiftKey ? -1 : 1)); return true; }
    if (/^[1-4]$/.test(k)) { if (step === 'refine') select(+k - 1); return true; }
    if (/^[5-8]$/.test(k) || k === 'c') return true; // no layer toggles or restart mid-wizard
    if (k === 'Enter') {
      if (step === 'place') place(cal.cursor.slice());
      else if (step === 'refine') setStep('verify');
      else finish();
      return true;
    }
    if (k === 'Backspace') { if (step === 'verify') setStep('refine'); else undo(); return true; }
    if (step === 'verify' && k === 'y') { finish(); return true; }
    if (step === 'verify' && k === 'n') { setStep('refine'); return true; }
    return false; // R, M, G, F still work (Swap/Mirror apply inside the calibrated frame)
  }

  // ---------- overlay + HUD ----------
  function show() {
    root.hidden = false;
    html.dataset.calibrating = cal.step;
    const { w, h } = rect();
    ov.setAttribute('viewBox', `0 0 ${w} ${h}`);
    let s = '';
    if (cal.step === 'place') {
      const pts = toPx(cal.placed);
      pts.forEach(([x, y], i) => { s += `<circle cx="${x}" cy="${y}" r="6" class="tc-cal-dot"/><text x="${x + 10}" y="${y - 10}" class="tc-cal-txt">${i + 1}</text>`; });
      if (pts.length > 1) s += `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" class="tc-cal-line"/>`;
      const [cx, cy] = toPx([cal.cursor])[0];
      s += `<path data-cal-cross d="M0 ${cy}H${w}M${cx} 0V${h}" class="tc-cal-line"/><circle cx="${cx}" cy="${cy}" r="14" class="tc-cal-ring"/>`;
    } else if (cal.step === 'refine') {
      toPx(cal.quad).forEach(([x, y], i) => {
        const on = i === cal.sel;
        s += `<g class="tc-cal-h${on ? ' is-sel' : ''}" data-cal-handle="${i}"><circle cx="${x}" cy="${y}" r="22"/>`
          + `<path d="M${x - 30} ${y}H${x + 30}M${x} ${y - 30}V${y + 30}"/>`
          + `<text x="${x}" y="${y + (i > 1 ? -32 : 44)}" text-anchor="middle">${i + 1}</text></g>`;
      });
    }
    ov.innerHTML = s;
    hud.innerHTML = hudHtml();
    if (cal.step !== drawnStep) { drawnStep = cal.step; redraw(); }
    refresh();
  }

  const btn = (action, label, extra = '') => `<button type="button" data-cal-action="${action}"${extra}>${label}</button>`;
  function hudHtml() {
    const st = cal.step;
    const steps = ['place', 'refine', 'verify'].map((k, i) => `<li${k === st ? ' aria-current="step"' : ''}>${i + 1} · ${cap(k)}</li>`).join('');
    const pad = `<div class="tc-cal-pad" role="group" aria-label="Nudge">
        ${btn('nudge', '↑', ' data-dx="0" data-dy="-1" aria-label="Up"')}${btn('nudge', '←', ' data-dx="-1" data-dy="0" aria-label="Left"')}
        ${btn('nudge', '→', ' data-dx="1" data-dy="0" aria-label="Right"')}${btn('nudge', '↓', ' data-dx="0" data-dy="1" aria-label="Down"')}
      </div>${btn('step', `Step ${STEPS[cal.stepIdx]} px`, ' data-cal-step')}`;
    let body = '';
    if (st === 'place') {
      body = `<p>Tap the <b data-cal-corner>${CORNER_NAMES[cal.placed.length]}</b> corner of the mat (${cal.placed.length + 1} of 4).</p>
        <div class="tc-cal-row">${pad}</div>
        <div class="tc-cal-row">${btn('place', 'Place <kbd>Enter</kbd>')}${btn('undo', 'Undo <kbd>⌫</kbd>', cal.placed.length ? '' : ' disabled')}${btn('cancel', 'Cancel <kbd>Esc</kbd>')}</div>`;
    } else if (st === 'refine') {
      body = `<p>Drag a corner onto the mat corner, or nudge it.</p>
        <div class="tc-cal-row"><span class="tc-cal-corners" role="group" aria-label="Corner">${[0, 1, 2, 3].map((i) => btn('select', `${i + 1}`, ` data-i="${i}" aria-pressed="${i === cal.sel}" aria-label="Corner ${i + 1}, ${CORNER_NAMES[i]}"`)).join('')}</span>${pad}</div>
        <div class="tc-cal-row">${btn('undo', 'Undo', cal.history.length ? '' : ' disabled')}${btn('replace', 'Re-place')}${btn('cancel', 'Cancel <kbd>Esc</kbd>')}${btn('next', 'Verify <kbd>Enter</kbd>', ' class="is-primary"')}</div>`;
    } else {
      body = `<p>Measure the three gold bars with a ruler. Do they all read 10″?</p>
        <div class="tc-cal-row">${btn('no', 'No, refine <kbd>N</kbd>')}${btn('yes', 'Yes, save <kbd>Y</kbd>', ' class="is-primary"')}${btn('cancel', 'Cancel <kbd>Esc</kbd>')}</div>`;
    }
    return `<ol class="tc-cal-steps">${steps}</ol>${body}`;
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  hud.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cal-action]');
    if (!b || !cal) return;
    const a = b.dataset.calAction;
    if (a === 'nudge') nudge(+b.dataset.dx, +b.dataset.dy);
    else if (a === 'step') { cal.stepIdx = (cal.stepIdx + 1) % STEPS.length; show(); }
    else if (a === 'place') place(cal.cursor.slice());
    else if (a === 'undo') undo();
    else if (a === 'cancel') cancel();
    else if (a === 'select') select(+b.dataset.i);
    else if (a === 'replace') setStep('place');
    else if (a === 'next') setStep('verify');
    else if (a === 'no') setStep('refine');
    else if (a === 'yes') finish();
  });
  promptEl.addEventListener('click', (e) => { if (e.target.closest('[data-cal-action=start]')) projection.dispatch('calibrate'); });

  // ---------- pointer: tap to place (place), drag handles (refine) ----------
  let drag = null;
  const frac = (e) => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  ov.addEventListener('pointerdown', (e) => {
    if (!cal) return;
    if (cal.step === 'place') { place(frac(e)); return; }
    const hEl = e.target.closest('[data-cal-handle]');
    if (cal.step !== 'refine' || !hEl) return;
    cal.sel = +hEl.dataset.calHandle;
    cal.history.push(cal.quad.map((p) => p.slice()));
    const [fx, fy] = frac(e), c = cal.quad[cal.sel];
    drag = { dx: c[0] - fx, dy: c[1] - fy, id: e.pointerId };
    ov.setPointerCapture?.(e.pointerId);
    e.preventDefault();
    show();
  });
  ov.addEventListener('pointermove', (e) => {
    if (!cal) return;
    if (cal.step === 'place' && e.pointerType === 'mouse') { cal.cursor = frac(e); show(); return; }
    if (drag && drag.id === e.pointerId) { const [fx, fy] = frac(e); cal.quad[cal.sel] = [fx + drag.dx, fy + drag.dy]; show(); }
  });
  const endDrag = () => { drag = null; };
  ov.addEventListener('pointerup', endDrag);
  ov.addEventListener('pointercancel', endDrag);

  // Leaving the projection view (browser Esc, Exit) cancels the wizard; entering re-applies the warp.
  // The "not calibrated" prompt also shows for HINT_MS after entering (the bar is hidden on entry).
  let wasProjecting = false, hintTimer = 0;
  function onView() {
    const now = projection.isProjecting();
    if (now && !wasProjecting) {
      html.dataset.calHint = '';
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => delete html.dataset.calHint, HINT_MS);
    } else if (!now) { clearTimeout(hintTimer); delete html.dataset.calHint; }
    wasProjecting = now;
    if (cal && !now) cancel(); else if (cal) show(); else refresh();
  }
  new MutationObserver(onView).observe(html, { attributes: true, attributeFilter: ['data-view'] });
  onView();
  new ResizeObserver(() => { if (cal) show(); else refresh(); }).observe(stage);
  addEventListener('storage', (e) => { if (!e.key || e.key.startsWith(PREFIX)) reload(); });

  // Re-read the profile from storage (another window saved one: #65's `profile-changed` ping).
  function reload() { key = ''; refresh(); }

  refresh();
  return {
    start, adjust, cancel, reload, refresh, afterDraw,
    isCalibrating: () => !!cal, step: () => cal?.step || null,
    status: () => ({ key, calibrated: !!(profile || sessionQuad), profile }),
    // #65: fn(profile) after a profile is saved, e.g. to send a `profile-changed` ping.
    onProfileChanged(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
