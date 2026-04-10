---
name: runtime-debugging
description: Diagnose and fix runtime errors, warnings, and broken behavior safely in React Native or Expo code. Use when investigating issues such as nested VirtualizedLists warnings, broken interactions, undefined components, or other runtime regressions that require root-cause analysis before editing.
---

# Runtime Debugging

## Purpose

Fix runtime errors, warnings, and broken behavior safely.

## When To Use

Use this skill when:
- Investigating runtime errors or warnings
- Fixing broken interaction or unexpected behavior
- Tracing undefined components, props, state, or functions
- Resolving warnings such as `VirtualizedLists should never be nested`

## Workflow

1. Identify the exact error source before changing code.
2. Trace the root cause, not just the visible symptom.
3. Explain the proposed fix before coding when the task calls for implementation.
4. Apply the smallest change that resolves the issue safely.
5. Verify the warning, error, or broken behavior is actually fixed.

## Rules

- Never rewrite large sections unless necessary.
- Preserve working logic and existing business behavior.
- Fix warnings properly instead of silencing or hiding them.
- Do not guess; inspect the relevant code path first.
- Prefer focused edits over cleanup or opportunistic refactors.
- Keep the debugging explanation tied to observable behavior.

## Output

Provide:
- A root cause explanation
- A fix explanation
- The code change

## Additional Resources

- For a compact debugging checklist and response template, see [reference.md](reference.md)
