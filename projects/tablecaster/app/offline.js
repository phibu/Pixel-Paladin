// Tablecaster offline use + Reset device data (#64).
// registerWorker() is called by the app (incl. ?projector) and the landing, never by main-site pages.
// The worker (/projects/tablecaster/sw.js) owns every Cache Storage entry named tablecaster-*.
//
// Device data that Reset clears (and nothing else on the origin):
//   localStorage   every key starting with 'tablecaster.' (settings, Calibration profiles, Local background flag)
//   IndexedDB      database 'tablecaster' (the Local background)
//   Cache Storage  caches named 'tablecaster-*'
//   the service worker registration for /projects/tablecaster/
export const SW_URL = '/projects/tablecaster/sw.js';
export const SCOPE = '/projects/tablecaster/';
export const STORAGE_PREFIX = 'tablecaster.';
export const CACHE_PREFIX = 'tablecaster-';
export const IDB_NAME = 'tablecaster';

const supported = () => 'serviceWorker' in navigator;

// Registers the worker, then asks it (once active) to make sure the offline copy is complete. It answers with a
// 'tablecaster-ready' message, which mountOffline() turns into "Ready offline".
export async function registerWorker() {
  if (!supported()) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: SCOPE });
    const w = reg.active || reg.waiting || reg.installing;
    if (w && w.state !== 'activated') await new Promise((ok) => w.addEventListener('statechange', () => { if (w.state === 'activated' || w.state === 'redundant') ok(); }));
    (reg.active || w)?.postMessage('tablecaster-ensure');
    return reg;
  } catch { return null; }
}

// True when the worker's precache (the offline copy of the pages, modules and data) is in Cache Storage.
export async function isShellSaved() {
  try { return (await caches.keys()).some((k) => k.startsWith(CACHE_PREFIX + 'shell-')); } catch { return false; }
}

// True when `url` has a saved copy in a Tablecaster cache.
export async function isSavedOffline(url) {
  try {
    for (const k of await caches.keys()) {
      if (k.startsWith(CACHE_PREFIX) && await (await caches.open(k)).match(url)) return true;
    }
  } catch { /* Cache Storage unavailable */ }
  return false;
}

export async function resetDeviceData({ reload = true } = {}) {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(STORAGE_PREFIX)) localStorage.removeItem(k);
  } catch { /* storage blocked: nothing stored */ }
  await new Promise((ok) => {
    try {
      const r = indexedDB.deleteDatabase(IDB_NAME);
      r.onsuccess = r.onerror = () => ok();
      setTimeout(ok, 3000);   // blocked by another open tab: it finishes once that tab lets go
    } catch { ok(); }
  });
  try {
    for (const k of await caches.keys()) if (k.startsWith(CACHE_PREFIX)) await caches.delete(k);
  } catch { /* no Cache Storage */ }
  try {
    if (supported()) {
      for (const r of await navigator.serviceWorker.getRegistrations()) if (new URL(r.scope).pathname === SCOPE) await r.unregister();
    }
  } catch { /* no worker */ }
  if (reload) location.reload();
}

const STATUS = {
  saving: 'Saving for offline use…',
  ready: 'Ready offline',
  offline: 'Offline: using saved copy',
  unsupported: 'Offline use isn’t available in this browser.',
};

// Panel: status line + help text in `root`, the Reset button in `actions` (the Calibration actions row).
// Returns { watchBackgrounds(root, images) } to dim owner images that have no saved copy while offline.
export function mountOffline(root, { actions } = {}) {
  root.innerHTML = `
    <p class="eyebrow" id="tc-off-h">Offline</p>
    <p class="tc-off-status" data-offline-status role="status"></p>
    <p class="tc-hint">Open Tablecaster once on game day before you leave home, so this device has a fresh copy.</p>
    <p class="tc-hint" data-reset-hint hidden>Reset clears this device’s settings, Calibration profiles, your image and the offline copy.</p>`;
  const statusEl = root.querySelector('[data-offline-status]');
  const resetHint = root.querySelector('[data-reset-hint]');
  let ready = false;
  const watchers = [];

  function paint() {
    const st = !supported() ? 'unsupported' : !navigator.onLine ? 'offline' : ready ? 'ready' : 'saving';
    statusEl.dataset.state = st;
    statusEl.textContent = STATUS[st];
    for (const w of watchers) w();
  }
  if (supported()) {
    const recheck = async () => {
      const saved = await isShellSaved();
      const reg = await navigator.serviceWorker.getRegistration(SCOPE).catch(() => null);
      ready = saved && !!reg?.active;
      paint();
    };
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data?.type === 'tablecaster-ready') recheck(); });
    navigator.serviceWorker.startMessages();
    recheck();
  }
  addEventListener('online', paint);
  addEventListener('offline', paint);

  // Reset: the first press asks, the second press (within 5 s) clears.
  let btn = null, armed = 0;
  if (actions) {
    actions.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-ghost tc-reset" data-action="reset">Reset device data</button>');
    btn = actions.querySelector('[data-action=reset]');
    const disarm = () => { clearTimeout(armed); armed = 0; btn.textContent = 'Reset device data'; delete btn.dataset.confirm; resetHint.hidden = true; };
    btn.addEventListener('click', () => {
      if (!armed) {
        btn.textContent = 'Confirm reset';
        btn.dataset.confirm = '';
        resetHint.hidden = false;
        armed = setTimeout(disarm, 5000);
        return;
      }
      disarm();
      btn.disabled = true;
      resetDeviceData();
    });
  }
  paint();

  return {
    // images: [{ id, url }] for the owner backgrounds (Presets are drawn by code and always work).
    watchBackgrounds(bgRoot, images) {
      bgRoot.addEventListener('click', (e) => {
        if (e.target.closest('[data-offline-missing]')) { e.preventDefault(); e.stopImmediatePropagation(); }
      }, true);
      let run = 0;
      const check = async () => {
        const n = ++run, off = !navigator.onLine;
        const missing = new Set();
        if (off) for (const { id, url } of images) if (!(await isSavedOffline(url))) missing.add(id);
        if (n !== run) return;
        for (const { id } of images) {
          const tile = bgRoot.querySelector(`[data-bg="${CSS.escape(id)}"]`);
          if (!tile) continue;
          const miss = missing.has(id);
          tile.toggleAttribute('data-offline-missing', miss);
          if (miss) tile.setAttribute('aria-disabled', 'true'); else tile.removeAttribute('aria-disabled');
          let hint = tile.querySelector('[data-offline-hint]');
          if (miss && !hint) tile.insertAdjacentHTML('beforeend', '<span class="tc-bg-offline" data-offline-hint>Not saved offline</span>');
          else if (!miss && hint) hint.remove();
        }
      };
      watchers.push(check);
      check();
    },
  };
}
