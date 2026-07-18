# Handoff: Savely — Landing Page (savelypharma.fr)

## Overview

Full marketing landing page for **Savely**, a B2B SaaS targeting French pharmacy chains ("officines") and pharmacy groups ("groupements"). The page converts visitors into demo requests by surfacing the fiscal benefit (60% tax reduction via art. 238 bis CGI / Cerfa 16216) of donating slow-moving cosmetic stock to associations.

## About the Design Files

`Savely LP.dc.html` is a **high-fidelity design reference** built in HTML. It shows the intended look, layout, copy, and interactions. The task is to **recreate this in Next.js** (App Router recommended) using Tailwind CSS or CSS Modules — do not ship the HTML file directly.

## Fidelity

**High-fidelity.** Colors, typography, spacing, copy, and interactions are final. Recreate pixel-accurately.

---

## Tech Stack Recommendation

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS v3+
- **Font**: `Plus Jakarta Sans` — load via `next/font/google`
- **Animations**: `framer-motion` for scroll fade-ins (or Intersection Observer + CSS)
- **Forms**: React state (no library needed — 3-field forms)
- **Icons**: Inline SVG (all icons are custom simple SVGs, listed below)

---

## Design Tokens

### Colors

```
--savely-primary:    #4A9B8E   (main teal — CTAs, headings, accents)
--savely-dark:       #2D6B62   (hover states, dark teal)
--savely-accent:     #F5A623   (orange — secondary CTAs, badges)
--bg-white:          #FFFFFF
--bg-alt:            #F0F7F6   (teal-tinted off-white — alternating sections)
--bg-dark:           #1A1A1A   (footer)
--text-primary:      #1A1A1A
--text-secondary:    #6B7280
--text-muted:        #9CA3AF
--border-light:      #EAF4F3
--border-input:      #E5E7EB
```

### Typography

```
Font: Plus Jakarta Sans (Google Fonts)
Weights: 400, 500, 600, 700, 800

Hero H1:        clamp(36px, 4.5vw, 58px) / weight 800 / line-height 1.12 / letter-spacing -0.03em
Section H2:     clamp(28px, 3.5vw, 42px) / weight 800 / line-height 1.2  / letter-spacing -0.03em
Card H3:        16–18px / weight 700
Body:           16px / weight 400 / line-height 1.65
Small/label:    13–14px / weight 500–600
Stat numbers:   48px / weight 800 / letter-spacing -0.03em / color #4A9B8E
```

### Spacing

```
Section padding:      96px top/bottom (72px on compact sections)
Container max-width:  1160px, horizontal padding 32px (20px mobile)
Card padding:         28–40px
Gap between cards:    20–24px
```

### Border Radius

```
Buttons:    10–14px
Cards:      16–24px
Badges:     100px (pill)
Nav logo:   10px
```

### Shadows

```
Card light:   0 4px 24px rgba(74,155,142,.08)
Card hover:   0 8px 32px rgba(74,155,142,.14)
Hero mockup:  0 24px 64px rgba(0,0,0,.12), 0 4px 16px rgba(74,155,142,.15)
CTA section:  0 16px 48px rgba(74,155,142,.35)
```

---

## Page Structure

### Layout

Single scrolling page. Fixed navbar at top (z-index 100). 10 sections + footer.

```
/
├── <Navbar />           fixed, backdrop-blur
├── <Hero />             2-col grid: copy left, dashboard mockup right
├── <Stats />            bg #F0F7F6 — 3 stat cards
├── <HowItWorks />       3 steps with arrows
├── <Features />         bg #F0F7F6 — 2×3 feature card grid
├── <Groupements />      bg #4A9B8E — 2-col: copy + officine list mockup
├── <Associations />     2-col: form left, notification card mockup right
├── <Particuliers />     bg #F0F7F6 — centered, email waitlist
├── <SocialProof />      3 testimonials + partner logos
├── <Pricing />          bg #F0F7F6 — 2 pricing cards
├── <CtaFinal />         bg #4A9B8E — centered CTA
└── <Footer />           bg #1A1A1A — 4-col grid
```

---

## Sections — Detailed Spec

### NAVBAR

- **Position**: fixed top, full width, `backdrop-filter: blur(12px)`, `background: rgba(255,255,255,0.95)`
- **Height**: 68px
- **Border**: `1px solid rgba(74,155,142,0.12)` bottom
- **Scroll behavior**: on scroll > 40px, add `box-shadow: 0 2px 24px rgba(0,0,0,0.1)`
- **Logo**: 34×34px teal (#4A9B8E) rounded square (radius 10px) with white "S" (weight 800, 18px) + "Savely" text 20px weight 800
- **Nav links**: Fonctionnalités · Pour les associations · Tarifs · Se connecter — 15px weight 500, color #6B7280, hover #1A1A1A
- **CTA button**: "Demander une démo" — bg #4A9B8E, white text, 14px weight 700, padding 10px 22px, radius 10px, hover bg #2D6B62
- **Mobile**: hide nav links below 768px; show compact CTA button only

### HERO

- **Layout**: CSS Grid 1fr 1fr, gap 80px, align-items center. Collapses to 1 col at 1024px.
- **Left — Content**:
  - Pill badge: bg #F0F7F6, border #C5E0DC, "Pour les officines et groupements" — 13px weight 600 color #4A9B8E. Animated blinking dot (teal, 7px, opacity pulse 2s).
  - H1: "Vos produits cosmétiques dorment." (black) + line break + "Savely les réveille." (color #4A9B8E)
  - Subheadline: 18px #6B7280, max-width 480px, line-height 1.65
  - CTA row (flex, gap 14px, flex-wrap):
    - Primary: bg #4A9B8E, white, 15px weight 700, padding 15px 28px, radius 12px, box-shadow `0 4px 16px rgba(74,155,142,0.35)`, hover bg #2D6B62
    - Ghost: border 1.5px #4A9B8E, color #4A9B8E, hover bg #F0F7F6
  - Trust badges (flex, gap 20px, flex-wrap): 3 items with green checkmark SVG + text 13px #6B7280
    - "Données hébergées en France" · "RGPD" · "Cerfa 16216 automatique"
- **Right — Dashboard Mockup**:
  - Animated with `@keyframes float` (translateY 0 → -10px → 0, 5s ease-in-out infinite)
  - Outer card: white, radius 20px, shadow (see above), border `1px solid rgba(74,155,142,0.1)`
  - Window bar: bg #F8FFFE, border-bottom #EAF4F3, traffic-light dots (red #FF5F57 / yellow #FEBC2E / green #28C840, 11px circles), centered label "Savely · Vue d'ensemble"
  - Content area padding 24px:
    - Header row: pharmacy name + date text / "● En direct" badge (bg #4A9B8E, white, 11px, radius 8px)
    - 3 KPI cards (grid 3 cols, gap 12px):
      - Card 1: gradient #4A9B8E → #3a8a7d, radius 12px, padding 16px, white. Label "Économisé" (10px, uppercase, 0.8 opacity). Value "284€" (22px weight 800). Sub "ce mois" (11px, 0.75 opacity).
      - Card 2: gradient #3a8a7d → #2D6B62. "3 dons complétés"
      - Card 3: gradient #F5A623 → #e8941a. "60% réduction fiscale"
    - Activity bar chart: bg #F8FFFE, radius 12px, padding 16px. 6 bars (flex, gap 8px, height 60px): heights [35%, 55%, 40%, 70%, 85%, 100%], colors [#C5E0DC, #4A9B8E, #C5E0DC, #4A9B8E, #4A9B8E, #F5A623]
    - Cerfa badge: bg #F0F7F6, radius 10px, padding 12px 14px, teal check icon + "Cerfa 16216 prêt" (12px weight 700) + association info + "Télécharger" link

### STATS ("Ce que coûte vraiment un stock mal géré")

- **Background**: #F0F7F6
- **Grid**: 3 cols, gap 24px (1 col on mobile)
- **Cards**: white, radius 20px, padding 40px 32px, border #EAF4F3
- Card 1: "650€–3 750€" / 48px weight 800 / color #4A9B8E + "perdus par mois" 15px weight 600
- Card 2: "47 jours" / same style + "d'immobilisation moyenne"
- Card 3: "60%" / color **#F5A623** + "de réduction fiscale" — note this one is orange
- Bottom line (centered, 17px weight 600 color #2D6B62): "Savely transforme ces pertes en avantages fiscaux traçables."

### HOW IT WORKS ("Simple comme un export CSV")

- **Grid**: 5 columns `1fr 48px 1fr 48px 1fr` (arrows in the 48px cols). Collapses to 1 col at 1024px with arrows hidden.
- Each step: icon box (72×72px, bg #F0F7F6, radius 20px, border 2px #C5E0DC) + numbered circle (28px, bg #4A9B8E, white, weight 800) + H3 + body text (15px #6B7280, max-width 280px centered)
- Arrow SVG between steps: `→` style, color #C5E0DC, 24×24px
- Steps:
  1. "Importez votre stock" — CSV/file icon SVG
  2. "Savely identifie les produits dormants" — clock/analysis icon SVG
  3. "Donnez, économisez, recevez votre Cerfa" — checkbox icon SVG

### FEATURES ("Tout ce dont votre officine a besoin")

- **Background**: #F0F7F6
- **Grid**: 3 cols at desktop, 2 cols at 1024px, 1 col at 640px. Gap 20px.
- **Cards**: white, radius 16px, padding 28px, border #EAF4F3. Hover: translateY(-3px) + stronger shadow.
- Icon box: 48×48px, radius 12px
- 6 features:
  1. Dashboard en temps réel — icon bg #F0F7F6, grid SVG icon teal
  2. Réseau d'associations — icon bg #F0F7F6, circles SVG teal
  3. Cerfa 16216 automatique — icon bg **#FFF8EE**, document SVG **#F5A623** ← orange icon
  4. App préparateur QR Code — icon bg #F0F7F6, phone SVG teal
  5. 100% conforme RGPD — icon bg #F0F7F6, shield SVG teal
  6. Suivi RSE intégré — icon bg #F0F7F6, chart/trend SVG teal

### GROUPEMENTS (full teal section)

- **Background**: #4A9B8E, text white
- **Grid**: 2 cols, gap 80px. Collapses to 1 col (implied by responsive).
- Left: pill badge (rgba(255,255,255,0.15)), H2 white, body text rgba(255,255,255,0.85), 4 checkmark bullets (white circle icon + white text), CTA button (white bg, #4A9B8E text, hover rgba(255,255,255,0.92))
- Right: multi-officine dashboard card
  - Outer: bg rgba(255,255,255,0.1), radius 20px, padding 28px, border rgba(255,255,255,0.2)
  - 3 officine rows: each bg rgba(255,255,255,0.12), radius 12px, padding 14px 16px, flex space-between. Name (13px weight 700 white) + subtitle. Badge on right (+60% teal or "Top" orange).
  - Bottom impact card: bg rgba(255,255,255,0.08), "4 820€" in 28px weight 800 white

### ASSOCIATIONS

- **Grid**: 2 cols 1fr 1fr, gap 72px. Collapses at 768px.
- Left: pill, H2, body, form (3 inputs + submit button). On submit, replace form with success message.
  - Inputs: padding 13px 16px, border 1.5px #E5E7EB, radius 10px, 15px
  - Submit: bg #4A9B8E, white, weight 700, radius 10px, hover #2D6B62
  - Success state: bg #F0F7F6, radius 16px, padding 28px, border 2px #4A9B8E
- Right: notification card mockup
  - Card: white, radius 20px, shadow, border #EAF4F3
  - Header: bg #4A9B8E, padding 16px 20px, star icon + "Nouvelle offre de don" + timestamp
  - Body (padding 20px): pharmacy location row, product list card (bg #F8FFFE), time slot row (bg #FFF8EE), 2-button grid (Accept teal / Refuse gray)

### PARTICULIERS

- **Background**: #F0F7F6
- Centered, max-width 600px
- Email input + submit button in a flex row (wraps on mobile)
- On submit, replace with success message
- Two "coming soon" app store badges (gray boxes)

### SOCIAL PROOF

- 3 testimonials grid (3 cols → 1 col mobile), gap 24px
- Cards: white, radius 20px, padding 32px, border #EAF4F3
- ★★★★★ in #F5A623 (20px)
- Quote text: 15px italic #374151, line-height 1.7
- Avatar: 40×40 circle, bg #F0F7F6, initials in #4A9B8E weight 800
- Name 14px weight 700 / Role 13px #6B7280
- Partner logos row below: gray rounded boxes (#F5F5F5 bg, border #E5E7EB) with all-caps text in #9CA3AF

### PRICING

- **Background**: #F0F7F6
- Grid: 2 cols, max-width 820px, centered
- **Card 1 — Essentiel**: white bg, radius 24px, padding 40px 36px
  - "49€/mois" — 42px weight 800
  - "14 jours gratuits, sans carte bancaire" — 14px #4A9B8E weight 600
  - 5 feature rows with teal check circles
  - CTA: border 1.5px #4A9B8E, bg #F0F7F6, color #4A9B8E. Hover: bg #4A9B8E color white
- **Card 2 — Groupement**: bg #4A9B8E, text white, radius 24px, padding 40px 36px
  - Badge "Populaire" (absolute top-right): bg #F5A623, white, 11px weight 800, radius pill
  - "Sur devis" — 42px weight 800 white
  - 5 feature rows with white check circles (rgba(255,255,255,0.2) bg)
  - CTA: bg white, color #4A9B8E, hover rgba(255,255,255,0.9)
  - Shadow: `0 16px 48px rgba(74,155,142,0.35)`

### CTA FINAL

- **Background**: #4A9B8E
- Centered, max-width 640px
- H2 white: "Prêt à transformer votre stock en impact ?" — clamp(30px, 4vw, 52px)
- Body: "14 jours gratuits. Sans carte bancaire. Sans engagement." — rgba(255,255,255,0.82)
- CTA button: white bg, color #4A9B8E, 17px weight 800, padding 18px 40px, radius 14px, shadow
- Fine print: "Réponse sous 24h · Cerfa 16216 · 60% de réduction fiscale" — rgba(255,255,255,0.55)

### FOOTER

- **Background**: #1A1A1A
- Padding: 64px top, 40px bottom
- 4-col grid `2fr 1fr 1fr 1fr`, gap 48px. Collapses to 2-col at 1024px, 1-col at 480px.
- Col 1: Logo + tagline (14px #6B7280) + LinkedIn icon (36px dark square, hover bg #4A9B8E) + "© 2026 Savely · savelypharma.fr"
- Cols 2–4: section heading (13px uppercase letter-spacing, white) + link list (14px #9CA3AF, hover white)
  - Produit: Fonctionnalités, Tarifs, Demander une démo, Se connecter
  - Pour qui: Officines, Groupements, Associations, Particuliers
  - Légal: CGU, Politique de confidentialité, RGPD, Mentions légales
- Bottom bar (border-top #2A2A2A): 2 lines 13px #4B5563

---

## Interactions & Behavior

### Scroll Animations

All major sections and cards use a **fade-up-on-enter** animation:

- Initial: `opacity: 0; transform: translateY(28px)`
- Final: `opacity: 1; transform: none`
- Timing: `0.65s cubic-bezier(0.22, 1, 0.36, 1)`
- Trigger: IntersectionObserver threshold 0.1 (or Framer Motion `whileInView`)
- Staggered delays within a group: +0.08s per child

### Hero Dashboard

- CSS animation `float`: `translateY(0deg) rotate(-1deg)` → `translateY(-10px) rotate(0deg)` → repeat, 5s ease-in-out infinite

### Navbar

- On mount, attach `scroll` listener
- When `scrollY > 40`: add `box-shadow: 0 2px 24px rgba(0,0,0,0.1)`

### Forms

Two forms with simple React state:

1. **Association form** (3 fields: Nom, Email, Ville) — on submit, replace form with success card
2. **Early access form** (Email only) — on submit, replace with success message

### Button Hover States

- All teal buttons: bg darkens to #2D6B62 (`transition: background 0.2s`)
- Ghost button: bg becomes #F0F7F6
- White buttons (on teal bg): bg becomes rgba(255,255,255,0.9)
- Cards: translateY(-3px) + stronger shadow on hover

---

## State Management

```ts
// Page-level state (can be local React state, no global store needed)
interface PageState {
  navScrolled: boolean; // triggers nav shadow
  assoSubmitted: boolean; // toggles association form → success
  earlySubmitted: boolean; // toggles early-access form → success
}
```

---

## Copy — Key Phrases (appear multiple times, must be exact)

- "Cerfa 16216" (always with the number)
- "60% de réduction fiscale"
- "art. 238 bis CGI"
- "14 jours gratuits. Sans carte bancaire. Sans engagement."
- "Données hébergées en France"

---

## Anchor IDs (internal navigation)

```
#fonctionnalites   → Features section
#groupements       → Groupements section
#associations      → Associations section
#particuliers      → Particuliers section
#tarifs            → Pricing section
#demo              → Final CTA section
```

---

## Assets

No external images. Everything is:

- Inline SVG icons (simple geometric — all < 10 paths, included in design file)
- CSS-only shapes for dashboard mockup, notification card, and groupement panel
- Google Fonts: Plus Jakarta Sans (loaded via `next/font/google`)

---

## Routing

Single page — no sub-routes needed. All CTAs link to:

- `mailto:demo@savelypharma.fr` (demo requests)
- `mailto:contact@savelypharma.fr` (groupement contact)
- Internal anchor `#demo`

---

## Files in this Package

- `Savely LP.dc.html` — **Full high-fidelity design reference**. Open in any browser to see the intended result. Use as visual ground truth when building the Next.js version.
- `README.md` — This document.
