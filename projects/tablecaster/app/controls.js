// Tablecaster setup-panel controls for layers and orientation (#60): eight layer toggles in panel order,
// the grid style cycle, Swap sides, Mirror and Wall mode. Owns the device settings in localStorage.
//
// Device settings (localStorage, never in the hash; Reset device data clears every key under `tablecaster.`):
//   tablecaster.mirror  '1' | absent                     Mirror
//   tablecaster.grid    'discreet' | 'legible' | 'major' grid style (absent = discreet)
//   tablecaster.wall    '1' | absent                     Wall mode (no Calibration, fit to the screen)
import { LAYERS, GRID_STYLES } from './engine.js?v=20261017c';

export const STORAGE_KEYS = { mirror: 'tablecaster.mirror', grid: 'tablecaster.grid', wall: 'tablecaster.wall' };

export const LAYER_LABELS = {
  grid: 'Grid', zones: 'Zones', territory: 'Territory line', areas: 'Terrain areas',
  features: 'Terrain features', objectives: 'Objectives', labels: 'Edge labels', background: 'Background',
};
export const GRID_LABELS = { discreet: 'Discreet', legible: 'Legible', major: 'Major only' };

// Storage can throw (private mode, blocked site data): every access is guarded and falls back to the defaults.
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* not persisted */ } };

export function loadDevice() {
  const g = read(STORAGE_KEYS.grid);
  return { mirror: read(STORAGE_KEYS.mirror) === '1', grid: GRID_STYLES.includes(g) ? g : 'discreet', wall: read(STORAGE_KEYS.wall) === '1' };
}

export function saveDevice({ mirror, grid, wall }) {
  write(STORAGE_KEYS.mirror, mirror ? '1' : null);
  write(STORAGE_KEYS.grid, grid && grid !== 'discreet' ? grid : null);
  write(STORAGE_KEYS.wall, wall ? '1' : null);
}

export const nextGrid = (g) => GRID_STYLES[(GRID_STYLES.indexOf(g) + 1) % GRID_STYLES.length];

const toggle = (attr, label, extra = '') =>
  `<button type="button" class="tc-toggle" ${attr} aria-pressed="false"${extra}><span class="tc-toggle-label">${label}</span><span class="tc-switch" aria-hidden="true"></span></button>`;

// Fills `root` with the controls. `update(patch)` applies a state change; returns sync(state) to reflect state in the UI.
export function mountControls(root, update) {
  root.innerHTML = `
    <p class="eyebrow" id="tc-orient-h">Orientation</p>
    <div class="tc-controls-group" role="group" aria-labelledby="tc-orient-h">
      ${toggle('data-control="swap"', 'Swap sides')}
      ${toggle('data-control="mirror"', 'Mirror')}
    </div>
    <p class="eyebrow" id="tc-grid-h">Grid style</p>
    <button type="button" class="tc-cycle" data-control="grid">
      <span class="tc-toggle-label"><span class="visually-hidden">Grid style: </span><span data-grid-label>Discreet</span></span><span class="tc-cycle-hint" aria-hidden="true">Next ›</span>
    </button>
    <p class="eyebrow" id="tc-layers-h">Layers</p>
    <div class="tc-controls-group tc-layers" role="group" aria-labelledby="tc-layers-h">
      ${LAYERS.map((l) => toggle(`data-toggle-layer="${l}"`, LAYER_LABELS[l] || l)).join('')}
    </div>
    <p class="eyebrow" id="tc-display-h">Display</p>
    <div class="tc-controls-group" role="group" aria-labelledby="tc-display-h">
      ${toggle('data-control="wall"', 'Wall mode', ' aria-describedby="tc-wall-hint"')}
    </div>
    <p class="tc-hint" id="tc-wall-hint">For a screen or wall display: no Calibration, fits the screen. Your table Calibration is kept.</p>`;

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    const s = current;
    if (b.dataset.toggleLayer) {
      const l = b.dataset.toggleLayer;
      update({ hidden: s.hidden.includes(l) ? s.hidden.filter((x) => x !== l) : [...s.hidden, l] });
    } else if (b.dataset.control === 'grid') update({ grid: nextGrid(s.grid) });
    else if (b.dataset.control) update({ [b.dataset.control]: !s[b.dataset.control] });
  });

  let current = null;
  return function sync(state) {
    current = state;
    for (const b of root.querySelectorAll('[data-toggle-layer]')) b.setAttribute('aria-pressed', String(!state.hidden.includes(b.dataset.toggleLayer)));
    for (const k of ['swap', 'mirror', 'wall']) root.querySelector(`[data-control="${k}"]`)?.setAttribute('aria-pressed', String(!!state[k]));
    const g = root.querySelector('[data-grid-label]');
    if (g) g.textContent = GRID_LABELS[state.grid] || state.grid;
    root.querySelector('[data-control="grid"]')?.setAttribute('data-grid', state.grid);
  };
}
