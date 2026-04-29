# Security Policy

## Reporting a Vulnerability

If you believe you've found a security vulnerability in Pixel Paladin or any of its subprojects (e.g. the Pixel Paladin website at `pixel-paladin.de`, the Colorbench landing at `pixel-paladin.de/projects/colorbench/`, or related tooling in this repo), please report it privately — **do not open a public GitHub issue**.

### Preferred: GitHub Private Vulnerability Reporting

Use the **"Report a vulnerability"** button under the [Security tab](https://github.com/phibu/Pixel-Paladin/security/advisories/new) of this repository. This keeps the report private and tracked.

### Alternative: Email

Email **hi@pixel-paladin.de** with:

- A description of the issue and its impact
- Steps to reproduce (PoC welcome, minimal is fine)
- Affected URL, file, or commit if known
- Your preferred disclosure timeline

PGP is not currently offered. If you need encrypted communication, mention it in the first message and we'll arrange a channel.

## What to Expect

- **Acknowledgement:** within 5 business days
- **Triage & initial assessment:** within 10 business days
- **Fix timeline:** depends on severity — critical issues prioritised; low-severity issues batched with regular updates
- **Disclosure:** coordinated. We'll agree a public disclosure date with you after a fix is available. Researchers who report responsibly will be credited in release notes unless they prefer to remain anonymous.

## Scope

**In scope**
- This repository's source code
- Content served at `pixel-paladin.de` (including `pixel-paladin.de/projects/colorbench/` and the legacy `colorbench.pixel-paladin.de` 301 redirect)
- RFC 9116 `security.txt` files under `/.well-known/`

**Out of scope**
- Third-party services we use (Cloudflare, GitHub, Google Play) — report to them directly
- Social engineering, physical attacks, denial-of-service
- Issues requiring a rooted/jailbroken device or physical access
- Missing best-practice headers without a concrete exploit path
- Automated scanner output without demonstrated impact

## Safe Harbour

Good-faith security research that follows this policy will not be pursued legally. Please:
- Only test against accounts and data you own
- Don't exfiltrate more data than necessary to demonstrate the issue
- Don't degrade service for other users
- Give us reasonable time to fix before disclosing

Thanks for helping keep the project safe.
