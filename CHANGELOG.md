# Changelog

User-facing changes to [pixel-paladin.de](https://pixel-paladin.de). Newest first.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.2] — 2026-10-18

### Changed
- Every footer shows the current year, and Colorbench pages label their website privacy link "Datenschutz (Website)" so it isn't mistaken for the app's privacy policy.
- The links at the bottom of the Colorbench page line up with the rest of the page.
- The homepage header loads exactly as it appears, even with JavaScript turned off.

### Fixed
- Text no longer jumps when the site's fonts finish loading, on Windows and Apple devices.
- The Colorbench screenshot carousel on phones highlights the right screenshot at both ends, follows along when you move through it with the keyboard, and its dots stay visible in high-contrast mode.
- On the German Impressum and Datenschutz pages, screen readers read the English menu and breadcrumb in English.
- The "Not found" page fits small phones without scrolling, and the footer links are easier to tap on phones.
- Small layout fixes: tidier lines in the homepage workshop strip, the long code name on the AD-Passreset page wraps on phones, labels on the /now page line up, and the "since launch" counter stays on one line on narrow phones.

## [1.7.1] — 2026-10-18

### Changed
- The homepage clocks respect your device's reduced-motion setting: the "since launch" counter and the Berlin clock drop their seconds and update once a minute instead of every second.
- The Colorbench changelog now includes v2.8.0, a visual polish release for palette cards, the palette screen and the Paints list.

## [1.7.0] — 2026-10-18

### Added
- Tablecaster, a new project: it projects tournament battlefield layouts true to scale onto a 60″ × 44″ table. Pick a Layout, project it from a phone, tablet or laptop, line it up with the four-corner calibration, and choose a background. It also works offline at the venue once you have opened it.
- A Tablecaster page that explains the tool, and a Tablecaster card on the homepage.
- The Impressum has a trademark notice, and the Datenschutz page explains what Tablecaster stores on your device and how to delete it.

### Changed
- Every page now has a footer with links to the Impressum and Datenschutz.
- The Colorbench page now says the app works offline and an account is optional, which matches its privacy policy.

## [1.6.0] — 2026-10-03

### Added
- A proper "Not found" page for broken links. Before, a wrong address silently showed the homepage.
- The homepage now has navigation on phones: Workshop, Projects and Contact are shown on small screens.
- New link-preview images for the homepage, The Mini Colorbench and AD-Passreset, so shared links show the right name and description. AD-Passreset had no preview before.

### Changed
- The homepage "Projects & builds" section has a new layout: the two live products lead with real screenshots, and the workshop tracks follow as a calm list. Status labels are consistent (The Mini Colorbench now reads Live in green).
- A new shield logo in the header on every page, and the name is written "Pixel Paladin" everywhere.
- The header now stays in exactly the same place on every page. Impressum, Datenschutz, the privacy policy, the changelog and account deletion line up with the logo, and the software bill of materials table uses the full page width.
- One red for all highlighted text across the site (the homepage used a duller red than the other pages), and the small grey captions are easier to read.
- Notes and address boxes on the legal pages and the Colorbench download box use a quiet grey instead of a red tint.
- On the Colorbench page the four feature cards sit in a tidy 2 × 2 grid and the links at the bottom are grouped in two rows.
- The Colorbench changelog now includes v2.7.0, and the Colorbench page and project card show 109 palettes.

### Fixed
- On phones the homepage cut off the "/ now" and live-stats panels at the right edge. They now stack in a single column.
- The clock shows the right time zone (summer time) and the contact card shows the right UTC offset.
- Keyboard focus is now visible on every contact row.
- Pages jump around less while the fonts load, and the homepage appears noticeably faster on a phone connection.
- The Colorbench page downloads about 15 times less data: the screenshots are compressed, and the enlarged view opens instantly and sharpens as the full-size image arrives.
- The software bill of materials table scrolls sideways on narrow screens instead of cutting off licence names, and its filter box is easier to see.
- Links inside text on the legal pages and the AD-Passreset sidebar are underlined, so they no longer rely on colour alone.
- The install command on the AD-Passreset page no longer sits in a box inside a box, and the Impressum and Datenschutz headings no longer split the word into two colours.

## [1.5.1] — 2026-10-02

### Changed
- On desktop, the Colorbench screenshot gallery no longer draws an extra frame around each phone screenshot; the caption now sits directly beneath it.

### Fixed
- Impressum, Datenschutz and the Colorbench pages (landing, changelog, privacy policy, account deletion) now use more of the screen on phones, so text wraps less and the pages are shorter to scroll.
- On small phones the top navigation on Impressum, Datenschutz, AD-Passreset and the Colorbench pages no longer runs off the screen edge (Contact was cut off) and these pages no longer scroll sideways; very long words now wrap instead of widening the page.

## [1.5.0] — 2026-09-27

### Changed
- The homepage live stats (Last push, Repos, Public OSS) now come from pixel-paladin.de itself instead of each visitor's browser calling GitHub, so they no longer go blank when GitHub rate-limits a visitor. The numbers refresh every few minutes, and if GitHub is down you see the last known values.
- "Public OSS" now counts every repository under an OSI-approved open-source licence, not only MIT.
- "Last push" shows when a commit actually landed, not when it was first written.
- The "Uptime" tile is now called "Since launch" and counts from the site's real go-live date.
- Privacy policy v1.1: your browser no longer contacts GitHub; section 5 describes the new setup.

## [1.4.2] — 2026-09-27

### Changed
- The whole site works better with a keyboard and screen readers: a visible focus ring everywhere, a "skip to content" link on every page, labelled controls, and live stats that are read out once they load.
- Animations are switched off if your device asks for reduced motion, and the browser's own controls follow the dark theme.
- The Colorbench open-source licence list can be searched and sorted by keyboard, and the screenshot carousel and enlarged view work with screen readers.
- Every release on the Colorbench changelog now has its own link, so you can share a specific version.

### Fixed
- The AD-Passreset page no longer jumps while its screenshot loads, and its install command no longer runs off the edge on phones.
- Headings on the Colorbench page are in the right order for screen readers.

## [1.4.1] — 2026-09-27

### Changed
- Updated the Colorbench **privacy policy** to v7.0. It now covers the monthly palette competition (public entries, voting, comments and private reports) and the new optional public profile fields: social handles and country, which every app user can see and which are deleted with your account.
- The Colorbench **account deletion** page now lists everything that gets deleted, including uploaded photos, competition entries, comments, social handles and country.
- Synced the public Colorbench changelog with v2.2.0 through v2.6.0, covering the launch of the monthly palette competition, voting, comments, and the v2.6.0 quality release.
- Refreshed the Colorbench version stamp v2.1.1 → v2.6.0 (homepage project card + landing page metadata).

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
