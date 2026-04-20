# Backlog

Open, non-urgent items for Pixel Paladin and subprojects. One entry per line — promote to issues or implement directly when ready. Add newest items at the top of their section.

---

## Colorbench

- [ ] **Set up Google Play pre-registration and swap the launch CTA button.**
  Currently the "Email me when it launches" button on `colorbench.pixel-paladin.de` is a `mailto:` opt-in. Once the Android app hits internal testing, enable pre-registration in Google Play Console and repoint the button to the Play Store URL. Consider a second CTA for TestFlight public link once iOS is ready. Add EmailOctopus/Buttondown as a third channel once 50+ signups accumulate.
  _Added: 2026-04-20_

## Main site

_(empty)_

## Infrastructure / Ops

- [ ] **Submit `pixel-paladin.de` to hstspreload.org** — headers are eligible. Note: effectively permanent; any future subdomain must serve HTTPS.
  _Added: 2026-04-20_
- [ ] **Refresh security.txt before 2027-04-19.** RFC 9116 requires `Expires` ≤ 1 year. Lives at `/.well-known/security.txt` on both sites.
  _Added: 2026-04-20_

---

## Done

_Move completed entries here with a date, or delete them. Don't let the open list grow indefinitely._
