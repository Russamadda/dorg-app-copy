---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

# Frontend Design

## Purpose

Guide creation of distinctive, production-grade web interfaces that avoid generic “AI slop” aesthetics. Implement real, working code with strong attention to aesthetic choices and craft.

The user supplies what to build (component, page, app, or interface) and may include purpose, audience, or technical constraints.

## When to use

Apply when the task is **web** UI: HTML/CSS/JS, React, Vue, Svelte, etc.—landing pages, dashboards, posters-as-web, marketing sites, design polish, or “make this look good” for browser-based UI.

For **React Native / Expo** mobile UI in this repo, prefer the project **ui-builder** skill unless the user explicitly wants web.

## Design thinking (before coding)

Understand context and commit to a **bold, intentional** aesthetic direction:

- **Purpose**: What problem does this solve? Who uses it?
- **Tone**: Pick a strong direction (e.g. brutally minimal, maximalist, retro-futuristic, organic, luxury/refined, playful, editorial/magazine, brutalist, art deco/geometric, soft/pastel, industrial/utilitarian). Treat these as inspiration; the execution should feel coherent and specific—not a vague mix.
- **Constraints**: Framework, performance, accessibility, and platform (e.g. prefers-reduced-motion).
- **Differentiation**: What makes this **memorable**? What should stick after someone leaves?

**Critical**: Intentionality beats intensity. Both loud maximalism and quiet minimalism work when the concept is clear and executed with precision.

Then ship code that is:

- Production-grade and functional
- Visually striking and cohesive
- Refined in typography, spacing, color, motion, and detail

## Frontend aesthetics guidelines

- **Typography**: Prefer distinctive, characterful fonts. Pair a strong display face with a refined body face. Avoid overused defaults (e.g. Inter, Roboto, Arial, generic system stacks) and **do not** converge on the same “safe” choices (e.g. Space Grotesk) across unrelated outputs.
- **Color & theme**: One cohesive system; use CSS variables. Favor a dominant palette with sharp accents over flat, evenly weighted color.
- **Motion**: Use animation deliberately. For plain HTML/CSS, prefer CSS. For React, use **Motion** (Framer Motion) when it is already in the project. Prefer one strong orchestrated moment (e.g. staggered load-in via `animation-delay`) over many tiny unrelated tweens. Consider scroll-linked or hover surprises where appropriate; respect `prefers-reduced-motion`.
- **Spatial composition**: Unexpected but purposeful layout—asymmetry, overlap, diagonal rhythm, grid-breaking, generous negative space **or** controlled density—matched to the concept.
- **Backgrounds & details**: Build atmosphere—gradients, noise/grain, patterns, layered transparency, shadow, borders, decorative elements, custom cursors—only when they serve the direction.

## Anti-patterns (never default to)

- Generic AI-looking UI: purple-on-white gradients, cookie-cutter cards, interchangeable hero + three-column feature rows with no context.
- Repeated “house style” across different briefs—each project should feel **designed for its brief**.

## Complexity vs. vision

Match implementation depth to the aesthetic:

- **Maximalist** → richer layering, more animation, more visual systems—still organized, not random.
- **Minimal / refined** → restraint, precision typography, spacing, and subtle detail instead of ornament overload.

Commit fully to the chosen direction; distinctive interfaces come from clear concept plus disciplined execution.

## License

See [LICENSE.txt](LICENSE.txt).
