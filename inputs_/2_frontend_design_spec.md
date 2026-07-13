# FRONTEND DESIGN SPECIFICATION — Portfolio, Admin CMS & Animation Studio
### Companion file to `full_stack_portfolio_admin_page_builder_prompt.md`

> **How to use this file:** The master prompt defines WHAT to build (architecture, CMS, publishing, data models). THIS file defines exactly HOW everything must LOOK and MOVE. Where the master prompt says "three templates," this file gives you every hex value, font, shadow, easing curve, and layout measurement for each one. Follow this file literally. Do not substitute your own colors, fonts, or animation timings. Do not fall back to generic defaults (plain Inter-on-white, purple-gradient SaaS look, cream-with-terracotta). Every value below is a deliberate decision.

---

# 0. Design Mission

You are implementing the visual identity for a final-year Software Engineering student's portfolio. The identity concept across all three templates is:

> **"Engineering as craft"** — the UI itself should quietly prove the owner can build software. Monospace metadata, precise grids, honest labels (no fake 95% skill bars), and motion that feels engineered (springs, staggers, orchestration) rather than decorative.

Three templates, one personality, three volumes:
- **Template 1 — Professional Minimal**: volume 2/10. Paper, ink, one viridian accent. For recruiters.
- **Template 2 — Modern Glass**: volume 6/10. Deep navy, aurora gradients, frosted glass. Default template.
- **Template 3 — Interactive 3D**: volume 9/10. Near-black void, solar-amber accent, 3D hero, magnetic cursor.

All three consume the same content and section order from the CMS. Only tokens + section skins change.

---

# 1. Global Foundations (all templates, public + admin)

## 1.1 Layout grid
- Max content width: `1200px` (`--w-content`), wide sections `1360px` (`--w-wide`), prose `720px` (`--w-prose`).
- Page gutter: `24px` mobile, `40px` tablet, `64px` desktop.
- 12-column grid on desktop, 4-column on mobile. Column gap `24px` / `32px` desktop.
- Vertical rhythm between homepage sections: `--section-gap`: `96px` mobile / `140px` desktop (Template 1 uses `80/120`, Template 3 uses `120/180`).

## 1.2 Spacing scale (Tailwind-compatible)
`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160` px. Never invent off-scale values.

## 1.3 Breakpoints
- `sm 640` — large phones
- `md 768` — tablet portrait
- `lg 1024` — tablet landscape / small laptop
- `xl 1280` — desktop
- `2xl 1536` — large desktop

## 1.4 Radii
- `--r-xs: 6px` (tags, chips)
- `--r-sm: 10px` (inputs, buttons)
- `--r-md: 16px` (cards)
- `--r-lg: 24px` (feature cards, modals)
- `--r-full: 9999px` (pills, avatars)
- Template 1 overrides: cards `12px` (crisper). Template 3 overrides: feature cards `28px`.

## 1.5 Z-index ladder
`base 0 · card-hover 10 · sticky-nav 100 · dropdown 200 · drawer 300 · modal 400 · toast 500 · rollback-banner 600 · cursor 999`

## 1.6 Iconography
- Lucide React only. Stroke width `1.75`. Sizes: `16` inline, `20` buttons, `24` section icons.
- Technology logos: real brand SVGs uploaded via Media Library, rendered inside a fixed `48×48` (cards) or `64×64` (3D balls) frame, `object-fit: contain`.

## 1.7 Type scale (shared ratio, faces differ per template)
| Token | Size / line-height | Usage |
|---|---|---|
| `display` | clamp(44px, 7vw, 88px) / 1.02 | Hero heading only |
| `h1` | clamp(36px, 5vw, 56px) / 1.08 | Page titles |
| `h2` | clamp(28px, 3.5vw, 40px) / 1.15 | Section titles |
| `h3` | 24px / 1.25 | Card titles |
| `h4` | 18px / 1.3 | Sub-cards |
| `body-lg` | 18px / 1.65 | Intro paragraphs |
| `body` | 16px / 1.65 | Default |
| `small` | 14px / 1.5 | Meta, captions |
| `mono-label` | 13px / 1.4, letter-spacing 0.08em, UPPERCASE | Eyebrows, dates, tags |

**Signature type device (all templates): the "mono rail."** Every section opens with a monospace eyebrow in the form `//01 — ABOUT`, `//02 — STACK`, etc., where the number reflects the section's LIVE position from the page builder (computed, never hard-coded). It reads like a source-code comment and encodes real order information.

## 1.8 Font loading
Use `next/font/google` with `display: swap`, subsets `latin`. Fonts per template are defined below; load only the active template's fonts.

---

# 2. Template 1 — "Professional Minimal"

**Feel:** a beautifully typeset engineering notebook. Paper, ink, one confident viridian accent. Zero glow, zero gradients. Precision instead of spectacle.

## 2.1 Palette
```css
--bg:            #FAFAF6;  /* warm paper */
--bg-raised:     #FFFFFF;  /* cards */
--bg-inset:      #F1F1EA;  /* code blocks, inset wells */
--ink:           #1B1F23;  /* primary text */
--ink-soft:      #4A5158;  /* secondary text */
--ink-faint:     #8A9199;  /* meta text */
--line:          #E3E3DA;  /* hairline borders */
--accent:        #0E6B5A;  /* deep viridian — links, CTAs, active states */
--accent-hover:  #0A5647;
--accent-tint:   #E3F0EC;  /* accent backgrounds (tags, highlights) */
--warn:          #B4540A;  /* status: in-progress */
--danger:        #B3261E;
/* Dark mode (optional toggle) */
--d-bg: #14171A; --d-raised: #1C2126; --d-ink: #ECEDE8; --d-line: #2A3036; --d-accent: #2FA48D;
```

## 2.2 Type
- **Display/Headings:** `Newsreader` (optical serif, weight 500, tight tracking `-0.02em`). Used ONLY for display/h1/h2 — restraint is the point.
- **Body/UI:** `Figtree` (400/500/600).
- **Utility/mono rail:** `IBM Plex Mono` (450).
- Highlighted hero words: italic Newsreader + `--accent` color. No gradient text anywhere in this template.

## 2.3 Surfaces & elevation
- Cards: `--bg-raised`, `1px solid --line`, radius `12px`, shadow `0 1px 2px rgb(27 31 35 / 0.04)`.
- Hover: border becomes `--accent` at 40% opacity + shadow `0 8px 24px rgb(27 31 35 / 0.08)` + translateY(-2px). NO scale.
- Dividers: 1px `--line` full-bleed hairlines between sections (this template only).

## 2.4 Buttons
- Primary: `--accent` bg, white text, radius 10px, height 44px, padding-x 20px, weight 600. Hover: `--accent-hover` + arrow icon nudges 3px right.
- Secondary: transparent, `1.5px solid --line`, ink text. Hover: border `--ink`.
- Link style: ink text with 1.5px `--accent` underline offset 4px; hover thickens to 2px.

## 2.5 Motion character
Reserved. Durations 200–450ms. Easing `--ease-out-quiet: cubic-bezier(0.22, 1, 0.36, 1)`. Scroll reveals: fade + 16px rise only, stagger 60ms. No parallax, no floating shapes. Default section animation preset: `rise-quiet` (§8).

---

# 3. Template 2 — "Modern Glass" (default active template)

**Feel:** midnight control room. Deep navy space, an aurora that lives BEHIND frosted glass, cyan→violet energy. Technical, alive, still professional.

## 3.1 Palette
```css
--bg:            #0A0F1E;  /* deep space navy */
--bg-2:          #0D1428;  /* section alternate */
--glass:         rgba(255,255,255,0.055);           /* card fill */
--glass-strong:  rgba(255,255,255,0.09);            /* modals, nav */
--glass-border:  rgba(255,255,255,0.12);
--glass-border-hover: rgba(103,232,249,0.45);
--text:          #E7ECF6;
--text-soft:     #9AA6BD;
--text-faint:    #5E6A82;
--cyan:          #22D3EE;  /* primary accent */
--violet:        #8B5CF6;  /* secondary accent */
--aurora:        linear-gradient(120deg, #22D3EE 0%, #6366F1 50%, #8B5CF6 100%);
--success:       #34D399;  --warn: #FBBF24;  --danger: #F87171;
```

## 3.2 Aurora background system (signature element)
One fixed, GPU-cheap background layer per page — never per card:
- Two radial blobs: cyan `rgba(34,211,238,0.13)` top-left, violet `rgba(139,92,246,0.12)` bottom-right, each ~`720px`, `filter: blur(140px)`, animated with a 26s / 34s slow drift loop (translate ±6%, alternate). `will-change: transform`.
- Above it, a `1px` dot grid (`radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)`, `size 28px 28px`) masked to fade out below the hero.
- Both layers sit at `z-index:-1`, `pointer-events:none`, disabled under `prefers-reduced-motion`.

## 3.3 Glass recipe (use EXACTLY this, everywhere)
```css
background: var(--glass);
backdrop-filter: blur(18px) saturate(140%);
border: 1px solid var(--glass-border);
border-radius: 16px;
box-shadow: 0 8px 32px rgba(2,6,23,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
```
- Hover: border → `--glass-border-hover`, plus a 1px gradient ring via `background: linear-gradient(var(--bg),var(--bg)) padding-box, var(--aurora) border-box` technique on featured cards only.
- Never stack blur inside blur (no glass card inside glass modal — modal children are solid `#101a33`).

## 3.4 Type
- **Display/Headings:** `Space Grotesk` (500/700, tracking `-0.03em`).
- **Body/UI:** `DM Sans` (400/500/700).
- **Utility/mono rail:** `JetBrains Mono` (400/600).
- Hero highlighted words: aurora gradient text (`background-clip: text`) — the ONLY gradient text allowed in the template.

## 3.5 Buttons
- Primary: aurora gradient bg, `#07101F` text (dark-on-bright for contrast), radius 12px, height 46px, weight 600, shadow `0 0 24px rgba(34,211,238,0.35)`. Hover: shadow expands to 36px, translateY(-1px).
- Secondary: glass recipe, text `--text`. Hover: gradient ring border.
- Ghost: transparent, `--cyan` text, hover underline.

## 3.6 Motion character
Fluid. Durations 300–700ms, spring-flavored: `--ease-glass: cubic-bezier(0.16, 1, 0.3, 1)`. Scroll reveals: fade + 28px rise + blur(6px)→0, stagger 80ms. Cards get a subtle pointer-tracking specular highlight (radial gradient following mouse at 8% white opacity). Default section preset: `rise-glass` (§8).

---

# 4. Template 3 — "Interactive 3D"

**Feel:** a dark playable space. Near-black void with faint violet ambience, ONE hot accent (solar amber) so the 3D content owns the color stage. Motion is the identity here.

## 4.1 Palette
```css
--bg:            #07080D;  /* void */
--bg-2:          #0C0E16;
--panel:         #11141F;  /* solid cards — NO glass in this template */
--panel-line:    #232838;
--text:          #F2F3F7;
--text-soft:     #A6ACBF;
--text-faint:    #62687C;
--amber:         #FFB454;  /* the one hot accent */
--amber-deep:    #E08A1E;
--ember:         linear-gradient(100deg,#FFB454, #FF7847);  /* CTA only */
--violet-ambient: rgba(124,93,250,0.10);  /* atmosphere blobs only, never text */
--success: #3DDC97; --danger: #FF5C5C;
```

## 4.2 Type
- **Display:** `Syne` (700/800) — geometric, slightly alien; hero + h2 only. Hero set with `text-wrap: balance`, tracking `-0.01em`.
- **Body/UI:** `Manrope` (400/500/700).
- **Utility/mono rail:** `Space Mono` (400/700).

## 4.3 Surfaces
- Solid panels `--panel`, `1px solid --panel-line`, radius 20px (feature cards 28px).
- Hover: border → `--amber` at 55%, plus `box-shadow: 0 0 0 1px rgba(255,180,84,.25), 0 16px 40px rgba(0,0,0,.5)`, translateY(-4px) scale(1.01).
- Section backgrounds may host tiny floating tech-logo sprites (max 6, opacity 0.06, slow 20s drift) — decorative layer, `aria-hidden`.

## 4.4 Signature interactions (this template only)
1. **3D hero object**: a slowly rotating wireframe icosahedron (R3F, `--amber` edges, ~2.2k triangles max) floating right of the hero copy; mouse parallax ±6°; on mobile replaced by a static SVG render.
2. **Magnetic elements**: primary buttons and nav links translate up to 8px toward the cursor within a 60px radius (spring stiffness 300, damping 20), snap back on leave.
3. **Custom cursor**: 8px amber dot + 28px trailing ring (lerp 0.15); ring scales 1.6× over interactive elements with label "view" over project cards. Desktop + fine pointers only; completely removed for touch and reduced-motion.
4. **Section wipes**: on scroll-enter, section titles reveal via `clip-path: inset(0 0 100% 0 → 0 0 0 0)` 600ms.

## 4.5 Buttons
- Primary: `--ember` gradient, `#160B02` text, radius 14px, height 48px, weight 700, uppercase mono-style label. Hover: magnetic + inner glow.
- Secondary: `--panel` bg + `--panel-line` border. Hover: amber border.

## 4.6 Motion character
Bold but orchestrated. Durations 400–900ms. Easings: `--ease-hero: cubic-bezier(0.83, 0, 0.17, 1)` for wipes, springs for magnetic. Scroll reveals stagger 100ms. Default section preset: `wipe-bold` (§8).

---
# 5. Section-by-Section Design Blueprints (public site)

Every section below is a registered component (per master spec §9). Each one must: (a) read its settings from the CMS, (b) skin itself from the active template's tokens, (c) accept an `animationPreset` prop resolved from the Animation Studio (§9 of this file), (d) render the mono rail eyebrow `//NN — LABEL` with its computed position.

## 5.1 Navigation bar
```text
┌────────────────────────────────────────────────────────────┐
│ {logo}            Home  Projects  About  Contact   [CV ⬇] │
└────────────────────────────────────────────────────────────┘
```
- Height 68px. Starts transparent over the hero; after 24px scroll becomes sticky with template surface (T1: paper + hairline bottom; T2: glass-strong; T3: `rgba(7,8,13,0.8)` + blur 12px) — animate the transition 250ms.
- Active section indicator: an underline dot/bar that SLIDES between links using Framer Motion `layoutId="nav-indicator"` (T1: 2px viridian bar; T2: aurora bar; T3: amber dot).
- CV button = primary button, small size (h 38px).
- Mobile: hamburger (Lucide `Menu`) → full-screen overlay; links stagger in 50ms, 24px rise; body scroll locked; `Esc` and backdrop close it.
- On page load, nav items cascade down (opacity 0, y -12 → visible, stagger 60ms) AFTER the hero headline starts (see hero choreography).

## 5.2 Hero section
Layout = `split` (default), `centered`, or `left` from settings. Split desktop:
```text
┌───────────────────────────────┬──────────────────────┐
│ //00 — HELLO (mono rail)      │                      │
│ DISPLAY HEADLINE with         │   [visual slot]      │
│ {highlighted words}           │  T1: portrait photo  │
│ role line · short intro       │  T2: animated code   │
│ [Primary CTA] [Secondary]     │      card            │
│ GitHub · LinkedIn · Mail      │  T3: 3D icosahedron  │
│ ⌄ scroll cue                  │   + orbiting icons   │
└───────────────────────────────┴──────────────────────┘
```
- **Page-load choreography (the one orchestrated moment — implement exactly):**
  1. `0ms` mono rail types on like a terminal (characters appear 18ms apart, blinking block cursor that fades after 1.2s)
  2. `150ms` headline reveals line-by-line (each line masked, y 110%→0, 90ms stagger; T3 uses clip-path wipe)
  3. `450ms` intro + role fade-rise
  4. `600ms` CTAs pop in (scale 0.94→1, spring)
  5. `700ms` visual slot fades in (T2 code card types 3 lines of code; T3 icosahedron scales 0.8→1)
  6. `750ms` nav cascades, social icons stagger 40ms
  7. Scroll cue: chevron with a gentle 6px yo-yo loop (2.2s), hidden after first scroll.
- T2 animated code card: glass card, `JetBrains Mono` 13px, fake-but-plausible snippet (e.g. `const stack = ['Next.js','Prisma','Postgres']`), traffic-light dots, aurora ring on hover.
- Orbiting tech icons (T2/T3 optional setting): 5–7 logo chips on two elliptical orbits (18s & 26s, opposite directions), pause on hover, `aria-hidden`.

## 5.3 About section
- Layouts per settings: image-left / image-right / centered / card.
- Portrait: radius `--r-lg`, T1 subtle paper frame + hairline; T2 aurora ring 1px; T3 amber corner brackets (four 24px L-shapes, drawn on scroll-enter via stroke-dashoffset, 500ms).
- "Short facts" render as a 2×2 mono-label grid (LOCATION / STATUS / DEGREE / AVAILABILITY) with hairline separators — data-sheet aesthetic, not icon soup.
- Prose column max `--w-prose`. CV link = secondary button with `Download` icon.

## 5.4 Technology stack section
- Category filter = pill row (radius full). Active pill: T1 accent-tint bg + accent text; T2 aurora bg + dark text; T3 amber bg + dark text. The active pill background slides between pills via `layoutId="tech-filter"`.
- Grid: 6 / 4 / 3 / 2 columns at 2xl / lg / md / sm. Card `48px` logo, name (h4), category (mono-label), experience label chip.
- **Experience labels (NEVER percentage bars):** `Strong` / `Comfortable` / `Working knowledge` / `Learning`, rendered as a chip plus 4 tiny 6px squares filled 4/3/2/1 respectively (T1 viridian, T2 cyan, T3 amber) — honest, discrete, engineering-flavored.
- Filter change: cards animate with `AnimatePresence` — exit fade+scale 0.96 (150ms), enter stagger 40ms. Layout shifts use Framer `layout` prop.
- Card click → modal (template surface) listing linked projects with thumbnails; "n projects" count badge on card corner.

## 5.5 Featured projects section
- Grid layout (default): 3 cols desktop, 1 mobile; row 1 card may span 2 cols if `featured` (bento emphasis).
- Card anatomy: 16:10 thumbnail (image `scale 1 → 1.05` on hover, 600ms, overflow hidden) → mono rail date range → h3 title → 2-line summary (`line-clamp-2`) → tech chips (max 4 + `+n`) → footer links (GitHub icon, `Live ↗`, `Case study →`).
- Hover: template hover recipe + title color → accent; T3 shows the custom-cursor "view" label.
- Horizontal layout option: scroll-snap carousel, drag-enabled (Framer `drag="x"`), 32px peek of next card, dot pagination.
- Scroll-enter: cards stagger 80–100ms with the active animation preset.

## 5.6 Project timeline section
- Desktop `alternating`: central 2px spine; entries alternate sides. Spine FILL is scroll-linked: `scaleY` 0→1 with `useScroll` progress (T1 viridian, T2 aurora, T3 amber). Node dots pulse once (scale 1→1.35→1) as the fill passes them.
- Entry card: image (16:9, radius md) + mono date range + title + role + status chip (`Completed` success / `In progress` warn tokens) + summary + tech chips + links row.
- Mobile `compact`: spine moves to left 16px, all cards right-aligned, images become 64px thumbnails.
- Entries reveal from their spine side (x ∓24px + fade), one at a time (viewport threshold 0.35).

## 5.7 Education & Experience sections
- Shared "ledger row" pattern: left mono column (dates, fixed 140px), right content (institution/org + logo 40px, qualification/role h4, description, module/tech chips).
- Rows separated by hairlines; current role/status gets a small pulsing dot (2s loop) + `Current` chip.
- Reveal: rows rise-fade with 70ms stagger.

## 5.8 Custom content section
- Renders CMS rich text through the sanctioned renderer only (no raw HTML injection). Obeys alignment/width/padding/background settings mapped to token values. Two-column option = 7/5 grid split, stacking at `md`.

## 5.9 3D technology-ball section
- Full-bleed stage, height `min(720px, 86vh)`, lazy-loaded (`next/dynamic`, `IntersectionObserver` pre-warm at 1.5 viewports away). Show a skeleton: dark stage + mono text `booting 3d…` + spinner.
- **Sphere mode (default):** logo balls arranged on a Fibonacci sphere, slow idle rotation (0.15 rad/s), drag to rotate with inertia (damping 0.92). Hover ball: scale 1.15 + template-accent emissive rim + name tooltip. Click: camera eases toward ball (400ms) + detail modal (technology info, experience label, linked projects).
- Stage lighting per template: T1 renders this section on `--bg-inset` with soft neutral lighting (still classy in a minimal page); T2 cyan/violet rim lights; T3 amber key light + violet ambient fill.
- **Game mode (admin-enabled):** balls fall with Rapier physics into a container; player basket follows A/D–arrows–mouse–touch; catch → toast card (name, +points, use case, linked projects) sliding from stage bottom (2.4s auto-dismiss); score in mono, top-right; combo streak shows ×2/×3 chips.
- Fallback (no WebGL / reduced motion / `md` down if FPS < 30): static grid of logo chips with the same click-modal — never a blank hole.
- HUD hint on first view: `drag to rotate · click a ball` mono caption, fades after first interaction.

## 5.10 Contact section
- 6/6 split: left — h2, description, mono email line (click-to-copy with `Copied ✓` swap, 1.6s), location, social icon row (icons rise 2px on hover); right — form card (template surface).
- Fields: floating labels (label shrinks to mono-label on focus/filled, 180ms), 1.5px borders, focus ring = accent at 45% (`box-shadow: 0 0 0 3px`), error state: danger border + message slides down 8px + a SINGLE 4px shake (120ms — subtle, not cartoon).
- Submit: primary button → loading (spinner replaces label, width preserved) → success: card content swaps via `AnimatePresence` to `Message sent` + check icon draw-on (stroke-dashoffset 400ms). Failure: inline danger alert, form intact.
- Honeypot field visually hidden; validation messages written per master spec §26 tone.

## 5.11 Footer
- Top hairline; 3 columns: identity (logo + one-liner), nav links, socials. Bottom row: `© {computed year} {name}` + `Built with Next.js · Prisma · Postgres` in mono-label + back-to-top button (circle, chevron, smooth-scrolls, appears after 600px scroll, fades in/out 200ms).

---

# 6. Global Micro-interaction Catalog (all templates)

| Element | Interaction | Spec |
|---|---|---|
| All links | hover | underline draws left→right 200ms (`background-size` trick) |
| Buttons | press | scale 0.97, 90ms |
| Cards | hover | template hover recipe; ALWAYS translateY, never rotate |
| Images | load | blur-up: `blur(16px)` + scale 1.03 → sharp, 500ms (next/image placeholder) |
| Tags/chips | hover | bg tint deepens 120ms |
| Toasts | enter/exit | slide from bottom-right, y 16 + fade, spring; stack max 3 |
| Modals | enter | overlay fade 200ms; panel scale 0.96→1 + fade 250ms; exit reverses; focus-trapped |
| Skeletons | loading | template-toned shimmer sweep 1.4s loop |
| Copy actions | success | icon swaps to check, reverts 1.6s |
| Page transitions | route change | old view fade 150ms → new view fade+rise 12px 250ms (Next `template.tsx`); T3 adds a 300ms amber progress hairline at viewport top |
| Scroll progress | article/project pages | 2px accent bar fixed at top, `scaleX` = scroll progress |

**Scroll-reveal defaults:** trigger at `viewport amount: 0.25`, `once: true` (never re-animate on scroll-up). Everything above the fold animates on LOAD, not on scroll.

---

# 7. Motion Language & Tokens (implement as exported constants)

```ts
// lib/motion/tokens.ts
export const dur = { xs: .12, sm: .2, md: .3, lg: .5, xl: .7, hero: .9 };
export const ease = {
  quiet: [0.22, 1, 0.36, 1],     // Template 1
  glass: [0.16, 1, 0.3, 1],      // Template 2
  hero:  [0.83, 0, 0.17, 1],     // Template 3 wipes
  inOut: [0.65, 0, 0.35, 1],
};
export const spring = {
  pop:      { type: 'spring', stiffness: 420, damping: 26 },
  magnetic: { type: 'spring', stiffness: 300, damping: 20 },
  drawer:   { type: 'spring', stiffness: 260, damping: 30 },
};
export const stagger = { tight: .04, base: .08, loose: .12 };
```

## 7.1 Rules of motion (non-negotiable)
1. Animate ONLY `transform`, `opacity`, `clip-path`, `filter: blur` — never layout properties (width/height/top/margin).
2. One orchestrated moment per page (the hero); everything else is quiet support.
3. Durations: micro ≤200ms, component 200–500ms, hero ≤900ms. Nothing loops except: scroll cue, aurora drift, orbit icons, pulsing "current" dots, 3D idle.
4. `prefers-reduced-motion: reduce` → all presets resolve to `fade-only` (opacity 0→1, 150ms), loops stop, parallax/magnetic/cursor/3D-idle disabled, 3D section renders its static fallback.
5. Stagger children instead of delaying whole sections.
6. Every Framer Motion element that animates on scroll uses `whileInView` + `viewport={{ once: true }}`.

---

# 8. Built-in Animation Presets (seed data for the Animation Studio)

These ship in the database as `AnimationPreset` rows (`isBuiltIn: true`, non-deletable). Section settings' "Animation" dropdown lists them plus user-created ones.

| id | name | keyframes (from → to) | duration | ease | stagger |
|---|---|---|---|---|---|
| `none` | None | — | — | — | — |
| `fade` | Fade | opacity 0→1 | .3 | quiet | .06 |
| `rise-quiet` | Rise (quiet) | opacity 0→1, y 16→0 | .45 | quiet | .06 |
| `rise-glass` | Rise (glass) | opacity 0→1, y 28→0, blur 6→0 | .6 | glass | .08 |
| `wipe-bold` | Wipe (bold) | clip-path inset 100%→0 bottom, y 24→0 | .6 | hero | .1 |
| `scale-pop` | Scale pop | opacity 0→1, scale .92→1 | spring.pop | — | .08 |
| `slide-left` | Slide from left | opacity 0→1, x -32→0 | .5 | glass | .08 |
| `slide-right` | Slide from right | opacity 0→1, x 32→0 | .5 | glass | .08 |
| `blur-in` | Blur in | opacity 0→1, blur 12→0, scale 1.02→1 | .55 | quiet | .07 |
| `cascade` | Cascade | children only: opacity 0→1, y 20→0 | .4 | glass | .12 |

Template defaults when a section's animation = `template-default`: T1 → `rise-quiet`, T2 → `rise-glass`, T3 → `wipe-bold`.

---
# 9. ANIMATION STUDIO — custom animation pane (admin)

A new admin route **`/admin/animations`** (add "Animation Studio" to the sidebar between "3D Game" and "Site Settings"). This is the owner's visual tool for creating, editing, previewing, and assigning custom animation presets WITHOUT writing code. It follows the same draft → publish safety rules as everything else.

## 9.1 What a custom animation IS (data model)

Animations are stored as validated JSON — never as code. Add to Prisma:

```prisma
model AnimationPreset {
  id          String   @id @default(cuid())
  name        String   @unique            // "Hero drop bounce"
  slug        String   @unique
  isBuiltIn   Boolean  @default(false)    // built-ins non-deletable
  target      AnimTarget @default(SECTION) // SECTION | CHILDREN | BOTH
  trigger     AnimTrigger @default(SCROLL) // LOAD | SCROLL | HOVER
  definition  Json                         // schema below (Zod-validated)
  duration    Float    @default(0.5)       // seconds, clamp 0.1–3
  delay       Float    @default(0)         // clamp 0–2
  staggerChildren Float @default(0.08)     // clamp 0–0.5
  easing      Json                         // {type:"bezier",value:[...]}|{type:"spring",stiffness,damping}
  reducedMotionFallback String @default("fade") // preset slug
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

`definition` schema (Zod, reject anything else):
```ts
const AnimatableProps = z.object({
  opacity: z.number().min(0).max(1).optional(),
  x: z.number().min(-200).max(200).optional(),        // px
  y: z.number().min(-200).max(200).optional(),
  scale: z.number().min(0.5).max(1.5).optional(),
  rotate: z.number().min(-45).max(45).optional(),     // deg
  blur: z.number().min(0).max(24).optional(),         // px
  clipDirection: z.enum(['none','up','down','left','right']).optional(),
});
const Definition = z.object({
  keyframes: z.array(z.object({
    at: z.number().min(0).max(1),      // normalized time 0..1
    props: AnimatableProps,
  })).min(2).max(6),                    // from-state … to-state
});
```
**Security:** whitelist-only properties with hard clamps, no strings, no CSS passthrough, no function bodies. A resolver maps this JSON to Framer Motion variants at render time (`lib/motion/resolve-preset.ts`). Corrupt/unknown presets resolve to `fade` and log a warning — never crash a section.

## 9.2 Studio layout (three-pane, mirrors the page builder)

```text
┌───────────────┬──────────────────────────────┬───────────────────┐
│ PRESET LIST   │        LIVE PREVIEW STAGE    │  PROPERTY EDITOR  │
│ ─ Built-in    │  ┌────────────────────────┐  │  Name  [........] │
│  ● Fade       │  │  sample section/cards  │  │  Trigger (○●○)    │
│  ● Rise quiet │  │  animates on demand    │  │  Target  (●○○)    │
│  ● Wipe bold  │  └────────────────────────┘  │  ── Keyframes ──  │
│ ─ Custom      │  [▶ Replay] [Loop ☐]         │  ◇0%  ◇40%  ◇100% │
│  ● My bounce  │  preview as: [T1|T2|T3]      │  props for ◇sel   │
│  + New preset │  sample: [Section|Cards|Hero]│  opacity ─●── 1   │
│               │  ☐ simulate reduced motion   │  y px   ──●─ 0    │
│               │                              │  ── Timing ──     │
│               │                              │  duration ──●─ .6 │
│               │                              │  easing curve ⤵   │
│               │                              │  stagger ─●── .08 │
│               │                              │  [Save] [Delete]  │
└───────────────┴──────────────────────────────┴───────────────────┘
```

### Left pane — preset library
- Two groups: **Built-in** (lock icon, duplicable but not editable/deletable) and **Custom**.
- Each row: name, tiny auto-playing 40×28 thumbnail loop of the animation on a mini card, usage count badge ("used by 3 sections").
- Actions per row: Duplicate, Rename, Delete (blocked with explanatory toast if in use — offer "Reassign & delete").
- `+ New preset` starts from a picked base preset.

### Middle pane — live preview stage
- Renders a real sample (choose: single section mock / 3-card grid / hero mock) skinned by a template switcher (T1/T2/T3) so the owner sees the preset in context.
- `▶ Replay` re-triggers; `Loop` toggle; scrub bar under the stage showing normalized time with keyframe diamonds; dragging the scrubber steps the animation (use Framer Motion's `animate()` with manual progress).
- "Simulate reduced motion" checkbox previews the fallback.
- Stage is sandboxed: preview uses the same `resolve-preset.ts` code path as production — what you preview is exactly what ships.

### Right pane — property editor
- **Basics:** name, trigger (Load / Scroll into view / Hover), target (Section / Children / Both). Choosing Children exposes stagger + stagger direction (forward / reverse / center-out).
- **Keyframe track:** horizontal track 0–100% with draggable diamond markers (min 2 = from/to, max 6). Click a diamond to edit its props; `+` adds a keyframe at playhead; keyframes snap to 5% increments.
- **Per-keyframe props:** sliders + numeric inputs for opacity (0–1), x/y (−200…200px), scale (0.5–1.5), rotate (−45…45°), blur (0–24px), clip direction dropdown. Only whitelisted props appear — there is no free-text field anywhere.
- **Timing:** duration slider (0.1–3s), delay (0–2s), easing editor: preset chips (`quiet`, `glass`, `hero`, `inOut`, `linear`) + a draggable cubic-bezier curve canvas + "Spring" mode with stiffness (50–600) / damping (5–50) sliders and a bouncing-ball micro-preview.
- **Reduced-motion fallback:** dropdown (default `Fade`), with helper text "Shown to visitors who prefer reduced motion."
- Save = validates with the Zod schema server-side; errors surface inline per field.

## 9.3 Assignment & publishing flow
- Every section's settings form (page-builder right panel) gets an **Animation** group: preset dropdown (Template default / built-ins / custom, each with hover mini-preview), plus per-section overrides for delay and stagger (clamped).
- Preset selection is part of the page DRAFT → flows through preview → two-step confirmation → publish → versioned → rollbackable, exactly like layout changes (master spec §Publishing).
- Editing a custom preset that live sections use shows a notice: "Used by N published sections — changes go live with your next publish," and edits are stored as draft revisions of the preset until published.
- Version snapshots include preset definitions so rollback restores old animations too.

## 9.4 Studio acceptance criteria
- Owner can create "Bounce drop" (y −80→0, scale .9→1, spring) in under a minute without docs.
- Preview replay matches the published behavior 1:1.
- Malformed JSON manually inserted in DB cannot break the public site (resolver falls back to `fade`).
- Deleting an in-use preset is impossible without reassignment.
- All studio controls keyboard-operable; sliders have visible focus + arrow-key steps.

---

# 10. Admin Panel Design System (template-independent)

The admin NEVER changes with the public template — it's a stable tool with its own identity: **"clean workbench."**

## 10.1 Admin tokens
```css
--a-bg:      #F6F7F9;   --a-surface: #FFFFFF;  --a-line: #E5E8EC;
--a-ink:     #171A1F;   --a-soft:    #5B6472;  --a-faint: #94A0AE;
--a-primary: #2E5BFF;   --a-primary-hover: #1F47D6;  --a-primary-tint: #EAF0FF;
--a-success: #17825B;   --a-warn: #B45309;     --a-danger: #C2362B;
--a-sidebar: #101623;   --a-sidebar-text: #C6CEDD;  --a-sidebar-active: #2E5BFF;
/* type: UI = Figtree, data/slugs/timers = IBM Plex Mono */
```

## 10.2 Shell
- Left sidebar 248px, `--a-sidebar` dark; logo top; nav groups (Content / Layout / System) with mono-label group headers; active item = `--a-sidebar-active` left 3px bar + tinted bg, slides via `layoutId`. Collapses to 64px icon rail at `lg`; bottom: avatar + Logout + **View site ↗**.
- Top bar 60px: breadcrumb, global search (`⌘K` command palette: navigate + "New project" actions), **draft-status chip** (`● Unpublished changes` amber / `✓ Live in sync` green), Preview button, primary **Publish…** button.
- Content area: `--a-bg`, cards `--a-surface` radius 12px, shadow `0 1px 3px rgb(16 22 35 / .06)`.

## 10.3 Key admin components
- **Dashboard**: stat cards (mono numbers 32px) with tiny sparklines; "Recent activity" ledger; quick actions grid; if rollback active → countdown card `mm:ss` mono + Rollback button.
- **Tables** (projects, messages…): 48px rows, hover tint, sticky header, checkbox multi-select → floating bulk-action bar slides up; row status chips (Published green / Draft gray / Hidden dashed / Archived faint); kebab menu.
- **Editor forms**: two columns — main fields left, side rail right (status, toggles, SEO, images); sticky footer bar `Save draft · Preview · Discard` appears only when dirty (slides up 200ms). Unsaved-navigation guard modal.
- **Media library**: grid, 4:3 tiles, hover shows filename+size, drag-drop upload zone with progress rings; detail drawer from right (spring.drawer).
- **Messages**: split view — list left (unread = 6px blue dot + bold), reading pane right; mark-read auto after 2s open.

## 10.4 Page builder (visual spec for master spec §8)
- Three panes: Component Library 260px / canvas / Settings 340px.
- Library items: icon + name + one-line hint; drag ghost = tilted 3° card at 90% opacity.
- Canvas rows: drag handle (⋮⋮), name, type chip, visibility eye (hidden rows = 55% opacity + dashed border), amber `● draft` dot when changed, Edit / Duplicate / Delete icons.
- dnd-kit: pick-up = card lifts (shadow lg, scale 1.02); drop target = 3px `--a-primary` insertion line that ANIMATES between gaps (layout animation); drop = settle spring; reorder announces to screen readers ("Hero moved to position 2").
- Undo/redo buttons + `⌘Z / ⌘⇧Z`; toast on undo ("Reverted: moved Hero").
- **Publish flow visuals**: Step 1 modal = diff-style change review (Added green / Removed red-struck / Moved amber arrows / Edited blue dot) → Step 2 modal = type the confirmation word (input shakes 4px once on wrong word, button disabled until match) → publishing = full-bar progress → success toast + rollback countdown banner (fixed bottom, `--a-ink` bg, mono `59:42`, Rollback button, dismissible but re-openable from dashboard).

## 10.5 Login page
- Centered 400px card on `--a-sidebar`-dark backdrop with a faint dot grid; logo, email, password, submit. Error = card shakes once (4px, 120ms) + inline message. No public nav or footer.

---

# 11. Responsive Rules

- Mobile-first. Test at 360, 390, 768, 1024, 1280, 1536.
- Hero: split → stacked (visual slot ABOVE copy on T2/T3, BELOW on T1); display type uses the clamp scale; CTAs full-width stacked at `sm`.
- Grids: tech 6→4→3→2; projects 3→2→1; contact split → stacked (form first).
- Timeline: alternating → left-rail compact below `lg`.
- Nav: links → overlay menu below `md`; admin sidebar → icon rail `lg`, bottom-sheet drawer `md`.
- Page builder on tablet: library collapses to a `+ Add section` bottom-sheet; settings pane becomes a right drawer. (Mobile admin: view-only warning banner is acceptable.)
- Touch targets ≥ 44×44px. Hover-only info must also be reachable by tap/focus.
- 3D section: `md`-down defaults to sphere-lite (≤12 balls, no physics game; game mode shows on-screen touch controls only if enabled).

# 12. Accessibility (quality floor — build in, don't bolt on)

- Contrast ≥ 4.5:1 body, 3:1 large text — verify accents on their real backgrounds (amber/cyan on dark pass only at specified sizes/weights).
- Full keyboard support; focus ring: 2px accent outline + 2px offset, NEVER removed.
- `prefers-reduced-motion` behavior exactly per §7.1 rule 4.
- Semantic landmarks (`header/nav/main/section/footer`), one `h1` per page, section headings are real `h2`s.
- Modals/drawers: focus trap, `Esc` close, return focus to invoker.
- dnd-kit keyboard sensor enabled (space to lift, arrows to move, space to drop) + live-region announcements.
- All images `alt` from CMS; decorative layers `aria-hidden`; 3D canvas has an offscreen text alternative listing the technologies.
- Forms: labels tied to inputs, errors linked via `aria-describedby`, submit feedback announced.

# 13. Performance Budget

- LCP < 2.5s, CLS < 0.05, INP < 200ms on mid-range mobile.
- Hero image priority + correct `sizes`; everything else lazy. Blur-up placeholders.
- 3D bundle (three/R3F/drei/rapier) dynamically imported ONLY when the section approaches; never in the main chunk. Cap: sphere ≤ 30 balls desktop; pause render loop when off-screen (`frameloop="demand"` + visibility check).
- Backdrop-blur limited to ≤ 6 simultaneous surfaces on screen (T2).
- Fonts: only the active template's 3 families, subset latin.
- Aurora/ambient layers: pure CSS transforms, no JS rAF loops.

# 14. Implementation Wiring (spoon-fed)

1. **Tokens as CSS variables**, one file per template: `styles/templates/{minimal|glass|threed}.css`, each scoping vars under `[data-template="…"]`. The published template sets `data-template` on `<html>`. Tailwind reads them via `theme.extend.colors: { accent: 'var(--accent)' … }` — components use semantic classes (`bg-surface text-ink border-line`) and automatically re-skin per template.
2. **Section skins**: each registered section component reads tokens + an optional `templateVariant` map for structural differences (e.g., hero visual slot: `photo | codeCard | icosahedron`).
3. **Motion**: export tokens (§7), presets seeded (§8), `resolvePreset(presetJson) → { variants, transition, viewport }` in `lib/motion/resolve-preset.ts`; a `<Animated>` wrapper component applies it with `whileInView`/load/hover per trigger, wraps `useReducedMotion()` to swap in the fallback.
4. **Mono rail** component: `<SectionRail index={computedPosition} label={section.label} />` — index derives from live section order.
5. **Fonts**: `next/font` per template, exposed as CSS vars `--font-display / --font-body / --font-mono`.
6. Custom cursor, magnetic wrapper, aurora background live in `components/effects/`, tree-shaken out of templates that don't use them.

# 15. Design Acceptance Checklist (in addition to master spec §29)

- [ ] Switching templates changes every color, font, surface, and default animation with ZERO content/layout-order changes
- [ ] Hero load choreography matches §5.2 sequence and timing on all templates
- [ ] Mono rail numbers update automatically when sections are reordered in the builder
- [ ] Tech section shows label chips + 4-square meter — no percentage bars anywhere
- [ ] Timeline spine fill is scroll-linked; nodes pulse on pass
- [ ] Animation Studio: create → preview → assign → draft → 2-step publish → rollback restores previous animation
- [ ] Built-in presets locked; in-use presets undeletable without reassignment
- [ ] Reduced-motion: loops stop, presets fall back to fade, 3D shows static grid, cursor/magnetic disabled
- [ ] Keyboard-only user can reorder page-builder sections and operate the keyframe editor
- [ ] No layout-property animations (verify with DevTools performance pass)
- [ ] Backdrop-blur count ≤ 6 on any T2 viewport
- [ ] Lighthouse (mobile): Performance ≥ 85, Accessibility ≥ 95 on homepage with 3D section present

---

**Final instruction to the code AI:** where this file and your instincts disagree, this file wins. Where this file is silent, follow the motion rules (§7.1), the template's stated volume level, and the "engineering as craft" identity. Never introduce new accent colors, new fonts, or unlisted animation properties.
