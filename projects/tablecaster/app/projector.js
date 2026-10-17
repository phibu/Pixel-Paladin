// Tablecaster projector window (#65): the laptop page (controller) opens the same page with ?projector (receiver)
// and keeps it in sync over one BroadcastChannel. No Presentation API. The controller is the source of truth.
//
// Messages ({ type, from: 'controller'|'projector', ... }):
//   controller -> projector  snapshot { state, ack }   full state on every change (ack = last action seq applied)
//                            local-bg { blob }          the Local background image, before the snapshot that needs it
//                            calibrate                  the controller's Calibrate button / C key: run it on the projector
//                            close                      "Close projector window"
//                            hi                         a controller (re)started: receivers answer with hello
//   projector -> controller  hello { calibrating }      asks for the snapshot (on load, and after hi)
//                            action { action, arg, seq } a projector key / bar action (applied locally too)
//                            calibrating { on }         the wizard started / ended in the projector window
//   both                     heartbeat { calibrating? } every HEARTBEAT_MS; silence for TIMEOUT_MS = gone
//                            bye                        pagehide
//                            profile-changed            a Calibration profile was saved: re-read storage
export const CHANNEL = 'tablecaster';
export const HEARTBEAT_MS = 1000;
export const TIMEOUT_MS = 3500;
// Projector actions that change the shared state go to the controller. Fullscreen, leave, the bar's layer row and
// Calibration stay in the projector window.
export const FORWARD = new Set(['swap', 'mirror', 'grid', 'layer', 'variant', 'next', 'prev']);
const SNAPSHOT_KEYS = ['layoutId', 'version', 'swap', 'hidden', 'background', 'grid', 'mirror', 'wall'];
export const snapshotOf = (s) => Object.fromEntries(SNAPSHOT_KEYS.map((k) => [k, Array.isArray(s[k]) ? [...s[k]] : s[k] ?? null]));

const channel = () => (typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null);

// ---------- controller (the setup view) ----------
// panelEl: <section id="projector">. getState(): app state. getLocalBlob(): the Local background Blob or null.
// LOCAL: the Local background ref. projection / calibration: the #62 / #63 objects. dispatch: projection.dispatch.
export function createController({ panelEl, getState, getLocalBlob, LOCAL, projection, calibration }) {
  const bc = channel();
  let open = false, calibrating = false, lastSeen = 0, ack = 0, sentBlob = null, win = null, started = false, timer = 0;
  const post = (m) => bc?.postMessage({ ...m, from: 'controller' });

  if (panelEl) {
    panelEl.innerHTML = `
      <p class="eyebrow" id="tc-pw-h">Projector window</p>
      <p class="tc-pw-status" data-projector-status data-state="closed">Projector: not open</p>
      <button type="button" class="btn btn-ghost tc-pw-open" data-action="open-projector">Open projector window</button>
      <p class="tc-hint">For a laptop with the projector as a second screen: the window shows only the Battlefield, this page stays the controls.</p>`;
    panelEl.querySelector('[data-action=open-projector]').addEventListener('click', openWindow);
  }
  // "Close projector window" is the relabelled Project button (#projection), so listen document-wide.
  document.addEventListener('click', (e) => { if (e.target.closest('[data-action=close-projector]')) closeWindow(); });

  function render() {
    const s = panelEl?.querySelector('[data-projector-status]');
    if (s) {
      s.dataset.state = !open ? 'closed' : calibrating ? 'calibrating' : 'open';
      s.textContent = !open ? 'Projector: not open' : calibrating ? 'Calibrating on projector…' : 'Projector: open';
    }
    const o = panelEl?.querySelector('[data-action=open-projector]');
    if (o) o.hidden = open;
    if (open) projection.setProjectButton('Close projector window', 'close-projector'); else projection.setProjectButton();
  }
  function setOpen(on) {
    if (on === open) return;
    open = on;
    if (!on) { calibrating = false; win = null; }
    render();
  }
  // While a projector window is open, the laptop can't enter its own projection view.
  projection.setEnterGuard(() => open);

  // Window Management API: open plainly first (keeps the click's user activation), then move it to a non-primary screen
  // if the API is there and the permission is (or gets) granted. Otherwise the user drags it over.
  async function openWindow() {
    if (open) return;
    const url = location.pathname + '?projector' + location.hash;
    win = window.open(url, 'tablecaster-projector', 'popup,width=960,height=704');
    if (!win || !('getScreenDetails' in window)) return;
    try {
      const d = await window.getScreenDetails();
      const other = d.screens.find((x) => x !== d.currentScreen && !x.isPrimary) || d.screens.find((x) => x !== d.currentScreen);
      if (!other) return;
      win.moveTo(other.availLeft, other.availTop);
      win.resizeTo(other.availWidth, other.availHeight);
    } catch { /* denied or unsupported: the window stays where it opened */ }
  }
  function closeWindow() {
    post({ type: 'close' });
    try { win?.close(); } catch { /* not ours */ }
  }

  function publish(force = false) {
    if (!started || (!open && !force)) return;
    const s = getState();
    const blob = s.background === LOCAL ? getLocalBlob() : null;
    if (blob && blob !== sentBlob) { post({ type: 'local-bg', blob }); sentBlob = blob; }
    post({ type: 'snapshot', state: snapshotOf(s), ack });
  }

  if (bc) bc.onmessage = (e) => {
    const m = e.data || {};
    if (m.from !== 'projector' || !started) return;
    lastSeen = Date.now();
    switch (m.type) {
      case 'hello': ack = 0; sentBlob = null; calibrating = !!m.calibrating; setOpen(true); render(); publish(true); break;
      case 'heartbeat':
        if (!open) { setOpen(true); publish(true); }
        if (!!m.calibrating !== calibrating) { calibrating = !!m.calibrating; render(); }
        break;
      case 'calibrating': calibrating = !!m.on; setOpen(true); render(); break;
      case 'action':
        if (FORWARD.has(m.action)) projection.dispatch(m.action, m.arg);
        ack = m.seq || ack;
        publish(true);      // always answer, so the receiver's ack catches up even when nothing changed
        break;
      case 'profile-changed': calibration?.reload(); break;
      case 'bye': setOpen(false); break;
    }
  };

  function tick() {
    post({ type: 'heartbeat' });
    if (open && (Date.now() - lastSeen > TIMEOUT_MS || win?.closed)) setOpen(false);
  }
  addEventListener('pagehide', () => post({ type: 'bye' }));

  return {
    // Call once the state is final (data loaded, hash applied): announces this controller so receivers say hello.
    start() {
      if (started) return;
      started = true;
      post({ type: 'hi' });
      timer = setInterval(tick, HEARTBEAT_MS);
    },
    publish: () => publish(),
    isOpen: () => open,
    calibrate: () => post({ type: 'calibrate' }),
    profileChanged: () => post({ type: 'profile-changed' }),
    stop() { clearInterval(timer); },
  };
}

// ---------- receiver (?projector) ----------
// stage: the projection stage. update(patch): app.js update. setLocalBlob(blob): app.js makes its own blob: URL.
export function createReceiver({ stage, update, setLocalBlob, projection, calibration }) {
  const bc = channel();
  const html = document.documentElement;
  let connected = false, lastSeen = 0, seq = 0, started = false;
  const post = (m) => bc?.postMessage({ ...m, from: 'projector' });
  const isCal = () => !!calibration?.isCalibrating();

  // One big target: fullscreen needs a user gesture in this window.
  stage.insertAdjacentHTML('beforeend', `<button type="button" class="tc-fs-target" data-fs-target>Click to go fullscreen</button>`);
  const target = stage.querySelector('[data-fs-target]');
  target.addEventListener('click', () => { target.hidden = true; projection.dispatch('fullscreen'); });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) target.hidden = false; });

  function disconnect() {
    if (!connected) return;
    connected = false; seq = 0;
    projection.toast('Controller disconnected');
  }
  const hello = () => { seq = 0; post({ type: 'hello', calibrating: isCal() }); };

  // Projector keys and bar: applied here right away, and sent to the controller, whose snapshot confirms them.
  projection.onDispatch((action, arg) => {
    if (!connected || !FORWARD.has(action)) return;
    post({ type: 'action', action, arg: arg ?? null, seq: ++seq });
  });
  // The wizard runs here; the controller only shows "Calibrating on projector…".
  new MutationObserver(() => post({ type: 'calibrating', on: isCal() })).observe(html, { attributes: true, attributeFilter: ['data-calibrating'] });
  calibration?.onProfileChanged(() => post({ type: 'profile-changed' }));

  if (bc) bc.onmessage = (e) => {
    const m = e.data || {};
    if (m.from !== 'controller' || !started) return;
    lastSeen = Date.now();
    switch (m.type) {
      case 'hi': hello(); break;
      case 'heartbeat': if (!connected) hello(); break;
      case 'local-bg': if (m.blob instanceof Blob) setLocalBlob(m.blob); break;
      case 'snapshot':
        connected = true;
        if ((m.ack || 0) >= seq && m.state) update(m.state); // older snapshots are overtaken by our own pending actions
        break;
      case 'calibrate': calibration?.start(); break;
      case 'profile-changed': calibration?.reload(); break;
      case 'close':
        window.close();
        setTimeout(() => projection.toast('Close this window to finish'), 300);
        break;
      case 'bye': disconnect(); break;
    }
  };

  addEventListener('pagehide', () => post({ type: 'bye' }));
  return {
    start() {
      if (started) return;
      started = true;
      hello();
      setInterval(() => {
        post({ type: 'heartbeat', calibrating: isCal() });
        if (connected && Date.now() - lastSeen > TIMEOUT_MS) disconnect();
      }, HEARTBEAT_MS);
    },
    isConnected: () => connected,
    publish() { /* the receiver never publishes: the controller is the source of truth */ },
  };
}
