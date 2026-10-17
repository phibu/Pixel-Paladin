// Tablecaster Backgrounds (#61): Preset backgrounds drawn by code, owner images from backgrounds.json,
// and one Local background (the user's own image) kept in IndexedDB. Plus the panel picker.
//
// Background refs: a manifest id (lowercase slug) goes in the hash as bg=<id>. 'local' is reserved for the
// Local background and never goes in the hash or over the network; 'none' is reserved for the picker.
//
// Device data (Reset device data clears both):
//   localStorage  tablecaster.background-local  '1' | absent   the Local background is the chosen one
//   IndexedDB     database 'tablecaster', store 'local-background', key 'current' -> the image Blob/File
//
// No generative AI: the Presets are seeded noise drawn here, from DS colour tokens.
export const BG_DIR = '/projects/tablecaster/backgrounds/';
const MANIFEST_URL = BG_DIR + 'backgrounds.json';
export const LOCAL = 'local';
export const LOCAL_KEY = 'tablecaster.background-local';
export const IDB = { name: 'tablecaster', store: 'local-background', key: 'current' };

// ---------- Preset backgrounds ----------
// Full size 3000x2200 (50 px/in, exactly 60:44). Thumbnails are the same drawing at 320x235.
export const FULL = { w: 3000, h: 2200 }, THUMB = { w: 320, h: 235 };
const NOISE = { w: 300, h: 220 };   // low-frequency layer, drawn small and scaled up (soft, cheap, size-independent)

// Colours are DS tokens (read from /ds/colors_and_type.css at draw time). Dark and low-contrast so overlays stay legible.
//   blotches: [token, count, min radius, max radius, alpha]  in 3000x2200 units, drawn on the noise layer
//   specks:   [token, count, min size, max size, alpha]      in 3000x2200 units, drawn at output size
//   tint:     [token, alpha] flat wash over everything
const PRESETS = {
  ash: { seed: 0x41534801, base: '--pp-ink-700',
    blotches: [['--pp-ink-600', 260, 60, 320, 0.45], ['--pp-ink-800', 220, 50, 260, 0.5], ['--pp-gold-700', 60, 80, 300, 0.08]],
    specks: [['--pp-ink-500', 22000, 2, 5, 0.22], ['--pp-ink-900', 18000, 2, 6, 0.3]], tint: ['--pp-gold-700', 0.04] },
  concrete: { seed: 0x434f4e02, base: '--pp-ink-600',
    blotches: [['--pp-ink-500', 200, 80, 360, 0.22], ['--pp-ink-700', 240, 40, 220, 0.4], ['--pp-info', 80, 120, 400, 0.05]],
    specks: [['--pp-ink-950', 26000, 2, 5, 0.32], ['--pp-ink-400', 9000, 1, 3, 0.18]], tint: ['--pp-info', 0.06] },
  scorched: { seed: 0x53434f03, base: '--pp-ink-900',
    blotches: [['--pp-gold-700', 160, 80, 380, 0.16], ['--pp-red-900', 160, 60, 300, 0.22], ['--pp-ink-950', 260, 40, 260, 0.55]],
    specks: [['--pp-ink-600', 20000, 2, 5, 0.22], ['--pp-gold-700', 6000, 1, 4, 0.18]], tint: ['--pp-gold-700', 0.03] },
};
export const PRESET_IDS = Object.keys(PRESETS);

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000';
// Software canvas: GPU rasterisation can differ by a pixel value between loads; the fixed seed must give identical pixels.
const SOFT = { willReadFrequently: true };
const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

// Draws Preset `id` into `cv` at whatever size the canvas has. Same seed -> same picture at every size.
export function drawPreset(id, cv) {
  const P = PRESETS[id];
  const rnd = mulberry32(P.seed);
  const n = canvas(NOISE.w, NOISE.h), nx = n.getContext('2d', SOFT);
  nx.fillStyle = token(P.base); nx.fillRect(0, 0, NOISE.w, NOISE.h);
  const k = NOISE.w / FULL.w;
  for (const [tok, count, r0, r1, a] of P.blotches) {
    const col = token(tok);
    nx.fillStyle = col;
    for (let i = 0; i < count; i++) {
      const x = rnd() * NOISE.w, y = rnd() * NOISE.h, r = (r0 + rnd() * (r1 - r0)) * k;
      const g = nx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, col); g.addColorStop(1, 'transparent');
      nx.globalAlpha = a * (0.5 + rnd() * 0.5); nx.fillStyle = g;
      nx.beginPath(); nx.arc(x, y, r, 0, Math.PI * 2); nx.fill();
    }
  }
  const { width: w, height: h } = cv, x = cv.getContext('2d', SOFT);
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(n, 0, 0, w, h);
  const s = w / FULL.w;
  for (const [tok, count, s0, s1, a] of P.specks) {
    x.fillStyle = token(tok); x.globalAlpha = a;
    for (let i = 0; i < count; i++) { const px = rnd() * w, py = rnd() * h, d = (s0 + rnd() * (s1 - s0)) * s; x.fillRect(px, py, d, d); }
  }
  x.globalAlpha = P.tint[1]; x.fillStyle = token(P.tint[0]); x.fillRect(0, 0, w, h);
  x.globalAlpha = 1;
  return cv;
}

// Full-size Preset as a blob: URL, drawn once per page load. From here on it is treated like any image file.
const presetUrls = new Map();
export function presetUrl(id) {
  if (!PRESETS[id]) return Promise.resolve(null);
  if (!presetUrls.has(id)) {
    presetUrls.set(id, new Promise((ok) => drawPreset(id, canvas(FULL.w, FULL.h)).toBlob((b) => ok(b ? URL.createObjectURL(b) : null), 'image/webp', 0.9)));
  }
  return presetUrls.get(id);
}

// ---------- manifest ----------
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/, FILE = /^[a-z0-9][a-z0-9.-]*\.webp$/;
const valid = (e) => e && SLUG.test(e.id) && e.id !== LOCAL && e.id !== 'none' && typeof e.title === 'string'
  && ((e.kind === 'preset' && PRESETS[e.id]) || (e.kind === 'image' && FILE.test(e.file || '') && FILE.test(e.thumb || '')));
const FALLBACK = PRESET_IDS.map((id) => ({ id, kind: 'preset', title: id[0].toUpperCase() + id.slice(1) }));

// Picker-order list of Backgrounds. Revalidated every load (ETag), so new owner images show up at once.
export async function loadManifest() {
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const list = await res.json();
    if (!Array.isArray(list)) throw new Error('not a list');
    const seen = new Set();
    return list.filter((e) => valid(e) && !seen.has(e.id) && seen.add(e.id));
  } catch {
    return FALLBACK;
  }
}

// ---------- Local background (IndexedDB + one localStorage flag) ----------
function idb(mode, fn) {
  return new Promise((ok) => {
    let req;
    try { req = indexedDB.open(IDB.name, 1); } catch { return ok(null); }
    // Reading never creates the database (so a visit, or the visit after Reset device data, leaves none behind).
    req.onupgradeneeded = () => { if (mode === 'readonly') req.transaction.abort(); else req.result.createObjectStore(IDB.store); };
    req.onerror = () => ok(null);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction(IDB.store, mode), r = fn(tx.objectStore(IDB.store));
        tx.oncomplete = () => { db.close(); ok(r && 'result' in r ? r.result ?? null : true); };
        tx.onerror = tx.onabort = () => { db.close(); ok(null); };
      } catch { db.close(); ok(null); }
    };
  });
}
export const localStore = {
  get: () => idb('readonly', (s) => s.get(IDB.key)),
  put: (blob) => idb('readwrite', (s) => { s.put(blob, IDB.key); }),
  forget: () => idb('readwrite', (s) => { s.delete(IDB.key); }),
};
export const readLocalChoice = () => { try { return localStorage.getItem(LOCAL_KEY) === '1'; } catch { return false; } };
export const saveLocalChoice = (on) => { try { on ? localStorage.setItem(LOCAL_KEY, '1') : localStorage.removeItem(LOCAL_KEY); } catch { /* not persisted */ } };

// ---------- panel picker ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Fills `root` with the picker. handlers: select(ref|null), file(File), forget(). Returns sync(state, { localUrl }).
export function mountBackgrounds(root, list, handlers) {
  const tile = (ref, title, thumb) =>
    `<button type="button" class="tc-bg-tile" data-bg="${ref}" aria-pressed="false">${thumb}<span class="tc-bg-name">${esc(title)}</span></button>`;
  const T = `width="${THUMB.w}" height="${THUMB.h}"`;
  root.innerHTML = `
    <p class="eyebrow" id="tc-bg-h">Background</p>
    <div class="tc-bg-grid" role="group" aria-labelledby="tc-bg-h">
      ${tile('none', 'None', '<span class="tc-bg-thumb tc-bg-none" aria-hidden="true"></span>')}
      ${list.map((e) => tile(e.id, e.title, e.kind === 'preset'
        ? `<canvas class="tc-bg-thumb" data-bg-thumb ${T} aria-hidden="true"></canvas>`
        : `<img class="tc-bg-thumb" data-bg-thumb ${T} src="${BG_DIR}${esc(e.thumb)}" alt="" loading="lazy" decoding="async">`)).join('')}
      ${tile(LOCAL, 'Your image', `<img class="tc-bg-thumb" data-bg-thumb ${T} alt="" hidden><span class="tc-bg-thumb tc-bg-add" aria-hidden="true">+</span>`)}
    </div>
    <div class="tc-bg-local">
      <button type="button" class="tc-cycle" data-bg-choose>Choose your image…</button>
      <button type="button" class="tc-cycle" data-bg-forget hidden>Forget your image</button>
      <input type="file" accept="image/*" data-bg-file hidden>
    </div>
    <p class="tc-hint">Your image stays on this device. It is not part of the link.</p>`;
  for (const c of root.querySelectorAll('canvas[data-bg-thumb]')) drawPreset(c.closest('[data-bg]').dataset.bg, c);

  const input = root.querySelector('[data-bg-file]');
  let localUrl = null;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    if (b.hasAttribute('data-bg-choose') || (b.dataset.bg === LOCAL && !localUrl)) input.click();
    else if (b.hasAttribute('data-bg-forget')) handlers.forget();
    else if (b.dataset.bg) handlers.select(b.dataset.bg === 'none' ? null : b.dataset.bg);
  });
  input.addEventListener('change', () => { const f = input.files && input.files[0]; input.value = ''; if (f) handlers.file(f); });

  return function sync(state, o = {}) {
    localUrl = o.localUrl || null;
    const cur = state.background || 'none';
    for (const b of root.querySelectorAll('[data-bg]')) b.setAttribute('aria-pressed', String(b.dataset.bg === cur));
    const img = root.querySelector(`[data-bg="${LOCAL}"] img`), add = root.querySelector('.tc-bg-add');
    if (localUrl) { if (img.getAttribute('src') !== localUrl) img.src = localUrl; img.hidden = false; add.hidden = true; }
    else { img.removeAttribute('src'); img.hidden = true; add.hidden = false; }
    root.querySelector('[data-bg-forget]').hidden = !localUrl;
    root.querySelector('[data-bg-choose]').textContent = localUrl ? 'Replace your image…' : 'Choose your image…';
  };
}
