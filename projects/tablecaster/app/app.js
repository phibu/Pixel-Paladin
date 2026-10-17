// Tablecaster tool page: loads the layout data, keeps one state object in sync with the URL hash,
// and hands it to the engine. Runs on /projects/tablecaster/app/ (setup view) and with ?projector
// (chrome-less full-viewport render; the projector window ticket adds the sync).
import { render } from './engine.js?v=20261017';
import { defaultState, parseHash, formatHash } from './state.js?v=20261017';
import { loadDevice, saveDevice, mountControls } from './controls.js?v=20261017';
import { BG_DIR, LOCAL, loadManifest, presetUrl, localStore, readLocalChoice, saveLocalChoice, mountBackgrounds } from './backgrounds.js?v=20261017';

const DATA_URL = '/projects/tablecaster/data/layouts.json?v=20261017';
const projector = new URLSearchParams(location.search).has('projector');

const svg = document.querySelector('svg[data-battlefield]');
const stage = document.querySelector('.tc-stage');
const panel = document.getElementById('panel');
const notesEl = document.getElementById('notes');

let data = null;        // parsed layouts.json, or null when missing / failed
let dataError = false;
let state = { ...defaultState(), ...loadDevice() };
let bgList = [];        // backgrounds.json entries in picker order (Presets + owner images)
let bgUnknown = null;   // a Background ref from the link that the manifest doesn't have
let localUrl = null;    // blob: URL of the Local background (IndexedDB), or null
const bgUrls = new Map(); // ref -> resolved href (Presets resolve asynchronously)
const dismissed = new Set();

// ---------- data ----------
async function loadData() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    if (!d || !Array.isArray(d.layouts)) throw new Error('not a layouts file');
    return d;
  } catch {
    dataError = true;
    return null;
  }
}

const findLayout = (id) => (data && id ? data.layouts.find((l) => l && l.id === id) || null : null);

// Force Disposition labels are stored as printed (all caps); show them in title case.
const SMALL = new Set(['and', 'the', 'of', 'a', 'an', 'in', 'on', 'to']);
const titleCase = (s) => String(s).toLowerCase().replace(/\S+/g, (w, i) => (i > 0 && SMALL.has(w) ? w : w[0].toUpperCase() + w.slice(1)));
function layoutTitle(L) {
  const labels = new Map((data?.forceDispositions || []).map((f) => [f.slug, f.label]));
  const [pair = '', variant = L.variant || ''] = String(L.id).split('/');
  const names = (L.pairing || pair).split('+').map((s) => titleCase(labels.get(s) || s.replace(/-/g, ' ')));
  return { pairing: names.join(' vs '), variant: variant || '' };
}

// ---------- render ----------
function pxPerIn() {
  const r = svg.getBoundingClientRect();
  return Math.min(r.width / 60, r.height / 44) || 0;
}

function draw() {
  const layout = findLayout(state.layoutId);
  const result = render(svg, {
    layout, grid: state.grid, hidden: state.hidden, swap: state.swap, mirror: state.mirror, background: bgHref(state.background),
    pxPerIn: pxPerIn(),
  });
  svg.setAttribute('aria-label', layout ? `Battlefield, ${layoutTitle(layout).pairing}, Layout ${layoutTitle(layout).variant}` : 'Battlefield grid, no Layout selected');
  return { layout, result };
}

// ---------- Backgrounds (#61) ----------
// Returns { href } for the render, or null while a Preset is still being drawn (it redraws when ready).
function bgHref(ref) {
  if (!ref) return null;
  if (ref === LOCAL) return localUrl ? { href: localUrl } : null;
  if (bgUrls.has(ref)) return { href: bgUrls.get(ref) };
  ensureBackground(ref);
  return null;
}
const pendingBg = new Map();
function ensureBackground(ref) {
  const e = bgList.find((x) => x.id === ref);
  if (!e) return Promise.resolve();
  if (e.kind === 'image') { bgUrls.set(ref, BG_DIR + e.file); return Promise.resolve(); }
  if (!pendingBg.has(ref)) pendingBg.set(ref, presetUrl(ref).then((u) => { if (u) bgUrls.set(ref, u); if (state.background === ref) draw(); }));
  return pendingBg.get(ref);
}
// Resolve the link's ref against the manifest: unknown -> none + note; no ref + Local chosen on this device -> Local.
function resolveBackgroundRef() {
  bgUnknown = null;
  if (state.background && state.background !== LOCAL && !bgList.some((e) => e.id === state.background)) { bgUnknown = state.background; state.background = null; }
  if (!state.background && localUrl && readLocalChoice()) state.background = LOCAL;
}
const chooseBackground = (ref) => update({ background: ref, hidden: ref ? state.hidden.filter((l) => l !== 'background') : state.hidden });
async function setLocal(file) {
  await localStore.put(file);       // if storage is blocked it still shows for this session
  if (localUrl) URL.revokeObjectURL(localUrl);
  localUrl = URL.createObjectURL(file);
  chooseBackground(LOCAL);
}
async function forgetLocal() {
  await localStore.forget();
  if (localUrl) URL.revokeObjectURL(localUrl);
  localUrl = null;
  if (state.background === LOCAL) update({ background: null }); else update({});
}
let syncBackgrounds = null;

// ---------- panel ----------
function note(id, text, { dismissible = false } = {}) {
  if (dismissed.has(id)) return '';
  return `<div class="tc-note" data-note="${id}" role="status"><p>${text}</p>${dismissible
    ? `<button type="button" class="tc-note-x" data-dismiss="${id}" aria-label="Dismiss">×</button>` : ''}</div>`;
}
const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function updatePanel(layout, ignored, skipped) {
  if (projector) return;
  const title = panel.querySelector('[data-layout-title]');
  const sub = panel.querySelector('[data-layout-sub]');
  if (layout) {
    const t = layoutTitle(layout);
    title.textContent = `${t.pairing}`;
    const edge = layout.attackerEdge;
    sub.textContent = `Layout ${t.variant}${edge ? ` · Attacker edge: ${edge}` : ''}`;
  } else {
    title.textContent = 'No Layout selected';
    sub.textContent = 'Showing the empty 60″ × 44″ grid.';
  }
  let n = '';
  if (dataError) n += note('data', 'Layout data couldn’t be loaded. The grid still works; reload the page to try again.');
  else if (state.layoutId && !layout) n += note('unknown', `The link names a Layout this data doesn’t have (${escHtml(state.layoutId)}). Showing the empty grid.`);
  if (layout && data?.source?.version && state.version && state.version !== String(data.source.version))
    n += note('version', `This link was made for Companion v${escHtml(state.version)}. Showing the Layout from the current data, v${escHtml(data.source.version)}.`, { dismissible: true });
  if (ignored.length) n += note('ignored', `Parts of the link were ignored: ${ignored.map(escHtml).join(', ')}.`, { dismissible: true });
  if (skipped.length) n += note('skipped', `Some objects in this Layout couldn’t be drawn (${skipped.length}).`);
  if (bgUnknown) n += note('background', `The link names a Background that isn’t available (${escHtml(bgUnknown)}). Showing none.`, { dismissible: true });
  notesEl.innerHTML = n;
}

// ---------- state <-> hash ----------
let ignored = [];
function applyHash() {
  const parsed = parseHash(location.hash);
  ignored = parsed.ignored;
  state = { ...state, ...parsed.state };
  resolveBackgroundRef();
  const { layout, result } = draw();
  if ((data && layout) || bgUnknown) {
    // Normalise the link: the current Companion version stays as given until the notice is dismissed.
    const h = formatHash(state);
    if (h !== location.hash) history.replaceState(null, '', location.pathname + location.search + h);
  }
  updatePanel(layout, ignored, result.skipped);
  syncControls?.(state);
  syncBackgrounds?.(state, { localUrl });
}

// ---------- layers + orientation controls (#60) ----------
// One entry point for every in-app state change: game parts go to the hash (replaceState), device parts to
// localStorage. Layout switches (#59) go through here too, so Swap sides and hidden layers carry over.
export function update(patch) {
  state = { ...state, ...patch };
  if ('background' in patch) { saveLocalChoice(state.background === LOCAL); bgUnknown = null; }
  saveDevice(state);
  const h = formatHash(state);
  if (h !== location.hash) history.replaceState(null, '', location.pathname + location.search + (h || ''));
  const { layout, result } = draw();
  updatePanel(layout, ignored, result.skipped);
  syncControls?.(state);
  syncBackgrounds?.(state, { localUrl });
  document.documentElement.toggleAttribute('data-wall', !!state.wall);
}
const controlsEl = document.getElementById('controls');
const syncControls = !projector && controlsEl ? mountControls(controlsEl, update) : null;
syncControls?.(state);
document.documentElement.toggleAttribute('data-wall', !!state.wall);

notesEl?.addEventListener('click', (e) => {
  const b = e.target.closest('[data-dismiss]');
  if (!b) return;
  dismissed.add(b.dataset.dismiss);
  if (b.dataset.dismiss === 'version' && data?.source?.version) {
    state.version = String(data.source.version);
    history.replaceState(null, '', location.pathname + location.search + formatHash(state));
  }
  if (b.dataset.dismiss === 'ignored') ignored = [];
  const layout = findLayout(state.layoutId);
  updatePanel(layout, ignored, draw().result.skipped);
});

addEventListener('hashchange', applyHash);

// Re-render when the displayed size changes so grid numbers and labels keep a readable size.
let lastPpi = 0;
new ResizeObserver(() => {
  const p = pxPerIn();
  if (Math.abs(p - lastPpi) > 0.05) { lastPpi = p; draw(); }
}).observe(stage);

// First paint: the empty grid right away, then the Layout once the data is in.
draw();
let localBlob;
[data, bgList, localBlob] = await Promise.all([loadData(), loadManifest(), localStore.get()]);
if (localBlob instanceof Blob) localUrl = URL.createObjectURL(localBlob);
const bgEl = document.getElementById('backgrounds');
if (!projector && bgEl) syncBackgrounds = mountBackgrounds(bgEl, bgList, { select: chooseBackground, file: setLocal, forget: forgetLocal });
applyHash();
await ensureBackground(state.background);   // ready = the chosen Background is drawn too
draw();
document.documentElement.dataset.ready = '1';
