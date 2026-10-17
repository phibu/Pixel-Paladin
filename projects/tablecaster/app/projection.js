// Tablecaster projection view (#62): the Battlefield fullscreen on black, no panel. Owns the action layer:
// one dispatcher, `dispatch(action, arg)`, used by the keys, the touch bar and (later) the projector window's
// BroadcastChannel (#65). Calibration (#63) can take over the keyboard with `setKeyOverride(fn)`.
//
// Actions:  enter · leave · fullscreen (toggle the Fullscreen API) · swap · mirror · grid · layer <name>
//           variant <A|B|C> · next · prev (A/B/C of the current Pairing, wrapping) · layers (open the bar's layer row)
//           calibrate (reserved for #63, does nothing yet)
// View state on <html>: data-view="projection" while projecting · data-fs="api"|"css" (Fullscreen API or the
//           CSS full-viewport fallback, e.g. iPhone) · data-idle (cursor and bar hidden after IDLE_MS without pointer input)
//           · data-bar-layers (layer row open).
import { LAYERS } from './engine.js?v=20261017b';
import { nextGrid, LAYER_LABELS, GRID_LABELS } from './controls.js?v=20261017b';
import { layoutsFor } from './picker.js?v=20261017b';

export const IDLE_MS = 2500;
export const TOAST_MS = 2000;

// Single keys -> [action, arg]. Only F (enter) works in the setup view; the rest apply while projecting.
export const KEYS = [
  ['r', 'swap', 'R', 'Swap sides'],
  ['m', 'mirror', 'M', 'Mirror'],
  ['g', 'grid', 'G', 'Grid style'],
  ['f', 'fullscreen', 'F', 'Fullscreen on/off'],
  ['arrows', null, '← →', 'Layout A/B/C'],
  ['digits', null, '1–8', 'Layers, in panel order'],
  ['escape', 'leave', 'Esc', 'Leave the projection'],
];
function keyAction(e) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'ArrowRight') return ['next'];
  if (k === 'ArrowLeft') return ['prev'];
  if (k === 'Escape') return ['leave'];
  if (k === 'c') return ['calibrate'];
  if (/^[1-8]$/.test(k)) return ['layer', LAYERS[+k - 1]];
  const hit = KEYS.find(([key]) => key === k);
  return hit ? [hit[1]] : null;
}

const variantOf = (id) => String(id || '').split('/')[1] || '';
const pairOf = (id) => String(id || '').split('/')[0].split('+');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// stage: the element that goes fullscreen (holds the svg, bar, toast). getState/update/choose/getData come from app.js.
// standalone: the ?projector window, always in the projection view (Esc only leaves fullscreen).
export function createProjection({ stage, panelEl, getState, update, choose, getData, standalone = false }) {
  const html = document.documentElement;
  const listeners = new Set();
  let keyOverride = null, wakeLock = null, idleTimer = 0, toastTimer = 0, fsByUs = false;

  // ---------- DOM: bar, toast, rotate hint (inside the stage, so they are part of the fullscreen element) ----------
  stage.insertAdjacentHTML('beforeend', `
    <div class="tc-bar" data-bar role="toolbar" aria-label="Projection controls">
      <div class="tc-bar-layers" data-bar-layers>${LAYERS.map((l) => `<button type="button" data-action="layer" data-arg="${l}" aria-pressed="true">${esc(LAYER_LABELS[l] || l)}</button>`).join('')}</div>
      <div class="tc-bar-row">
        <button type="button" data-action="swap" aria-pressed="false">Swap sides</button>
        <span class="tc-bar-variants" role="group" aria-label="Layout">${['A', 'B', 'C'].map((x) => `<button type="button" data-action="variant" data-arg="${x}" aria-pressed="false">${x}</button>`).join('')}</span>
        <button type="button" data-action="mirror" aria-pressed="false">Mirror</button>
        <button type="button" data-action="grid">Grid</button>
        <button type="button" data-action="layers" aria-expanded="false">Layers ▸</button>
        ${standalone ? '' : '<button type="button" data-action="leave">Exit</button>'}
      </div>
    </div>
    <div class="tc-toast" data-toast role="status" aria-live="polite"></div>
    <div class="tc-rotate" data-rotate-hint aria-hidden="true">Rotate your phone to landscape</div>`);
  const bar = stage.querySelector('[data-bar]');
  const toastEl = stage.querySelector('[data-toast]');

  // ---------- panel: Project button + key list ----------
  if (panelEl) {
    panelEl.innerHTML = `
      <p class="eyebrow" id="tc-proj-h">Projection</p>
      <button type="button" class="btn btn-primary tc-project" data-action="enter">Project</button>
      <p class="tc-hint">Tap the projection for controls. Keys while projecting:</p>
      <dl class="tc-keys" data-keys>${KEYS.map(([, , label, what]) => `<div><dt><kbd class="pp-kbd">${esc(label)}</kbd></dt><dd>${esc(what)}</dd></div>`).join('')}</dl>`;
    panelEl.addEventListener('click', (e) => { const b = e.target.closest('[data-action]'); if (b) dispatch(b.dataset.action, b.dataset.arg); });
  }

  const projecting = () => html.dataset.view === 'projection';

  // ---------- Wake Lock: held while projecting, re-acquired when the page is visible again ----------
  async function lockWake() {
    if (!projecting() || !navigator.wakeLock || document.visibilityState !== 'visible') return;
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch { wakeLock = null; }
  }
  function releaseWake() { const w = wakeLock; wakeLock = null; w?.release?.().catch?.(() => {}); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') lockWake(); });

  // ---------- Fullscreen API, with the CSS full-viewport view as fallback (iPhone) ----------
  const fsAvailable = () => !!(document.fullscreenEnabled && stage.requestFullscreen);
  async function fsOn() {
    if (!fsAvailable()) { html.dataset.fs = 'css'; return false; }
    try {
      fsByUs = true;
      await stage.requestFullscreen({ navigationUI: 'hide' });
      html.dataset.fs = 'api';
      screen.orientation?.lock?.('landscape').catch(() => {});
      return true;
    } catch { fsByUs = false; html.dataset.fs = 'css'; return false; }
  }
  async function fsOff() {
    html.dataset.fs = 'css';
    if (document.fullscreenElement) { fsByUs = false; try { await document.exitFullscreen(); } catch { /* already out */ } }
  }
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) return;
    // Left fullscreen from outside (the browser eats Esc): leave the projection view too.
    if (fsByUs && projecting() && !standalone) { fsByUs = false; leave(); return; }
    fsByUs = false;
    if (projecting()) html.dataset.fs = 'css';
  });

  // ---------- enter / leave ----------
  async function enter() {
    if (projecting()) return;
    html.dataset.view = 'projection';
    idle();
    await fsOn();
    lockWake();
  }
  function leave() {
    if (standalone) { fsOff(); return; }
    if (!projecting()) return;
    delete html.dataset.view; delete html.dataset.fs; delete html.dataset.idle; delete html.dataset.barLayers;
    clearTimeout(idleTimer);
    releaseWake();
    if (document.fullscreenElement) { fsByUs = false; document.exitFullscreen().catch(() => {}); }
    panelEl?.querySelector('[data-action=enter]')?.focus({ preventScroll: true });
  }

  // ---------- idle: cursor and bar hide after IDLE_MS without pointer input ----------
  function idle() { clearTimeout(idleTimer); html.dataset.idle = ''; delete html.dataset.barLayers; }
  function wake() {
    if (!projecting()) return;
    delete html.dataset.idle;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(idle, IDLE_MS);
  }
  stage.addEventListener('pointermove', wake);
  stage.addEventListener('pointerdown', wake);

  // ---------- toast ----------
  function toast(text) {
    if (!text) return;
    toastEl.textContent = text;
    toastEl.dataset.show = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => delete toastEl.dataset.show, TOAST_MS);
  }
  const prefix = (s) => (s.layoutId ? `Layout ${variantOf(s.layoutId)} · ` : '');

  // ---------- the dispatcher ----------
  function variants() {
    const s = getState(); const [a, b] = pairOf(s.layoutId);
    return s.layoutId ? layoutsFor(getData(), a, b) : [];
  }
  function chooseVariant(L) {
    if (!L || L.id === getState().layoutId) return null;
    choose(L.id);
    const s = getState();
    return `Layout ${variantOf(s.layoutId)}${s.swap ? ' · sides swapped' : ''}`;
  }

  function dispatch(action, arg) {
    const s = getState();
    let msg = null;
    switch (action) {
      case 'enter': enter(); break;
      case 'leave': leave(); break;
      case 'calibrate': break; // reserved for #63
      case 'fullscreen':
        if (!projecting()) { enter(); break; }
        if (document.fullscreenElement) { fsOff(); msg = 'Fullscreen off'; } else { fsOn(); msg = 'Fullscreen on'; }
        break;
      case 'swap': update({ swap: !s.swap }); msg = prefix(s) + (s.swap ? 'sides restored' : 'sides swapped'); break;
      case 'mirror': update({ mirror: !s.mirror }); msg = prefix(s) + (s.mirror ? 'mirror off' : 'mirrored'); break;
      case 'grid': { const g = nextGrid(s.grid); update({ grid: g }); msg = prefix(s) + 'grid: ' + (GRID_LABELS[g] || g); break; }
      case 'layer': {
        if (!LAYERS.includes(arg)) break;
        const off = s.hidden.includes(arg);
        update({ hidden: off ? s.hidden.filter((x) => x !== arg) : [...s.hidden, arg] });
        msg = prefix(s) + (LAYER_LABELS[arg] || arg) + (off ? ' on' : ' off');
        break;
      }
      case 'variant': msg = chooseVariant(variants().find((L) => variantOf(L.id) === arg)); break;
      case 'next': case 'prev': {
        const list = variants(); const i = list.findIndex((L) => L.id === s.layoutId);
        if (list.length > 1 && i >= 0) msg = chooseVariant(list[(i + (action === 'next' ? 1 : list.length - 1)) % list.length]);
        break;
      }
      case 'layers': {
        const open = !('barLayers' in html.dataset);
        if (open) html.dataset.barLayers = ''; else delete html.dataset.barLayers;
        bar.querySelector('[data-action=layers]').setAttribute('aria-expanded', String(open));
        break;
      }
      default: return false;
    }
    if (msg && projecting()) toast(cap(msg));
    for (const fn of listeners) fn(action, arg);
    return true;
  }

  // ---------- input: keys and the bar ----------
  document.addEventListener('keydown', (e) => {
    if (keyOverride && keyOverride(e)) { e.preventDefault(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.target.closest?.('input, select, textarea, [contenteditable]')) return;
    const a = keyAction(e);
    if (!a) return;
    if (!projecting() && a[0] !== 'fullscreen' && a[0] !== 'calibrate') return;
    e.preventDefault();
    dispatch(a[0], a[1]);
  });
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    wake();
    dispatch(b.dataset.action, b.dataset.arg);
  });

  // Reflect state in the bar (called on every commit).
  function sync(s) {
    bar.querySelector('[data-action=swap]').setAttribute('aria-pressed', String(!!s.swap));
    bar.querySelector('[data-action=mirror]').setAttribute('aria-pressed', String(!!s.mirror));
    bar.querySelector('[data-action=grid]').textContent = 'Grid: ' + (GRID_LABELS[s.grid] || s.grid);
    for (const b of bar.querySelectorAll('[data-action=layer]')) b.setAttribute('aria-pressed', String(!s.hidden.includes(b.dataset.arg)));
    const have = new Set(variants().map((L) => variantOf(L.id)));
    for (const b of bar.querySelectorAll('[data-action=variant]')) {
      b.disabled = !have.has(b.dataset.arg);
      b.setAttribute('aria-pressed', String(variantOf(s.layoutId) === b.dataset.arg));
    }
  }

  if (standalone) { html.dataset.view = 'projection'; html.dataset.fs = 'css'; idle(); lockWake(); }

  return {
    dispatch, sync, isProjecting: projecting,
    // #63: fn(keydownEvent) -> true to consume the key (e.g. while calibrating); null to restore the default keys.
    setKeyOverride(fn) { keyOverride = fn || null; },
    // #65: fn(action, arg) after every dispatched action, e.g. to forward it to the projector window.
    onDispatch(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
