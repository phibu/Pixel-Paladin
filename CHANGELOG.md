# Changelog

User-facing changes to [pixel-paladin.de](https://pixel-paladin.de). Newest first.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4] — 2026-06-08

### Added
- New public **Account deletion** page at `/projects/colorbench/account-deletion/` describing the in-app delete flow, what gets deleted, and the 7-day data-retention window. Linked from the Colorbench legal-strip.

### Changed
- Updated the Colorbench **privacy policy** to v4.0 — covers Google sign-in / OAuth data, account deletion, and the new on-device photo-upload pipeline (EXIF strip + two-size WebP + EU-Frankfurt storage + per-user quotas + moderation gate, with explicit no-AI / no-face-recognition / no-third-party-sharing clauses).
- Synced the public Colorbench changelog with v1.9.1, v1.9.2, v1.9.3, v2.0.0, v2.1.0, and v2.1.1.
- Refreshed Colorbench landing-page version stamp v1.9.0 → v2.1.1 (homepage project card + JSON-LD).

## [1.3] — 2026-05-25

### Added
- New direct-install CTA on the Colorbench landing page — no more closed-test opt-in step.

### Changed
- **The Mini Colorbench is live.** Landing page, homepage card, Now panel, and JSON-LD metadata flipped from "Closed beta" to "Live on Google Play". Reflects the upstream app v1.9.0 production launch.
- Synced the public Colorbench changelog with the user-facing highlights of v1.7.0, v1.8.0, and v1.9.0. Patch-level releases between (v1.7.1–v1.7.12, v1.8.1, v1.8.2) were internal-only and collapsed.
- Refreshed palette count 96 → 106 across the landing page and homepage card.

## [1.2.2] — 2026-05-10

### Changed
- Refreshed Colorbench screenshots and extended the carousel from four to six images, now showing the project-save and Palette of the Day flows alongside the original tour.

## [1.2.1] — 2026-05-10

### Changed
- Synced the public Colorbench changelog with the latest two app releases (v1.6.1 and v1.6.2). Refreshed the project card and landing page to show the current app version (v1.6.2) and palette count (96).

## [1.2] — 2026-05-10

### Added
- New **SBOM** page on the Colorbench project: a sortable, searchable table of every open-source package the app is built on, with versions and licenses. Linked from the Colorbench legal-strip.

## [1.1] — 2026-05-09

### Added
- **The Mini Colorbench** is now in **closed beta** on Android, with a join link on the project page for the Google Play closed-beta track.
- New public **Colorbench changelog** page at `/projects/colorbench/changelog/` — plain-language release notes mirroring the upstream app changelog.
- Tap any Colorbench screenshot to view it full-size; swipe through the four-shot tour on mobile.

### Changed
- Renamed the project from "My Mini Colorbench" to **The Mini Colorbench** across the site.
- Updated the Colorbench landing page with current numbers: **95 curated palettes**, **1399 paints**, **9 supported brands**.
- Rewrote the Colorbench **privacy policy** (v2.0) to cover the new opt-in community-stats feature and the in-app feedback form. Default is still: nothing leaves your phone unless you choose to share.

### Fixed
- Colorbench screenshots now line up at the same height instead of varying by a few pixels.

## [1.0] — earlier

### Added
- Initial public site: homepage, project cards, legal pages.
- Tightened cross-page chrome — same header, nav, dark mode, and reading width whether you're on the homepage, a project page, or a legal page.
