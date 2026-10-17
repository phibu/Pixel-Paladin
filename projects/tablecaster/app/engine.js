// Tablecaster rendering engine: draws one Battlefield as SVG from a scene object. No DOM access beyond
// the <svg> it is given, no globals, no network, so the setup view, the projector window and the A/B/C
// thumbnails can all call it.
//
//   import { render } from './engine.js';
//   render(svgElement, scene) -> { skipped: [...] }
//
// scene (every field optional):
//   layout      a Layout object in the layouts.json schema, or null for the empty grid
//   grid        'discreet' | 'legible' | 'major'                 (default 'discreet')
//   hidden      layer names turned off, e.g. ['grid', 'labels']  (see LAYERS)
//   swap        Swap sides: Layout content turned 180° about the centre; the Background stays put
//   mirror      Mirror: the whole render reflected horizontally, Background included
//   background  { href } image to cover the Battlefield, or null
//   pxPerIn     CSS px per inch at which the svg is shown; sizes the grid numbers and edge labels
//
// Frame: landscape inches, x 0–60, y 0–44, origin top-left, y down; viewBox "0 0 60 44", coordinates
// straight from the data. Strokes are in screen px (vector-effect: non-scaling-stroke).
//
// Colours: the projection surface is a tool surface. Attacker red and Defender blue zones are the one
// documented exception to the brand rule "red is a spotlight, not a wash"; it applies only to this
// surface and the colours are never tied to Force Dispositions.

export const W = 60, H = 44;

// Layer names in panel order (keys 1–8 follow this order). Draw order differs, see render().
export const LAYERS = ['grid', 'zones', 'territory', 'areas', 'features', 'objectives', 'labels', 'background'];
export const GRID_STYLES = ['discreet', 'legible', 'major'];
export const EDGES = ['top', 'right', 'bottom', 'left'];

// Terrain area footprints: local polygon, origin at the centre, local x along the long side, y down (inches).
const rect = (l, s) => [[l / 2, -s / 2], [l / 2, s / 2], [-l / 2, s / 2], [-l / 2, -s / 2]];
export const AREA_SHAPES = {
  '6x4': rect(6, 4),
  '6x2': rect(6, 2),
  '10x2.5': rect(10, 2.5),
  '7x11.5': rect(11.5, 7),
  // Chiral: missing corner at local (−5.75, −4); `mirrored` flips local y.
  '8x11.5': [[5.75, -4], [5.75, 4], [-5.75, 4], [-5.75, 2], [-5.35, 2], [5.45, -4]],
};

// Terrain feature footprints, long × short (inches). The kind id is size-coded; density is styling.
export const FEATURE_SIZES = {
  'light-38x13': [3.8, 1.3], 'light-30x18': [3.0, 1.8], 'light-31x17': [3.1, 1.7], 'light-48x16': [4.8, 1.6],
  'light-19x16': [1.9, 1.6], 'dense-81x19': [8.1, 1.9], 'dense-65x33': [6.5, 3.3], 'dense-64x49': [6.4, 4.9],
  'dense-64x31': [6.4, 3.1], 'dense-50x45': [5.0, 4.5], 'dense-42x18': [4.2, 1.8], 'dense-34x26': [3.4, 2.6],
  'dense-29x27': [2.9, 2.7], 'dense-27x15': [2.7, 1.5],
};

export const OBJECTIVE_RADIUS = 0.787; // 40 mm marker

const C = {
  base: '#1a1917', ink: '#ebeae7', area: '#b0aea7', muted: '#7c7a73',
  attacker: '#e51b10', defender: '#3b82f6', gold: '#f5a524',
};
const GRID = {
  discreet: { minor: 0.12, major: 0.30, majorW: 1.5, nums: 0.40, halves: false },
  legible: { minor: 0.22, major: 0.50, majorW: 2.5, nums: 0.70, halves: true },
  major: { minor: 0, major: 0.40, majorW: 2, nums: 0.55, halves: false },
};
const NS = 'vector-effect="non-scaling-stroke"';
const FONT = 'font-family="JetBrains Mono, ui-monospace, Consolas, monospace"';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const isPt = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const pts = (list) => list.map((p) => p.join(',')).join(' ');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function render(svg, scene = {}) {
  const { layout = null, grid = 'discreet', hidden = [], swap = false, mirror = false, background = null } = scene;
  const ppi = scene.pxPerIn > 0 ? scene.pxPerIn : 14;
  const off = new Set(hidden);
  const skipped = [];
  const layer = (name, body) => `<g data-layer="${name}"${off.has(name) ? ' display="none"' : ''}>${body}</g>`;
  const swapT = swap ? ` transform="rotate(180 ${W / 2} ${H / 2})"` : '';
  const mirrorT = mirror ? ` transform="matrix(-1 0 0 1 ${W} 0)"` : '';
  const fz = clamp(11 / ppi, 0.35, 0.9); // grid numbers ≈ 11 css px
  const L = layout && typeof layout === 'object' ? layout : null;

  let s = `<g data-transform="mirror"${mirrorT}>`;
  s += `<rect width="${W}" height="${H}" fill="${C.base}"/>`;
  s += layer('background', background && background.href
    ? `<image href="${esc(background.href)}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>` : '');
  s += `<g data-transform="swap"${swapT}>${layer('zones', L ? zones(L, skipped) : '')}</g>`;
  s += layer('grid', gridLayer(GRID[grid] || GRID.discreet, fz));
  s += `<g data-transform="swap"${swapT}>`;
  s += layer('territory', L ? territory(L, skipped) : '');
  s += layer('areas', L ? areas(L, skipped) : '');
  s += layer('features', L ? features(L, skipped, swap) : '');
  s += layer('objectives', L ? objectives(L, skipped) : '');
  s += layer('labels', L ? labels(L, clamp(14 / ppi, 0.6, 1.4), fz, skipped) : '');
  s += `</g>`;
  s += `<rect width="${W}" height="${H}" fill="none" stroke="${C.ink}" stroke-width="2" ${NS}/>`;
  s += `</g>`;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = s;
  return { skipped };
}

function gridLayer(g, fz) {
  let minor = '', major = '';
  for (let x = 1; x < W; x++) x % 5 ? (g.minor && (minor += `M${x} 0V${H}`)) : (major += `M${x} 0V${H}`);
  for (let y = 1; y < H; y++) y % 5 ? (g.minor && (minor += `M0 ${y}H${W}`)) : (major += `M0 ${y}H${W}`);
  let s = '';
  if (minor) s += `<path d="${minor}" fill="none" stroke="rgba(255,255,255,${g.minor})" stroke-width="1" ${NS}/>`;
  s += `<path d="${major}" fill="none" stroke="rgba(255,255,255,${g.major})" stroke-width="${g.majorW}" ${NS}/>`;
  if (g.halves) s += `<path d="M30 0V44M0 22H60" fill="none" stroke="rgba(245,165,36,.55)" stroke-width="2" stroke-dasharray="8 6" ${NS}/>`;
  // Centre marks: a cross at the centre plus a tick at the middle of each edge.
  s += `<path d="M29 22H31M30 21V23M0 22H1M59 22H60M30 0V1M30 43V44" fill="none" stroke="${C.gold}" stroke-width="3" ${NS}/>`;
  let t = '';
  for (let x = 5; x < W; x += 5) t += `<text x="${x}" y="${fz * 1.05}" text-anchor="middle">${x}</text><text x="${x}" y="${H - fz * 0.3}" text-anchor="middle">${x}</text>`;
  for (let y = 5; y < H; y += 5) t += `<text x="${fz * 0.3}" y="${y + fz * 0.35}">${y}</text><text x="${W - fz * 0.3}" y="${y + fz * 0.35}" text-anchor="end">${y}</text>`;
  return s + `<g fill="rgba(255,255,255,${g.nums})" font-size="${fz.toFixed(3)}" ${FONT}>${t}</g>`;
}

function zones(L, skipped) {
  let s = '';
  for (const side of ['attacker', 'defender']) {
    const poly = L.zones && L.zones[side];
    if (!Array.isArray(poly) || poly.length < 3 || !poly.every(isPt)) { skipped.push(`zone:${side}`); continue; }
    const c = C[side];
    s += `<polygon data-obj="zone" data-side="${side}" points="${pts(poly)}" fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="2" stroke-linejoin="round" ${NS}/>`;
  }
  return s;
}

function territory(L, skipped) {
  const t = L.territoryLine;
  if (!Array.isArray(t) || t.length !== 2 || !t.every(isPt)) { if (t !== undefined) skipped.push('territoryLine'); return ''; }
  return `<line data-obj="territory" x1="${t[0][0]}" y1="${t[0][1]}" x2="${t[1][0]}" y2="${t[1][1]}" stroke="rgba(255,255,255,.75)" stroke-width="2" stroke-dasharray="12 8" ${NS}/>`;
}

const place = (o) => `translate(${o.center[0]} ${o.center[1]}) rotate(${Number(o.rotation) || 0})`;

function areas(L, skipped) {
  let s = '';
  for (const a of L.areas || []) {
    const shape = AREA_SHAPES[a.size];
    if (!shape || !isPt(a.center)) { skipped.push(`area:${a.size}`); continue; }
    s += `<polygon data-obj="area" data-size="${esc(a.size)}" transform="${place(a)}${a.mirrored ? ' scale(1 -1)' : ''}" points="${pts(shape)}" fill="rgba(17,17,16,.55)" stroke="${C.area}" stroke-width="2" stroke-linejoin="round" ${NS}/>`;
  }
  return s;
}

function features(L, skipped, swap) {
  let s = '', badges = '';
  for (const a of L.areas || []) for (const f of a.features || []) {
    const size = FEATURE_SIZES[f.kind];
    if (!size || !isPt(f.center)) { skipped.push(`feature:${f.kind}`); continue; }
    const [l, w] = size;
    const dense = f.density ? f.density === 'dense' : String(f.kind).startsWith('dense');
    const style = dense
      ? `fill="${C.ink}" fill-opacity=".28" stroke="${C.ink}" stroke-width="2"`
      : `fill="none" stroke="${C.ink}" stroke-width="1.5" stroke-dasharray="5 4"`;
    s += `<rect data-obj="feature" data-kind="${esc(f.kind)}" data-density="${dense ? 'dense' : 'light'}" transform="${place(f)}" x="${-l / 2}" y="${-w / 2}" width="${l}" height="${w}" rx=".08" ${style} ${NS}/>`;
    if (f.letters) {
      // Letter badge, kept upright for a reader at the bottom edge (turned with Swap sides like the rest).
      const txt = esc(f.letters), bw = 0.5 + 0.62 * String(f.letters).length;
      badges += `<g data-obj="badge" transform="translate(${f.center[0]} ${f.center[1]})"><rect x="${-bw / 2}" y="-.5" width="${bw}" height="1" rx=".5" fill="#111110" stroke="${C.ink}" stroke-width="1" ${NS}/>`
        + `<text y=".02" text-anchor="middle" dominant-baseline="central" font-size=".72" font-weight="700" fill="${C.ink}" ${FONT}>${txt}</text></g>`;
    }
  }
  return s + badges;
}

function objectives(L, skipped) {
  let s = '';
  const R = OBJECTIVE_RADIUS;
  for (const o of L.objectives || []) {
    if (!isPt(o.center)) { skipped.push('objective'); continue; }
    const [x, y] = o.center;
    let mark;
    switch (o.type) {
      case 'home-attacker':
      case 'home-defender': { // solid ring + filled core in the side colour
        const c = o.type === 'home-attacker' ? C.attacker : C.defender;
        mark = `<circle data-obj="objective" data-type="${o.type}" cx="${x}" cy="${y}" r="${R}" fill="rgba(10,10,9,.7)" stroke="${c}" stroke-width="3" ${NS}/><circle cx="${x}" cy="${y}" r=".3" fill="${c}"/>`;
        break;
      }
      case 'central': // gold double ring + cross
        mark = `<circle data-obj="objective" data-type="central" cx="${x}" cy="${y}" r="${R}" fill="rgba(10,10,9,.7)" stroke="${C.gold}" stroke-width="3" ${NS}/><circle cx="${x}" cy="${y}" r="${R * 0.55}" fill="none" stroke="${C.gold}" stroke-width="1.5" ${NS}/><path d="M${x - 0.25} ${y}H${x + 0.25}M${x} ${y - 0.25}V${y + 0.25}" stroke="${C.gold}" stroke-width="2" ${NS}/>`;
        break;
      case 'expansion': // dashed white ring + small core
        mark = `<circle data-obj="objective" data-type="expansion" cx="${x}" cy="${y}" r="${R}" fill="rgba(10,10,9,.7)" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="4 3" ${NS}/><circle cx="${x}" cy="${y}" r=".15" fill="${C.ink}"/>`;
        break;
      default: // unknown type (user data): neutral ring
        mark = `<circle data-obj="objective" data-type="other" cx="${x}" cy="${y}" r="${R}" fill="rgba(10,10,9,.7)" stroke="${C.muted}" stroke-width="2" ${NS}/>`;
    }
    s += mark;
  }
  return s;
}

// Edge labels: "Attacker" on the attacker's edge, "Defender" on the opposite edge, each rotated so it reads
// from its own Battlefield edge (text "up" points into the Battlefield).
const OPP = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
function labels(L, size, fz, skipped) {
  if (!EDGES.includes(L.attackerEdge)) { skipped.push('attackerEdge'); return ''; }
  const inset = Math.max(fz * 1.3 + 0.35, 1.35); // clear of the grid numbers and the edge centre ticks
  const at = {
    bottom: [W / 2, H - inset, 0], top: [W / 2, inset, 180],
    left: [inset, H / 2, 90], right: [W - inset, H / 2, -90],
  };
  let s = '';
  for (const [side, edge] of [['attacker', L.attackerEdge], ['defender', OPP[L.attackerEdge]]]) {
    const [x, y, r] = at[edge];
    s += `<text data-obj="edge-label" data-side="${side}" data-edge="${edge}" transform="translate(${x} ${y}) rotate(${r})" text-anchor="middle" font-size="${size.toFixed(3)}" font-weight="700" letter-spacing=".12em" fill="${C[side]}" ${FONT}>${side === 'attacker' ? 'ATTACKER' : 'DEFENDER'}</text>`;
  }
  return s;
}
