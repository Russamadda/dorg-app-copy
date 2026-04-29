---
version: alpha
name: DORG
description: Light Scandinavian service workspace with atmospheric backgrounds, white elevated cards, forest-green primary actions, restrained gray typography, and a dark high-focus offer workspace.
colors:
  primary: "#1B4332"
  primary-strong: "#0F2D1F"
  primary-soft: "#4CAF82"
  primary-text: "#1F5A3D"
  neutral: "#F5F4F0"
  canvas-atmospheric: "#E6E8EC"
  canvas-cool: "#EEF1F6"
  canvas-soft: "#F3F5F1"
  surface: "#FFFFFF"
  surface-muted: "#F4F5F8"
  surface-tint: "#F0F2F6"
  surface-subtle: "#FAFBFC"
  surface-border: "#E2E8E4"
  input-border: "#D1D5DB"
  text-primary: "#111111"
  text-strong: "#111827"
  text-body: "#333333"
  text-secondary: "#6B7280"
  text-muted: "#888888"
  text-subtle: "#AAAAAA"
  text-inverse: "#FFFFFF"
  success: "#16A34A"
  success-deep: "#166534"
  success-soft: "#48C774"
  info: "#2563EB"
  info-strong: "#4B7BFF"
  warning: "#D97706"
  warning-soft: "#D2A13B"
  warning-strong: "#C46A1A"
  danger: "#DC2626"
  danger-strong: "#CC3333"
  dark-canvas: "#101012"
  dark-surface: "#17181B"
  dark-surface-strong: "#1A1A1C"
  dark-surface-muted: "#1C1E24"
  dark-surface-raised: "#232326"
  dark-stroke: "#2C2C31"
  dark-text: "#F5F7FA"
  dark-text-muted: "#D1D6DE"
  dark-text-subtle: "#AEB6C2"
  dark-accent: "#4ADE80"
  dark-accent-soft: "#7EF0A9"
typography:
  display-brand:
    fontFamily: DMSans
    fontSize: 42px
    fontWeight: 700
    lineHeight: 46px
    letterSpacing: 0.05em
  screen-title:
    fontFamily: DMSans
    fontSize: 28px
    fontWeight: 700
    lineHeight: 32px
    letterSpacing: -0.02em
  card-title:
    fontFamily: DMSans
    fontSize: 16px
    fontWeight: 700
    lineHeight: 21px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: DMSans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.35
  body-md:
    fontFamily: DMSans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  body-sm:
    fontFamily: DMSans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
  label-md:
    fontFamily: DMSans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 18px
  label-sm:
    fontFamily: DMSans
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
  section-label:
    fontFamily: DMSans
    fontSize: 12px
    fontWeight: 700
    lineHeight: 16px
    letterSpacing: 0.08em
  topbar-brand:
    fontFamily: DMSans
    fontSize: 15px
    fontWeight: 700
    lineHeight: 18px
    letterSpacing: 0.13em
  price-lg:
    fontFamily: DMSans
    fontSize: 22px
    fontWeight: 700
    lineHeight: 26px
    letterSpacing: -0.02em
  price-md:
    fontFamily: DMSans
    fontSize: 17px
    fontWeight: 700
    lineHeight: 21px
    letterSpacing: -0.01em
  editorial-title:
    fontFamily: "DM Serif Display"
    fontSize: 32px
    fontWeight: 400
    lineHeight: 1.15
rounded:
  none: 0px
  xs: 4px
  sm: 10px
  md: 12px
  lg: 16px
  xl: 20px
  pill: 22px
  modal: 24px
  hero: 28px
  full: 999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  xxl: 24px
  xxxl: 32px
  screen-padding: 20px
  card-padding: 16px
  card-gap: 8px
  topbar-padding-top: 6px
  topbar-padding-bottom: 6px
  tabbar-padding-horizontal: 20px
  tabbar-padding-vertical: 10px
  auth-content-padding-y: 24px
elevation:
  light-card: 6
  light-soft: 3
  floating-tabbar: 10
  dark-modal: 12
shadows:
  light-card:
    color: "#B0BAC8"
    offsetX: 0px
    offsetY: 4px
    blur: 16px
    opacity: 0.18
  light-soft:
    color: "#B0BAC8"
    offsetX: 0px
    offsetY: 2px
    blur: 8px
    opacity: 0.12
  floating-tabbar:
    color: "#B0BAC8"
    offsetX: 0px
    offsetY: -2px
    blur: 12px
    opacity: 0.10
  dark-modal:
    color: "#000000"
    offsetX: 0px
    offsetY: 8px
    blur: 20px
    opacity: 0.22
motion:
  easing-standard: "cubic-bezier(0.33, 1, 0.68, 1)"
  duration-micro: 90ms
  duration-fast: 140ms
  duration-standard: 220ms
  duration-auth-stage: 230ms
  duration-sheet: 280ms
  duration-emphasis: 320ms
  duration-pulse: 800ms
  duration-glow-cycle: 1050ms
  button-press-scale: 0.99
  card-press-scale: 0.96
surfaces:
  glass-fill-opacity: 0.14
  glass-overlay-opacity: 0.18
  glass-edge-opacity: 0.12
  auth-surface-opacity: 0.92
  auth-muted-surface-opacity: 0.55
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-inverse}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    height: 54px
    padding: 0 20px
  button-primary-pressed:
    backgroundColor: "{colors.primary-strong}"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-padding}"
  card-soft:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-padding}"
  input-field:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    height: 46px
    padding: 0 14px
  input-field-auth:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    height: 58px
    padding: 0 16px
  chip-filter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 9px 18px
  chip-filter-active:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.text-inverse}"
  tabbar-floating:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    rounded: 26px
    height: 76px
    padding: 10px 20px
  fab-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-inverse}"
    rounded: 34px
    height: 68px
    width: 68px
  toast-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.full}"
    padding: 12px 16px
  modal-dark-panel:
    backgroundColor: "{colors.dark-surface-strong}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.xl}"
    padding: 16px
  preview-editorial-title:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.editorial-title}"
    rounded: "{rounded.none}"
---

## Overview

DORG is a service-business workspace with a restrained Scandinavian tone rather than a glossy SaaS look. The core product feels calm, tidy, and trustworthy: pale atmospheric backgrounds sit behind bright white cards, primary actions use a dark forest green, and most copy is carried by neutral charcoal and warm gray rather than high-chroma brand color.

The product has three visual modes that belong to the same identity:

- The main app shell is airy and light, with lifted cards and generous negative space.
- Auth and onboarding are softer and more editorial, using the same green but with more translucent surfaces and gentler gradients.
- Offer construction and detail workflows shift into a darker, studio-like environment so the user can focus on dense pricing, materials, and status work without losing the DORG green accent.

The overall impression should be premium but practical. It should feel like a careful contractor’s notebook translated into a polished mobile workspace.

## Colors

The palette is led by neutral atmosphere first and brand color second.

- **Primary (`#1B4332`)** is the brand’s anchor. Use it for the main CTA, active navigation, important emphasis, and high-trust actions.
- **Primary Strong (`#0F2D1F`)** is the pressed or deeper state of the same action color.
- **Primary Soft (`#4CAF82`)** and the related green success tones are used for confirmation, completion, and positive highlights, never as broad page fills.
- **Neutral canvases (`#F5F4F0`, `#E6E8EC`, `#EEF1F6`, `#F3F5F1`)** provide the product’s soft atmospheric field. These should feel cloudy and cool, not stark white.
- **White surfaces (`#FFFFFF`)** carry the interactive content. The contrast between atmospheric page background and true white card is a key part of the hierarchy.
- **Text neutrals (`#111111`, `#111827`, `#333333`, `#6B7280`, `#888888`, `#AAAAAA`)** do most of the visual work. The UI should remain readable and understated even if the green accent is removed.
- **Status colors** are specific and sparing: green for approved/completed, blue for attention or requested changes, amber/orange for waiting and reminders, red for destructive or overdue states.
- **Dark workflow colors** are charcoal rather than pure black. The dark offer workspace should feel technical and focused, with green and cool-white accents sitting on layered near-black panels.

Glass surfaces in the floating tab bar are not fully opaque. Treat them as white surfaces with low-opacity fills and blur, not as solid gray bars.

## Typography

DM Sans is the main voice of the product. It is clean, modern, and friendly without becoming playful. Most screens rely on only three weights: regular for body copy, medium for utility labels, and bold for titles, prices, and action labels.

- Screen and card titles are compact and assertive rather than oversized.
- Body text is open and readable, tuned for short operational copy and metadata-heavy lists.
- Section labels are uppercase or near-uppercase with added tracking to organize forms and grouped content.
- Brand text uses bold DM Sans with wider letter spacing, giving the wordmark a simple, no-nonsense presence.
- DM Serif Display is reserved for editorial moments in offer preview surfaces. It should feel like a document heading, not the default product typeface.

Typography should stay disciplined. Dense operational screens work because the type hierarchy is stable and quiet.

## Layout

The layout rhythm is built on a 4px base with a practical working scale of 8, 12, 16, 20, 24, and 32px. Most surfaces use 16px internal padding and 20px outer screen padding. Cards are spaced closely enough to feel efficient, but never cramped.

- The main shell favors vertically stacked cards and segmented groups.
- Top bars are minimal and largely transparent so the atmospheric background remains visible.
- Floating navigation introduces a deliberate center void for the primary add action.
- Auth and onboarding use centered stacks with more breathing room and stronger vertical progression.
- Dense creation flows can tighten spacing, but the base rhythm should still resolve back to the 4px grid.

The interface should always preserve some visible background around primary containers. The product loses character if every screen becomes edge-to-edge white.

## Elevation & Depth

Depth is created with a combination of atmospheric background contrast, bright white surfaces, and soft blue-gray shadows.

- Default cards use a soft lifted shadow. They should feel placed above the background, not dramatically floating.
- Secondary raised elements use a lighter, tighter shadow treatment.
- The floating tab bar uses blur and translucency first, shadow second.
- Dark modals and offer-detail panels rely on layered charcoal surfaces and deeper black shadows to separate stacked panels.
- Borders are subtle and usually secondary to tonal separation.

The system should avoid harsh, dense drop shadows. DORG’s depth is soft, misty, and controlled.

## Shapes

The shape language is rounded and approachable, but still businesslike.

- Standard controls and inputs sit around 12 to 16px radius.
- Cards most often use 20px radius.
- Primary buttons push slightly rounder, around 22px, to feel intentional and touch-friendly.
- Full-pill forms are used for chips, toasts, badges, and circular controls.
- Large modal and hero surfaces can move toward 24 to 28px when they need a more staged presence.

Corners should feel consistently softened across the product. Mixing sharp rectangles with the default system weakens the visual identity.

## Components

### Buttons

Primary buttons are forest green with white text, rounded enough to feel tactile, and visually centered. Pressed states deepen the green rather than shifting hue. Secondary actions should generally stay quieter and lean on typography or tonal surfaces.

### Cards

The default card is the core DORG component: white fill, 20px radius, soft ambient shadow, bold title, muted metadata, and restrained iconography. Cards should feel like organized paper modules laid onto a cloudy desktop.

### Inputs

Inputs in the app shell are light, soft, and almost blended into the surface palette. Inputs in auth and onboarding are slightly taller and cleaner, with stronger focus treatment and a more polished “entry” feel.

### Navigation

The floating tab bar is the most explicit glass treatment in the app. Keep it translucent, blurred, and light. The centered FAB must remain the strongest shape in the navigation cluster.

### Dark Workflow Panels

Offer creation and detail panels are intentionally darker and denser. Preserve the contrast between charcoal layers, keep text cool-white, and use green sparingly for progress, success, or confirmation. The dark mode here is a focused workspace, not a separate brand.

## Do's and Don'ts

- Do preserve the contrast between atmospheric page background and bright white content cards.
- Do use forest green for the single most important action or active state on a screen.
- Do keep most text neutral and let hierarchy come from weight, spacing, and surface contrast.
- Do maintain the softer card radii and subdued shadow language.
- Do treat the dark offer workspace as a focused sub-mode of the same brand.
- Don't turn the interface into generic flat white screens with no visible atmospheric background.
- Don't overuse accent colors for decoration.
- Don't use heavy black shadows or glossy gradients on standard cards.
- Don't introduce new font families beyond DM Sans and the limited editorial serif accent.
- Don't mix sharp-cornered enterprise widgets into the otherwise rounded system.
