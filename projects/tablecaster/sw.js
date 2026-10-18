// Tablecaster service worker (#64): offline use at venues. Scope /projects/tablecaster/ (landing, app, ?projector).
// The main site and Colorbench are outside the scope. There is no web app manifest: this worker only keeps a copy
// for offline use and never makes the site installable.
//
// Served with Cache-Control: no-cache (_headers), so a changed worker is picked up on the next visit.

// UPDATE THIS LIST whenever a ?v= changes on any of these URLs (app modules, app.css, layouts.json, /ds CSS), or a
// page starts using another /ds file. Then bump SHELL to the new ?v= so the old copy is dropped on activate.
// URLs must match what the pages request exactly, query string included (a different ?v= is a different file).
const SHELL = 'tablecaster-shell-20261018d';
const RUNTIME = 'tablecaster-runtime-v1';
const PRECACHE = [
  '/projects/tablecaster/',
  '/projects/tablecaster/app/',
  '/projects/tablecaster/data/layouts.json?v=20261017b',
  '/projects/tablecaster/backgrounds/backgrounds.json',
  '/projects/tablecaster/app/app.css?v=20261018d',
  '/projects/tablecaster/app/app.js?v=20261018',
  '/projects/tablecaster/app/sheet.js?v=20261018d',
  '/projects/tablecaster/app/engine.js?v=20261017c',
  '/projects/tablecaster/app/state.js?v=20261017c',
  '/projects/tablecaster/app/picker.js?v=20261018',
  '/projects/tablecaster/app/controls.js?v=20261017c',
  '/projects/tablecaster/app/backgrounds.js?v=20261018',
  '/projects/tablecaster/app/projection.js?v=20261018',
  '/projects/tablecaster/app/calibration.js?v=20261017c',
  '/projects/tablecaster/app/projector.js?v=20261017c',
  '/projects/tablecaster/app/offline.js?v=20261017b',
  '/ds/colors_and_type.css?v=20261004',
  '/ds/page.css?v=20261004b',
  '/ds/fonts/Unbounded-Regular.woff2',
  '/ds/fonts/Manrope-Regular.woff2',
  '/ds/fonts/JetBrainsMono-Regular.woff2',
  '/ds/assets/pixelpaladin-favicon.svg',
];
const TIMEOUT_MS = 3000;   // network-first: after this, answer from the saved copy (the fetch still updates it)
const OWN = new Set([SHELL, RUNTIME]);
const SHELL_KEYS = new Set(PRECACHE.map((u) => new URL(u, self.location.origin).href));

const precache = () => caches.open(SHELL).then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))));

// Tell every Tablecaster page (controlled or not) that the offline copy is complete; the panel shows "Ready offline".
async function announce() {
  for (const c of await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })) c.postMessage({ type: 'tablecaster-ready' });
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tablecaster-') && !OWN.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(announce),
  );
});

// Sent by every page after registering. After Reset device data the browser can revive the just-unregistered
// registration without installing again, so its caches are gone: refill them here.
self.addEventListener('message', (event) => {
  if (event.data !== 'tablecaster-ensure') return;
  event.waitUntil((async () => {
    if (!(await caches.has(SHELL))) await precache();
    await self.clients.claim();
    await announce();
  })());
});

// Pages are stored without their query: /app/?projector is the same file as /app/.
function keyFor(req) {
  if (req.mode !== 'navigate') return req.url;
  const u = new URL(req.url);
  u.search = '';
  return u.href;
}

async function fromCache(key) {
  for (const name of [SHELL, RUNTIME]) {
    const c = await caches.open(name);
    const hit = await c.match(key);
    if (hit) return hit;
  }
  return null;
}

async function save(key, res) {
  if (!res || !res.ok || res.type !== 'basic' || res.redirected) return;
  const c = await caches.open(SHELL_KEYS.has(key) ? SHELL : RUNTIME);
  await c.put(key, res);
}

// Immutable by name: background WebP files and fonts.
function cacheFirst(event, key) {
  return fromCache(key).then((hit) => hit || fetch(event.request).then((res) => {
    event.waitUntil(save(key, res.clone()).catch(() => {}));
    return res;
  }));
}

// Pages, JSON, CSS, JS and everything else: network first, saved copy after TIMEOUT_MS or on a network error.
function networkFirst(event, key) {
  const net = fetch(event.request).then((res) => { save(key, res.clone()).catch(() => {}); return res; });
  event.waitUntil(net.catch(() => {}));
  const late = new Promise((r) => setTimeout(r, TIMEOUT_MS, null));
  return Promise.race([net.catch(() => null), late]).then(async (res) => {
    if (res) return res;
    const hit = await fromCache(key);
    return hit || net;   // no saved copy: wait for the network (or fail like the network would)
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const key = keyFor(req);
  const immutable = /^\/projects\/tablecaster\/backgrounds\/[^/]+\.webp$/.test(url.pathname) || url.pathname.startsWith('/ds/fonts/');
  event.respondWith(immutable ? cacheFirst(event, key) : networkFirst(event, key));
});
