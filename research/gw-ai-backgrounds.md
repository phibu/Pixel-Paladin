# Does GW's fan content policy allow AI-made backgrounds?

Research for issue #48. Not legal advice. Sources fetched live on 2026-10-17.

## Verdict

**Not allowed under the policy as written**, if the layout page relies on GW's fan guidelines (which it does: it exists to show Warhammer 40,000 Event Companion layouts).

- Confidence that the clause exists and reads as quoted: **high** (fetched live from two locales of warhammer.com).
- Confidence that it covers our AI-made backgrounds: **medium-high**. The clause applies to the whole fan site, not only to the parts that show GW IP. The one open point is whether GW would ever look at backgrounds that contain no GW IP. The text gives no exception for them.

The backgrounds themselves infringe nothing: they contain no GW IP, so GW has no copyright claim on them. The problem is that GW's tolerance for fan sites is *conditional*, and "made by humans, not with generative AI" is now one of the conditions.

## Primary sources

| Source | URL |
|---|---|
| GW Legal page, section "Intellectual Property Guidelines" (en-GB) | https://www.warhammer.com/en-GB/legal#IntellectualPropertyGuidlines |
| Same section (en-US), identical clause | https://www.warhammer.com/en-US/legal |
| Same page, "Terms of Website Use" → "Acceptable use" and "Downloadable Material Licence" | https://www.warhammer.com/en-GB/legal |

Fetch method: warhammer.com returns an empty `202` bot challenge to plain `curl`; the page was fetched with the Firecrawl CLI (headless browser render). The text below is copied from that render.

## The clause

Section "Generative artificial intelligence" in the Intellectual Property Guidelines:

> "To protect our intellectual property and support the work of our human creators, we don't use AI-generated content in our own design process, and we don't allow any Games Workshop IP to be submitted to or used in AI systems."

> "We expect you to do the same. Any fan-fiction, fan-art, or fan-sites permitted by this policy must be created by humans and must not be made using generative artificial intelligence. You may not:
> - upload any Games Workshop material into any artificial intelligence or machine learning systems, including, but not limited to, ChatGPT and Midjourney
> - train or develop artificial intelligence or machine learning technology using Games Workshop material
> - use generative artificial intelligence to create outputs that copy Games Workshop's intellectual property"

So the earlier unconfirmed snippet is real and accurate.

## What it covers

1. **Scope is the three permitted categories:** fan-fiction / hobby books, fan-artwork, fan-sites. The fan-site category reads: "Individuals may create their own fan sites based on our characters and settings, but these must: not include text, artwork, imagery, footage or animation copied from any official Games Workshop material; make it clear that they are unofficial, without using any Games Workshop logos; not post or display rules or stats copied from from any official Games Workshop material; not be prejudicial to the goodwill, reputation or integrity of Games Workshop or its intellectual property."
2. **The human-made rule is a blanket condition on the whole item**, not limited to the parts that show GW IP: "must be created by humans and must not be made using generative artificial intelligence". There is no carve-out for generic textures, terrain art, or backgrounds without GW IP.
3. **The three "You may not" bullets are narrower** and are about GW material (uploading it to AI, training on it, AI outputs that copy GW IP). Our backgrounds break none of these, as long as no GW material was used in prompts or as reference images.
4. **"Digital tools" are not named.** The guidelines don't say whether AI-assisted *code* counts as "made using generative artificial intelligence". The wording ("created by humans") could be read that broadly, but its stated purpose ("support the work of our human creators", the ChatGPT/Midjourney examples) points at generated content: text and images. Treat this as an unclear edge, not a finding.
5. **Status of the guidelines:** "These guidelines do not constitute formal approval or authorization of any fan content, or a waiver of our legal rights. We reserve the right to change these guidelines at any time." They are a statement of what GW tolerates, not a licence. Breaking a condition doesn't create a new legal claim on our own art; it removes the tolerance the whole page depends on.

## Related terms on the same page

- **Terms of Website Use → Acceptable use:** users may not "use artificial intelligence for the purposes of generating text, images, 3D models or any other materials based on or using content from our site." Also: "permitted personal use does not include permission to use our content, data, information or other materials with artificial intelligence tools or programs." This only bites if GW site content (images, PDFs) was fed to an AI tool. Generic backgrounds made without GW content don't trigger it.
- **Terms of Website Use → Downloadable Material Licence** (covers "game rules, PDF files or other material downloadable from the GW website"): the licence is "personal, non-exclusive, non-transferable" and allows only storing (1.1) and accessing (1.2) the file; "You may NOT use or store the Downloadable Material in any other way." Side note for the layout-geometry question (issue #38): this is a contract restriction on the PDF itself, separate from copyright. It doesn't change the AI answer, but it adds weight to the low-medium confidence there.
- **Infringements → Games and apps** (unchanged from #38): "individuals must not create computer games or apps based on our characters and settings."

## What it means for the backgrounds

Options, best fit first:

| Option | Fits the policy? | Notes |
|---|---|---|
| Human-made backgrounds (own painting, photos of own terrain / mats, hand-drawn textures) | Yes | Cleanest. Photos of real gaming tables or own terrain work well for projection. |
| Procedural / code-generated textures (noise, tiling patterns written by hand in canvas or SVG) | Yes | Not generative AI. Deterministic code, no model. Small, no image files to ship. |
| Human-made third-party art under a free licence (CC0 / CC-BY textures) | Yes, with attribution where required | Check each licence and that the source isn't itself AI-generated. |
| User loads their own background image locally (file picker, never uploaded or shipped) | Yes for the site | What a user projects at home is outside our page's content. Don't ship AI images as defaults or examples. |
| Ship the existing AI-generated backgrounds | **No** | Directly against "must be created by humans and must not be made using generative artificial intelligence". |
| Ship AI backgrounds on a separate page with no 40K reference | Grey | Only works if that page is truly not a fan site. Linking it as "backgrounds for the 40K layout viewer" makes it part of the fan site again. Not recommended. |

## What it means for the disclaimer

- Keep the "unofficial, not endorsed by Games Workshop" notice and the trademark notice from #38.
- If the page ships its own art, add one line saying so honestly, e.g. "All background art is original and made without generative AI." Only add it if true; it's optional, not required by the guidelines.
- Don't state or imply GW approval. The guidelines say they are not "formal approval or authorization of any fan content".

## Open points

- Whether AI-assisted coding counts as "made using generative artificial intelligence" is not defined. Low practical risk, but not zero under the literal wording.
- GW can change the guidelines at any time; re-check the section before launch.
