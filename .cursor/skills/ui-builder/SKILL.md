---
name: ui-builder
description: Build and refine React Native UI components with precise layout control. Use when creating new UI components, adjusting layout, or fixing spacing, alignment, and visual bugs in React Native screens or components.
---

# UI Builder

## Purpose

Build and refine React Native UI components with precise layout control.

## When To Use

Use this skill when:
- Creating new UI components
- Adjusting layout in an existing component
- Fixing spacing, alignment, or visual bugs

## Workflow

1. Inspect the existing component structure before editing.
2. Identify the active layout system in use, such as flexbox, absolute positioning, or composed wrappers.
3. Modify only the smallest set of styles or structure needed to solve the issue.
4. Preserve styling consistency with nearby components and existing patterns.

## Rules

- Do not introduce new UI libraries.
- Prefer `StyleSheet` over inline styles.
- Avoid unnecessary wrappers.
- Always maintain the existing dark theme.
- Reuse existing components, hooks, and utilities before creating new ones.
- Do not guess layout behavior; inspect the current code first.
- Keep diffs minimal and avoid unrelated cleanup.

## Output

Aim for:
- A clean, minimal diff
- No unrelated changes
- Styling that matches the existing product feel
