// Tablecaster phone-landscape bottom sheet (#73): the handle in the panel expands and collapses it.
// app.css shows the handle and does the sizing and motion only in phone landscape; elsewhere this is inert.
const panel = document.getElementById('panel');
const toggle = panel?.querySelector('[data-sheet-toggle]');
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  panel.toggleAttribute('data-sheet-open', open);
  if (!open) panel.scrollTop = 0;   // collapsed: the peek shows the top of the sheet again
});
