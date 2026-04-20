# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository character

Static HTML site, zero build step. No `package.json`, no bundler, no test runner. Any file edited is the file that ships — Cloudflare Pages serves the repo directly.

Because there's no build: don't introduce one. If a task feels like it needs tooling (PostCSS, a bundler, a linter), stop and confirm with the user before adding infrastructure.

## Architecture

Two Cloudflare Pages projects share this single repo:

1. **Main site** — build output `/` (repo root), serves `pixel-paladin.de`
2. **Colorbench subdomain** — build output `projects/colorbench`, serves `colorbench.pixel-paladin.de`

Both auto-deploy on push to `main`. The subdomain project's build root is a nested directory of the same repo; the main build still includes everything under `projects/colorbench/` as well, which means the Colorbench pages are reachable from *both* domains. Treat the subdomain as the canonical URL in `og:url` and `canonical` links.

### Shared design system

`ds/` holds the shared CSS, the self-hosted Lucide icon script, favicons, OG images, and per-project assets. The main site references it with relative paths (`ds/colors_and_type.css`). **Colorbench subpages cannot** — their build root doesn't contain `ds/`. Colorbench pages must reference the design system via absolute URL:

```html
<link rel="stylesheet" href="https://pixel-paladin.de/ds/colors_and_type.css"/>
```

The Colorbench `_headers` CSP explicitly whitelists `pixel-paladin.de` for `style-src` and `font-src` to make this work.

Exception: `projects/colorbench/ds/assets/colorbench-favicon.svg` is a local copy so the subdomain serves its own favicon under its own origin (browsers can be finicky about cross-origin favicons).

### Security and headers

`_headers` files at each build root define HSTS (with preload), CSP, COOP/CORP, Permissions-Policy, X-Frame-Options, Referrer-Policy, plus long-cache rules for `/ds/*`. CSP allows `'unsafe-inline'` for scripts and styles because the main `index.html` has inline `<script>` and `<style>` blocks that depend on it — removing `'unsafe-inline'` would require either moving them to external files or adding per-request nonces (Pages Function needed).

The main site fetches `https://api.github.com/...` for a public-activity feed; `connect-src` whitelists that endpoint.

### Legal pages

- Main site: `impressum/` and `datenschutz/` (German, legally binding)
- Colorbench subdomain: `impressum/`, `datenschutz/` (website-level, DE), and `privacy/` (app-level privacy policy, EN, covers the mobile app — separate legal instrument from the website Datenschutz)

When editing any of these, cross-check all four pages for consistency. A change to the contact address in one must be reflected in the others.

## Conventions

- **Public contact email is `hi@pixel-paladin.de`.** Never `Philipp@bchwld.de` in public files — that's personal. If you see it in a public artifact, flag it.
- **German for German legal content.** Impressum and Datenschutzerklärung only in German.
- **Commits go to `main`** directly; no feature branches for content updates. Multi-line messages via HEREDOC. Always include the `Co-Authored-By` trailer the harness provides.
- **No build output in git.** There is no build output — source = shipped artifact.

## Backlog

Open, non-urgent items live in [dev/Backlog.md](dev/Backlog.md). When the user says "add to backlog", "park this", "track for later", or similar, append to the appropriate section with a one-line description, brief context, and a dated `_Added: YYYY-MM-DD_` line. Use the **Done** section at the bottom for completed items (or delete them).

Do not track tasks in this file — it's for durable conventions, not changing work.

## Things already in place (don't redo from scratch)

If the user asks for any of the following, check what exists first — most is wired up:

- Security headers (`_headers`), RFC 9116 `security.txt`, `SECURITY.md`
- GitHub Dependabot config (`.github/dependabot.yml`), CodeQL workflow (`.github/workflows/codeql.yml`)
- `robots.txt`, `sitemap.xml`
- Open Graph meta tags, JSON-LD structured data
- Favicons, self-hosted Lucide icons (no unpkg CDN)
- Cloudflare Pages auto-deploy from Git

## Environment notes

- Platform: Windows 11, bash shell via Git Bash. Use Unix path syntax in shell commands (`/dev/null`, forward slashes).
- Line endings: repo uses LF; Git warns `LF will be replaced by CRLF` on Windows checkout. This is normal; don't act on it.
