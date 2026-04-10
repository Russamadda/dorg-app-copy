# Runtime Debugging Reference

## Debugging Checklist

Use this sequence:

1. Capture the exact warning, error, or broken behavior.
2. Identify the component, hook, screen, or utility involved.
3. Trace where the bad value, invalid render path, or unsupported structure begins.
4. Confirm the root cause with code evidence before editing.
5. Change only the minimum logic or structure required.
6. Re-check the original issue after the edit.

## Root Cause Standard

The explanation should answer:
- What failed?
- Where did it fail?
- Why did it fail there?
- Why is the proposed fix addressing the cause instead of the symptom?

## Response Template

Use this format when reporting the result:

```markdown
Root cause:
[Short explanation of the underlying issue]

Fix:
[Short explanation of the targeted change]

Code change:
[Summary of the actual edit]
```

## Notes

- For warnings like nested `VirtualizedLists`, remove the conflicting scroll structure instead of hiding the warning.
- For undefined components or values, trace imports, exports, props, and state flow before editing.
- If the first apparent fix requires broad rewrites, pause and look for a smaller structural correction.
