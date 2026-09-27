// GET /api/stats — hero "Live stats" tiles, proxied from GitHub.
//
// The browser never talks to GitHub: this Function fetches with a read-only
// PAT (Pages secret GITHUB_TOKEN), caches the payload per colo for 5 min and
// keeps the last good copy for 24 h so a GitHub outage or an expired token
// shows slightly old numbers instead of "—".
//
// Payload: { lastPush: {sha, date}|null, repos|null, oss|null, fetchedAt, stale }
// A null field renders as "—" on the page; the UptimeRobot keyword monitor
// alerts on "null" in this response.

const GH_USER = 'phibu';
const GH_REPO = 'Pixel-Paladin';

const FRESH_TTL = 300;     // 5 min
const STALE_TTL = 86400;   // 24 h
const ERROR_TTL = 60;      // back off from GitHub while it is failing

// OSI-approved licences, by GitHub's SPDX id. Fixed on purpose: anything
// GitHub can't identify (NOASSERTION) or that isn't listed doesn't count.
const OSI_LICENSES = new Set([
  '0BSD', 'AFL-3.0', 'AGPL-3.0', 'Apache-2.0', 'Artistic-2.0',
  'BSD-2-Clause', 'BSD-3-Clause', 'BSD-3-Clause-Clear', 'BSL-1.0',
  'CECILL-2.1', 'ECL-2.0', 'EPL-1.0', 'EPL-2.0', 'EUPL-1.1', 'EUPL-1.2',
  'GPL-2.0', 'GPL-3.0', 'ISC', 'LGPL-2.1', 'LGPL-3.0', 'LPPL-1.3c',
  'MIT', 'MIT-0', 'MPL-2.0', 'MS-PL', 'MS-RL', 'MulanPSL-2.0', 'NCSA',
  'OFL-1.1', 'OSL-3.0', 'PostgreSQL', 'UPL-1.0', 'Unlicense', 'Zlib',
]);

async function gh(path, env) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'pixel-paladin.de stats',
  };
  if (env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`;
  const r = await fetch(`https://api.github.com${path}`, { headers });
  if (!r.ok) throw new Error(`gh ${r.status} ${path}`);
  return r.json();
}

// Committer date, not author date: a rebased or amended commit keeps its
// old author date, the committer date is when it landed.
async function fetchLastPush(env) {
  const commits = await gh(`/repos/${GH_USER}/${GH_REPO}/commits?per_page=1`, env);
  const c = commits[0];
  if (!c) throw new Error('no commits');
  return { sha: c.sha, date: c.commit.committer.date };
}

// Public, non-fork repos owned by the user, paged until a short page.
async function fetchRepoCounts(env) {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await gh(`/users/${GH_USER}/repos?type=owner&per_page=100&page=${page}`, env);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  const own = all.filter(x => !x.fork && !x.private);
  const oss = own.filter(x => x.license && OSI_LICENSES.has(x.license.spdx_id));
  return { repos: own.length, oss: oss.length };
}

function cacheEntry(payload, ttl) {
  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${ttl}`,
    },
  });
}

function reply(payload) {
  // Root _headers does not apply to Function responses.
  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
}

export async function onRequestGet({ request, env, waitUntil }) {
  const cache = caches.default;
  const freshKey = new Request(new URL('/api/stats?cache=fresh', request.url));
  const staleKey = new Request(new URL('/api/stats?cache=stale', request.url));

  const hit = await cache.match(freshKey);
  if (hit) return reply(await hit.json());

  const [push, counts] = await Promise.allSettled([fetchLastPush(env), fetchRepoCounts(env)]);
  const payload = {
    lastPush: push.status === 'fulfilled' ? push.value : null,
    repos: counts.status === 'fulfilled' ? counts.value.repos : null,
    oss: counts.status === 'fulfilled' ? counts.value.oss : null,
    fetchedAt: new Date().toISOString(),
    stale: false,
  };

  if (push.status === 'fulfilled' && counts.status === 'fulfilled') {
    waitUntil(Promise.all([
      cache.put(freshKey, cacheEntry(payload, FRESH_TTL)),
      cache.put(staleKey, cacheEntry(payload, STALE_TTL)),
    ]));
    return reply(payload);
  }

  // Something failed: fill the gaps from the last good copy, if any.
  const old = await cache.match(staleKey);
  if (old) {
    const last = await old.json();
    if (payload.lastPush === null) payload.lastPush = last.lastPush;
    if (payload.repos === null) { payload.repos = last.repos; payload.oss = last.oss; }
    payload.fetchedAt = last.fetchedAt;
    payload.stale = true;
  }
  waitUntil(cache.put(freshKey, cacheEntry(payload, ERROR_TTL)));
  return reply(payload);
}
