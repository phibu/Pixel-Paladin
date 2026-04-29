# Backlog

Open, non-urgent items for Pixel Paladin and subprojects. One entry per line — promote to issues or implement directly when ready. Add newest items at the top of their section.

---

## Colorbench

_(no open items)_

## Main site

- [ ] **Remove dead Tweaks panel markup, CSS, and wiring.**
  The `<div class="tweaks">` panel in `index.html`, its ~30 lines of `.tweaks*` CSS, and the segmented-control JS listeners (Layout / Theme / Accent / Density / Headline) are now unreachable — the only opener was a `postMessage` handler removed for CodeQL compliance. Dead code, but interlocked with state-restore logic that runs on page load. Needs a careful audit to unwire cleanly without breaking saved localStorage state on first-ever visits.
  _Added: 2026-04-20_

## Infrastructure / Ops

- [ ] **Submit `pixel-paladin.de` to hstspreload.org** — headers are eligible. Note: effectively permanent; any future subdomain must serve HTTPS.
  _Added: 2026-04-20_
- [ ] **Refresh security.txt before 2027-04-19.** RFC 9116 requires `Expires` ≤ 1 year. Lives at `/.well-known/security.txt` (main) and `/projects/colorbench/.well-known/security.txt` (Colorbench).
  _Added: 2026-04-20_

---

## Done

_Move completed entries here with a date, or delete them. Don't let the open list grow indefinitely._

- [x] **Set up Google Play pre-registration and swap the launch CTA button.** Closed-test signup now flows through the Play Store; the email-opt-in mailto was replaced with two Play Store CTAs ("Join the closed test" / "Install from Google Play"). _Closed: 2026-04-29_
- [x] **Move Colorbench off its own Cloudflare Pages project.** Now served as `pixel-paladin.de/projects/colorbench/` from the main site Pages project; the legacy subdomain 301-redirects via `_redirects`. _Closed: 2026-04-29_
