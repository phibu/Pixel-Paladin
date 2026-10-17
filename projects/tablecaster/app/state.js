// Tablecaster state: one plain, JSON-cloneable object drives the render (and later the projector snapshot).
//
// state = {
//   layoutId:   '<slugA>+<slugB>/<A|B|C>' | null   game, in the hash
//   version:    Companion version the link was made for ('1.3') | null   game, in the hash
//   swap:       boolean                            game, in the hash (Swap sides)
//   hidden:     layer names turned off ([] = all on)  game, in the hash
//   background: Background ref (e.g. 'ash') | 'local' | null   game, in the hash ('local' never is, see backgrounds.js)
//   mirror:     boolean                            device (localStorage, later ticket)
//   grid:       'discreet' | 'legible' | 'major'   device (localStorage, later ticket)
// }
//
// Hash format (stable once shipped; only non-default parts are written, in this order, joined by '&'):
//   #<layout id, URL-encoded but '/' kept>@<version>&swap&off=<layer>,<layer>&bg=<ref>
//   e.g. #take-and-hold%2Bpriority-assets/C@1.3&swap&off=grid,labels&bg=ash
import { LAYERS } from './engine.js?v=20261017c';

export const defaultState = () => ({ layoutId: null, version: null, swap: false, hidden: [], background: null, mirror: false, grid: 'discreet' });

const encId = (id) => encodeURIComponent(id).replace(/%2F/gi, '/');

export function formatHash(state) {
  const parts = [];
  if (state.layoutId) parts.push(encId(state.layoutId) + (state.version ? '@' + encodeURIComponent(state.version) : ''));
  if (state.swap) parts.push('swap');
  const off = LAYERS.filter((l) => (state.hidden || []).includes(l));
  if (off.length) parts.push('off=' + off.join(','));
  if (state.background && state.background !== 'local') parts.push('bg=' + encodeURIComponent(state.background)); // Local never leaves the device
  return parts.length ? '#' + parts.join('&') : '';
}

// Tolerant parse: unknown parts are ignored and reported in `ignored` (shown as a panel note).
export function parseHash(hash) {
  const out = { layoutId: null, version: null, swap: false, hidden: [], background: null };
  const ignored = [];
  const raw = String(hash || '').replace(/^#/, '');
  if (!raw) return { state: out, ignored };
  const dec = (s) => { try { return decodeURIComponent(s); } catch { return null; } };
  raw.split('&').forEach((part, i) => {
    if (!part) return;
    const eq = part.indexOf('=');
    const key = eq < 0 ? part : part.slice(0, eq), val = eq < 0 ? '' : part.slice(eq + 1);
    if (part === 'swap') out.swap = true;
    else if (key === 'off' && eq > 0) {
      for (const l of val.split(',')) LAYERS.includes(l) ? out.hidden.includes(l) || out.hidden.push(l) : l && ignored.push('off=' + l);
    } else if (key === 'bg' && eq > 0 && dec(val) && !['local', 'none'].includes(dec(val))) out.background = dec(val);
    else if (i === 0 && eq < 0) {
      const at = part.lastIndexOf('@');
      const id = dec(at < 0 ? part : part.slice(0, at)), ver = at < 0 ? null : dec(part.slice(at + 1));
      if (id) { out.layoutId = id; out.version = ver || null; } else ignored.push(part);
    } else ignored.push(part);
  });
  return { state: out, ignored };
}
