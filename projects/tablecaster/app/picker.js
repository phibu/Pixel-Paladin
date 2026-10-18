// Tablecaster Layout picker (#59): two Force Disposition selects (either order; the same one twice is
// the mirror Pairing), an A/B/C control with thumbnails drawn live by the engine, and Random.
// Also the attribution stamp from the data's `source`. The picker never touches the state itself:
// it calls `choose(layoutId)` and app.js commits (state, hash, render, panel).
import { render } from './engine.js?v=20261017c';

// Force Disposition labels are stored as printed (all caps); show them in title case.
const SMALL = new Set(['and', 'the', 'of', 'a', 'an', 'in', 'on', 'to']);
export const titleCase = (s) => String(s).toLowerCase().replace(/\S+/g, (w, i) => (i > 0 && SMALL.has(w) ? w : w[0].toUpperCase() + w.slice(1)));

const pairOf = (L) => String(L.pairing || String(L.id).split('/')[0]).split('+');
const variantOf = (L) => L.variant || String(L.id).split('/')[1] || '';

// The Layouts of the Pairing a + b, in either order, sorted A/B/C.
export function layoutsFor(data, a, b) {
  if (!data || !a || !b) return [];
  return data.layouts.filter((L) => { if (!L) return false; const [x, y] = pairOf(L); return (x === a && y === b) || (x === b && y === a); })
    .sort((l, m) => variantOf(l).localeCompare(variantOf(m)));
}

const randomIndex = (n) => { const u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] % n; };

export function initPicker(root, { choose }) {
  const sels = [...root.querySelectorAll('select[data-fd]')];
  const variantsEl = root.querySelector('[data-variants]');
  const randomBtn = root.querySelector('[data-random]');
  // #74: `undefined` = still loading (index.html ships the selects disabled with "Loading Layouts…");
  // null = failed or missing ("Choose…", disabled).
  let data, list = [], thumbKey = '';

  const current = () => sels.map((s) => s.value);
  const pickIn = (layouts, prefer) => layouts.find((L) => variantOf(L) === prefer) || layouts[0];

  function buildVariants(state) {
    const key = list.map((L) => L.id).join() + '|' + state.swap + state.mirror + (state.hidden || []).join();
    if (key !== thumbKey) {
      thumbKey = key;
      variantsEl.innerHTML = list.map((L) => esc(variantOf(L))).map((v, i) => `<button type="button" data-variant="${v}" data-id="${encodeURIComponent(list[i].id)}" aria-pressed="false" aria-label="Layout ${v}">`
        + `<svg data-thumb viewBox="0 0 60 44" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"></svg><span>${v}</span></button>`).join('');
      const hidden = [...new Set([...(state.hidden || []), 'grid', 'labels'])];
      variantsEl.querySelectorAll('button').forEach((b, i) => render(b.querySelector('svg'), {
        layout: list[i], grid: state.grid, hidden, swap: state.swap, mirror: state.mirror, background: null, pxPerIn: 1.5,
      }));
    }
    for (const b of variantsEl.querySelectorAll('button')) b.setAttribute('aria-pressed', String(decodeURIComponent(b.dataset.id) === state.layoutId));
    randomBtn.disabled = list.length === 0;
  }

  // Sync the controls to the data and the state (called after every commit).
  function sync(d, state, layout) {
    if (d !== data) {
      data = d;
      const opts = (data?.forceDispositions || []).map((f) => `<option value="${esc(f.slug)}">${esc(titleCase(f.label))}</option>`).join('');
      for (const s of sels) { s.innerHTML = '<option value="">Choose…</option>' + opts; s.disabled = !data; }
    }
    if (layout) {
      const [x, y] = pairOf(layout), [a, b] = current();
      // Keep the user's order when it already names this Pairing.
      if (!((a === x && b === y) || (a === y && b === x))) { sels[0].value = x; sels[1].value = y; }
    }
    const [a, b] = current();
    list = layoutsFor(data, a, b);
    buildVariants(state);
  }

  let lastState = null;
  for (const s of sels) s.addEventListener('change', () => {
    const [a, b] = current();
    const layouts = layoutsFor(data, a, b);
    if (layouts.length) choose(pickIn(layouts, lastState?.variant).id);
    else { list = []; thumbKey = ''; variantsEl.innerHTML = ''; randomBtn.disabled = true; }
  });
  variantsEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (b) choose(decodeURIComponent(b.dataset.id));
  });
  randomBtn.addEventListener('click', () => { if (list.length) choose(list[randomIndex(list.length)].id); });

  return {
    sync(d, state, layout) { lastState = { variant: layout ? variantOf(layout) : lastState?.variant }; sync(d, state, layout); },
    focus() { sels[0]?.focus({ preventScroll: true }); },
  };
}

// ---------- attribution stamp ----------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthYear = (iso) => { const m = /^(\d{4})-(\d{2})/.exec(String(iso || '')); return m && +m[2] >= 1 && +m[2] <= 12 ? `${MONTHS[+m[2] - 1]} ${m[1]}` : String(iso || ''); };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// "Layouts: <title> v<version> · <Mon YYYY> · official PDF ↗" (the link only when the data has a URL).
export function renderStamp(el, source) {
  if (!el) return;
  if (!source || !source.version) { el.hidden = true; el.textContent = ''; return; }
  const parts = [`Layouts: ${esc(source.title || 'Layout data')} v${esc(source.version)}`];
  if (source.date) parts.push(esc(monthYear(source.date)));
  if (/^https:\/\//.test(source.url || '')) parts.push(`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">official PDF ↗</a>`);
  el.innerHTML = parts.join(' · ');
  el.hidden = false;
}
