---
name: dorg-feature-builder
description: Builds and refines Dorg app features with minimal disruption to the user flow. Use when implementing or modifying Dorg features, tilbud generation, pricing-related behavior, onboarding, or flow-sensitive interactions in the Expo React Native app, especially around the core offer flow.
---

# Dorg Feature Builder

## Purpose

Build Dorg features without slowing down the main job.

## Project Context

Dorg is an AI-powered tilbud generator for Norwegian tradespeople.

Stack:
- Expo React Native
- TypeScript
- Supabase backend
- Resend email

Core flow:
1. Describe job
2. Generate offer
3. Add customer
4. Send

## When To Use

Use this skill when:
- Adding a new Dorg feature
- Changing a step inside an existing flow
- Touching tilbud generation, pricing, onboarding, or action-heavy screens
- Adjusting interactions where speed and low friction matter
- Editing logic or UI around the core offer flow
- Working in critical flow components such as `NyttTilbudModal.tsx` or `HalfCirclePicker.tsx`

## Core Principles

- Preserve user flow speed.
- Avoid adding extra steps or screens unless the request clearly requires it.
- Keep the UI fast and operational.
- Remove friction rather than explaining around it.
- Make the UI feel like a tool, not an app.
- Keep pricing logic correct.
- Do not break state flow.

## Workflow

1. Understand the feature goal and the user action it must support.
2. Map the current flow before editing: entry point, next step, data source, and completion state.
3. Inspect the existing implementation before changing structure, especially in `NyttTilbudModal.tsx` and `HalfCirclePicker.tsx` when relevant.
4. Identify where the feature can be inserted with the least disruption.
5. Reuse existing components, utilities, and patterns before creating new ones.
6. Make the smallest implementation that satisfies the goal.
7. Validate the interaction end to end, especially around tilbud, pricing, customer handoff, and send behavior.

## Guardrails

- Inspect existing code before making changes.
- Prefer modifying current screens and components over adding new structure.
- Avoid adding confirmation steps, detours, or "nice to have" screens.
- Trace state ownership before changing props, hooks, or derived values.
- Respect the current Expo React Native structure and shared design language.
- Reuse existing hooks, utilities, and custom UI patterns before introducing new ones.
- Keep TypeScript readable and specific.
- Preserve pricing calculations and business rules.
- Preserve responsiveness and avoid heavy UI patterns that slow the flow.
- Keep diffs focused and avoid unrelated cleanup.

## Critical Files

- `NyttTilbudModal.tsx`: central offer-creation flow surface where extra friction is especially costly
- `HalfCirclePicker.tsx`: custom interaction component where layout, speed, and precision matter

## Validation Checklist

- Is the primary user path still as fast as before?
- Did the change avoid unnecessary taps, screens, or decisions?
- Is pricing logic still correct for the affected flow?
- Does state still move correctly through the updated interaction?
- Does the change support the core flow from job description to send?
- Does the UI feel operational and lightweight rather than decorative?

## Additional Resources

- For Dorg-specific implementation guidance, stack notes, and flow risks, see [reference.md](reference.md)
