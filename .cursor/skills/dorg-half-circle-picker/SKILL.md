---
name: dorg-half-circle-picker
description: Build and maintain Dorg's custom dual half-circle picker for timer and material selection in React Native. Use when working on the half-circle picker, curved wheel visuals, picker alignment, snap scrolling, timer/material selectors, or pricing selector UI in Dorg.
---

# Dorg Half Circle Picker

## Purpose

Build and maintain Dorg's custom dual half-circle picker for time and material selection.

## When To Use

Use this skill when:
- Editing the half-circle picker component or a closely related screen
- Fixing overlap, center-axis alignment, spacing, or label placement
- Tuning snap scroll behavior, inertial feel, or selected-value handling
- Adjusting curve transforms, tick marks, or number emphasis
- Wiring timer or material changes into instant price updates

## Workflow

1. Inspect the existing picker structure and state bindings before editing.
2. Fix layout and center-axis positioning first.
3. Fix scroll interaction and selected state second.
4. Fix curve, tick marks, and visual hierarchy last.
5. Keep the diff small and verify price updates still happen instantly.

## Core Rules

- Reuse the existing Expo + React Native structure.
- Prefer modifying the current picker rather than replacing it.
- Use `FlatList` or `Animated.FlatList`, never default picker components.
- Keep scrolling vertical only and outside any `ScrollView`.
- Preserve native-feeling snap behavior with `snapToInterval` and `decelerationRate="fast"`.
- Do not add boxed containers, overlapping wheels, or horizontal scrolling.
- Do not break pricing logic or debounce picker-driven price updates.

## Implementation Notes

- Treat the middle of the screen as the shared selection axis.
- The left and right halves must face each other and meet visually in the center without overlap.
- Use transforms to sell the half-circle effect; never render the picker as a flat vertical list.
- Read [reference.md](reference.md) before making structural or visual changes.

## Output

Aim for:
- A clean diff
- No pricing regressions
- Smooth, performant scrolling
- Visual consistency with Dorg UI
