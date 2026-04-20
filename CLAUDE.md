# Pixel Paladin — Claude Agent Notes

## Backlog tracking

Open, non-urgent items live in [dev/Backlog.md](dev/Backlog.md). When the user asks to "add to backlog", "park this", "track for later", or similar, append a new entry to the appropriate section of that file with a one-line description and context. Date each entry (`_Added: YYYY-MM-DD_`). Completed items move to the **Done** section at the bottom or get deleted.

Do **not** use this file (`CLAUDE.md`) for tracking tasks. This file is for durable conventions; the backlog is for changing work.

## Project layout

- `index.html` — main site root, served at `pixel-paladin.de`
- `projects/<name>/` — per-project detail pages (e.g. `ad-passreset/`, `colorbench/`)
- `projects/colorbench/` — also the build root for the `colorbench.pixel-paladin.de` Cloudflare Pages project
- `ds/` — shared design system (colors, type, page-level CSS, icons, assets)
- `ds/assets/` — images, OG cards, favicons, logos, per-project screenshot folders
- `impressum/`, `datenschutz/` — legal pages (DE) for the main site
- `projects/colorbench/impressum/`, `/datenschutz/`, `/privacy/` — legal pages for the subdomain (website `/datenschutz/` is separate from the app `/privacy/`)
- `.well-known/security.txt` — RFC 9116 contact file per site
- `_headers` — Cloudflare Pages per-response headers (security + cache)
- `dev/` — source drafts and internal docs not served to the public

## Conventions

- **Legal contact email:** `hi@pixel-paladin.de` on all public artifacts. Never use `Philipp@bchwld.de` in public files — that's personal.
- **Favicons:** `/ds/assets/pixelpaladin-favicon.svg` for main site; `/ds/assets/colorbench-favicon.svg` for subdomain (also copied into `projects/colorbench/ds/assets/` so the subdomain build includes it).
- **Colorbench subpages load CSS from `https://pixel-paladin.de/ds/...`** via absolute URL, because their own build root doesn't include the `ds/` tree. CSP already allows this origin for `style-src`. If you create a new Colorbench subpage, use absolute URLs for stylesheets.
- **German legal pages (Impressum, Datenschutz) are written in German** — that's the legally binding version for a DE-based site.
- **Commits go to `main`** with squash-style messages. Use HEREDOC-quoted multiline messages. Always include the `Co-Authored-By` trailer the harness adds.

## Deployment

Two Cloudflare Pages projects share this repo:
1. Main site — build output directory `/` (repo root)
2. Colorbench subdomain — build output directory `projects/colorbench`

Both auto-deploy on push to `main`. No build step; static HTML only.

## Security / SEO baseline (already done — don't redo)

- Security headers via `_headers` (HSTS preload, CSP, COOP/CORP, Permissions-Policy)
- `robots.txt` + `sitemap.xml` on both sites
- Open Graph meta + JSON-LD structured data
- GitHub: Dependabot (Actions ecosystem), CodeQL workflow, SECURITY.md, `.well-known/security.txt`
- Self-hosted Lucide icons (no unpkg CDN leakage)

If the user asks for any of the above "from scratch", check first — it's probably already there.
