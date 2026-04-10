# Dorg Feature Builder Reference

## Project Overview

Dorg is an AI-powered tilbud generator for Norwegian tradespeople.

Primary goal:
- help users create and send offers quickly
- remove unnecessary friction from the job flow
- keep the product feeling fast and task-oriented

Core flow:
1. Describe job
2. Generate offer
3. Add customer
4. Send

## Stack Notes

- Expo React Native drives the app UI and flow behavior
- TypeScript should remain specific and readable
- Supabase changes can affect generated offer data, persistence, and downstream flow state
- Resend changes can affect the final send step and email-related handoff

## Critical Files

### `NyttTilbudModal.tsx`

Treat this as a high-sensitivity flow surface.

Changes here should:
- keep the user moving forward
- avoid extra decisions, screens, or confirmation steps
- preserve pricing and generated offer behavior
- avoid bloating the modal with secondary actions

### `HalfCirclePicker.tsx`

Treat this as a high-sensitivity interaction component.

Changes here should:
- preserve speed and precision
- avoid generic picker behavior that feels slower or less product-like
- keep layout and gesture behavior intentional
- avoid adding wrappers or spacing that reduce clarity

## Decision Standard

When two implementations are possible, prefer the one that:
- keeps the user in the current flow
- reduces taps or context switching
- reuses existing state and business logic
- avoids new abstraction unless reuse is clearly improved

## Flow Mapping Checklist

Before editing, identify:
- where the user enters the flow
- what action they are trying to complete
- which screen or component currently owns the relevant state
- which step of `Describe job -> Generate offer -> Add customer -> Send` is being changed
- which utilities or services affect pricing or tilbud generation
- whether Supabase or Resend behavior is part of the change
- what the next expected user action is after the change

## Dorg-Specific Risks

Watch for:
- pricing changes caused by moved calculations or duplicated logic
- state regressions from introducing parallel local state
- slower interaction caused by extra modals, forms, or confirmation steps
- UI drift that makes the experience feel more like browsing than doing work

## Good Defaults

- Extend an existing screen before creating a new one.
- Insert actions inline when possible.
- Prefer concise labels and direct actions.
- Keep layouts tight and task-oriented.
- Reuse existing hooks, utility functions, and shared components.
- Prefer custom product UI over generic platform defaults when the flow depends on speed.

## Avoid

- adding extra onboarding or explanation when the task can be inferred
- splitting one fast task across multiple screens
- duplicating pricing logic in UI components
- introducing state that mirrors another source without a strong reason
- adding decorative UI that slows scanning or completion

## Review Prompt

Before finishing, ask:
"Did this feature make the main job faster, clearer, or more useful without adding friction?"
