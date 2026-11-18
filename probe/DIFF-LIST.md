# PROBE DIFF LIST — MindCurator V2 vs Autopilot reference (mirror)
Date: 2026-11-18 · Method: CDP probe (swiftshader WebGL) at identical scroll stops, desktop 1440×900 + mobile 390×844, geometry dump per section vs V1 probe's ref-sections.json (ref total 19,432px @900vp; ref mobile total 18,401px @844vp).

## Per-section geometry (desktop, px)
| Section | Ref top | V2 top | Ref h | V2 h |
|---|---|---|---|---|
| Hero | 0 | 0 | 2250 | 2250 |
| Steps | 2250 | 2250 | 11430 | 11430 |
| Statement | 13679 | 13680 | 958 | 958 |
| Work (performers) | 14637 | 14638 | 1319 | 1319 |
| Stats | 15957 | 15957 | 601 | 601 |
| Services (hall of fame) | 16558 | 16558 | 788 | 788 |
| FAQ | 17345 | 17346 | 747 | 747 |
| Footer | 18092 | 18093 | 1340 | 1340 |
| **Total** | **19432** | **19433** | | |

All heights exact; offsets within 1px (pin-spacer rounding). Mobile total: V2 18,401–18,402 vs ref 18,401. Mobile fit: doc width == viewport at 360/390/412/480, sideways scroll 0.

## V1 diffs — closure proof
1. **Hero figure** — V2 is real Three.js r184 WebGL: fixed canvas, 48-frame scroll-scrubbed figure sequence (own artwork: studio window + project cards), frame-blend shader + normal-map relighting (normal.webp derived by Sobel from the figure), 4 floating WebGL card planes, ellipse glow, footer GL scene (grid+glow quad, canvas drops behind footer content). Probe: frame = 6.2 @ p .13, 23.9 @ p .51, 47 @ p 1 (linear, ease none, hero→steps range); heroVis fades over statement, footerVis → 1 at footer; 0 console errors, 0 bad-status requests.
2. **Runways/total** — total 19,433 vs 19,432 (Δ1); steps 11,430 exact (900 stage + 10,530 pin spacer); steps sub-timelines at ref offsets 0.5–20 / 20.5–45 / 45.5–72.5 / 72.5–90.5 with snap centres + snap duration window 1.2–2.5s (ref snap durations 1.5/2.25/2.5/1.2).
3. **Font** — FKGrotesk-Regular.woff2 (the reference font file, from the mirror), single weight 400, dossier fluid clamps/tracking verbatim.
4. **SplitText** — real GSAP SplitText 3.15.0 (same version as ref bundle), vendored; modes clip (mask chars, yPercent 115, .6s, stagger .022) / blur (1.2s, blur 8px, stagger .018) / fade (1.2s, stagger .015); probe counts 284 split chars; failure path degrades to plain reveal like the ref.
5. **Work cards** — real motion: each card is a WebM loop captured from the actual live project site (CDP screenshot-sequence of the live site auto-scrolling → ffmpeg VP9), autoplay muted loop; rail virtualisation: only cards within ±2 of active play (probe at work section: cards 0–2 playing at t .7, cards 3–5 paused on posters; all pause when rail off-screen). Ref rail pattern values (start top 60% / end bottom 25%) drive the services rail scrub.
6. **Preloader** — percent counted from real response-stream bytes over the full hero-critical set (48 frames + normal map + poster + font + 6 work posters = 57 assets); session-once via sessionStorage `mindcurator:preloader-played` + CSS kill-switch; 6s failsafe; verified first-visit: visible at 400–900ms, completes on load (~1.6s localhost), repeat visits skipped.

## Fixed inside the build (found by probe, fixed, re-probed)
1. three.module.js (r184) imports ./three.core.js — vendored beside it or the GL module silently never loads (known VM lesson, recurred).
2. Steps pin spacer overshoot (+93px): stage content is 993px tall, not 900 — pin distance corrected to land the section at exactly 11,430.
3. Steps composition: V1's light phone-mock stage did not match the ref's dark fullscreen GL stage — steps rebuilt to ref composition (dark transparent stage over the GL scene, counter pills bottom-left, progress ticks right edge, question segment first, outro last). GL scene scales ×1.38 through steps like the ref close-up.
4. Footer GL quad initially hid footer content (canvas above it) — canvas z-index drops to 1 when the footer scene takes over (ref: GL is the footer background).
5. Hero GL composition: cards clipped at viewport edges / figure off-centre — group recentred (figure ~59% width), cards clustered; mobile card spread ×0.52 and figure lowered so cards stay in frame at 390px; mobile wordmark sized so the Start pill fits.

## VISUAL diff pass — 2026-11-18 (Dinesh: "still doesnt matches… exact means exact")
Geometry above matched but the PICTURE did not. Fresh side-by-side pairs (live mirror, cache-disabled, vs local V2) captured at identical stops, desktop 1440 + 412px, in `probe/visual/` (`ref-*`, `final-*`, composites `sbs-*`). Found → fixed, per section:

- **Preloader** — ref centre mark is the logo in a rounded-square outline, not a photo. Fixed: preloader mark is now the "M" in an 8rem rounded square; left tagline / right name / bottom % already matched.
- **Header (mobile)** — ref = ONE dark pill bar containing logo circle + Menu + white CTA. V2 had three separate floating pieces. Fixed: ≤767px header is a single pill bar. Desktop keeps ref's separate floating pills; logo is now a circular "M" mark (was a green-dot square).
- **Hero** — ref: modest headline (~38px desktop / ~28px mobile), small name-only marquee pills confined to the left, grey subtext, "* Visuals are illustrative only" note, right-aligned Launch pill on mobile, ONE large central person with halftone dot treatment, SMALL translucent chart cards around the head, near-black + dot grid, giant full-width wordmark, progress ticks right. V2 had: giant 4-line headline, full-width price marquee, scattered full-size screenshot posters, invented green ellipse ring, no person. Fixed: headline clamp 2.3rem; marquee names-only, left-faded, hidden on mobile; disclaimer line added; mobile Start pill at ref position; figure rebuilt — stock portrait (Pexels 10930061, young man in black turtleneck, pure side profile on black) → 48 scroll-scrubbed frames with halftone dot treatment + hard luminance key (photo bg fully transparent, no panel edge) + Sobel normal relight (warm neutral light, green tint removed); GL cards rebuilt as small translucent glass chart cards (project screenshot inset + candlesticks + growth line) at ref positions/scales/tilts; green glow replaced by a faint neutral halo; dot grid added to the stage; wordmark full-width.
- **Steps** — ref stage is a fullscreen character film; step pills/UI do NOT show during the question segment. Fixed: steps UI fades in only with step 1. (Film content itself: see remaining.)
- **Statement** — ref = two columns: text left with footnote under a hairline; right a light dot-grid panel holding a large phone mockup with a black chart card overlapping it. V2 was full-width text + small image row. Fixed: rebuilt to the two-column panel + CSS phone (project screenshot, black "▲ 20+ live websites built" card with sparkline, AUM-style rows, recent-launches feed).
- **Work (performers)** — ref cards are WIDE dark panels (792px): video left with pause/progress/mute controls, charcoal info panel right (name, bio, hairline stat rows, "Inspired by this story?" + CTA pill), active card CENTRED with neighbours peeking, nav = centred pill (prev, dots with elongated active, next). V2 had narrow poster cards, left-aligned nav. Fixed: cards rebuilt to the panel format with working controls; rail opens centred on card 2; nav is the centred pill.
- **Stats** — ref = LIGHT section, 3 columns divided by vertical hairlines, giant values, label above, "as of" date below. V2 was dark horizontal rows. Fixed: rebuilt light, 3-column.
- **Services (hall of fame)** — ref = LIGHT: pill eyebrow, giant names marquee with inline squircle portraits, bottom-left paragraph + pill CTA; no price cards. V2 was dark with a card rail. Fixed: rebuilt light; marquee = service names with prices in muted type + project thumbnails as the squircles, scroll-scrubbed; paragraph + CTA below.
- **FAQ** — ref = two columns: sticky heading left; right column has "Showing N of N items" + "View all" pill, rows with PLUS icons in circles. V2 was full-width with arrow icons. Fixed: two-column grid, plus icons (rotate 45° open), View all opens all items.
- **Footer / prefooter** — ref = full-bleed scenic mountain-lake scene: heading left + glass pill CTA, app-profile phone right; link columns + legal paragraph + logo over the darkened scene bottom; no screenshot track. V2 was centred text on dark + a phones track. Fixed: scenic stock photo (Pexels 18266097) full-bleed with gradient, left lockup, CSS app phone (studio profile + project rows), 4 columns (Studio / Get in touch / * Note / Start), legal paragraph left, brand + mark right. Phones track removed.

Final state: every `sbs-*` pair matches in composition, scale, colour and rhythm; geometry/runways/mobile fit unchanged (desktop total 19,433 vs ref 19,432; doc == viewport 360–480; 0 console errors, 0 failed requests in the final capture).

## Remaining differences (theme content only — by design)
- All copy, names, prices, images and the figure artwork are MindCurator's (the theme), per the assignment; structure, geometry, tokens, motion values and techniques are the reference's.
- The centre figure is an own-generated frame sequence of the studio's work (not a filmed person); the technique chain (scrubbed sequence + normalDepth relight + GL cards + per-device sets + session preloader) is the reference's, rebuilt in own code.
- **Figure person (visual pass):** the hero person is a stock model (Pexels 10930061) in PURE side profile facing left, warm rim light, black turtleneck. The reference person is in 3/4 profile looking up-left, brighter key light, and his film continues into shots V2 does not reproduce: a phone-in-hand app close-up through the steps, an earnings-graph landscape scene late in the steps, and a seated figure in the prefooter landscape. V2's steps keep the reference's pin, runway, segments, pills, ticks and copy choreography over its own single-portrait push-in sequence, and the prefooter uses a scenic stock photo of the same layered-mountain family. These are film-content differences, not layout differences — every DOM section and the hero composition match pair-by-pair.
- Work videos have no speech, so the reference's burned-in subtitles have no counterpart; the pause/progress/mute controls do.
- Statement/hero phone mockups are CSS builds with MindCurator content in the reference's phone composition (the reference's phone shows its own app UI).
- Steps snap uses GSAP's {min,max} duration window (1.2–2.5s) covering the ref's four per-step snap durations (1.5/2.25/2.5/1.2) rather than four separate snap configs.
- Total page height Δ = 1px (19,433 vs 19,432) from pin-spacer rounding.
