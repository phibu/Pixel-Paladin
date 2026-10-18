// Tablecaster phone-landscape bottom sheet (#73): the handle in the panel expands and collapses it.
// app.css shows the handle and does the sizing and motion only in phone landscape; elsewhere this is inert.
// While collapsed, everything below the peek (all of the panel except the handle and the "Pick a Layout" header) is
// `inert`: it is off-screen, so Tab, a programmatic focus (app.js load focus) and assistive tech skip it.
const PHONE_LANDSCAPE = matchMedia('(orientation: landscape) and (max-height: 520px) and (max-width: 1024px)');
const panel = document.getElementById('panel');
const toggle = panel?.querySelector('[data-sheet-toggle]');
const picker = panel?.querySelector('[data-picker]');
const peek = new Set([toggle, panel?.querySelector('#tc-pick-h')]);
const below = panel ? [...panel.children].flatMap((c) => (c === picker ? [...c.children].filter((x) => !peek.has(x)) : [c])) : [];

function apply() {
  const collapsed = PHONE_LANDSCAPE.matches && toggle.getAttribute('aria-expanded') !== 'true';
  for (const el of below) el.inert = collapsed;
}

if (toggle) {
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    panel.toggleAttribute('data-sheet-open', open);
    if (!open) panel.scrollTop = 0;   // collapsed: the peek shows the top of the sheet again
    apply();
  });
  PHONE_LANDSCAPE.addEventListener('change', apply);
  apply();
}
