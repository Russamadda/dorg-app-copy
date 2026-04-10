# Half Circle Picker Reference

## Layout Rules

- Build two half-circles that face each other: left and right.
- They must meet visually at the shared center axis.
- Do not allow overlap between the two pickers.
- Do not wrap the pickers in a box, frame, or card.

### Positioning

Left picker:
- Anchor it to the left edge of the screen.
- Let it extend inward toward the center axis.

Right picker:
- Anchor it to the right edge of the screen.
- Let it extend inward toward the center axis.

Center:
- Keep the selection line exactly in the middle of the screen.
- The centered item is the active selected value.

## Interaction Rules

- Vertical scroll only.
- Snap to values. No free scroll.
- The center item must always be the selected value.
- The motion should feel like a native iOS picker: smooth and inertial.

## Visual Rules

### Numbers

- Center value: largest size, full opacity, bold weight.
- Near-center values: slightly smaller with a lighter fade.
- Edge values: small with strong fade.

### Curve Effect

- Items must visually follow the curve of the half-circle.
- Use scale transforms, opacity falloff, and slight horizontal offset.
- Do not render the picker as a flat vertical list.

### Tick Marks

- Each value needs a small horizontal tick line.
- Tick marks should follow the same curve logic as the numbers.
- Highlight the center tick.
- The visual reference is a carpenter ruler or `tommestokk`, not a default wheel.

## Labels

- Use the labels `Timer` and `Materialer`.
- Place them near the center axis, not above the pickers.
- Keep them subtle and secondary to the selected values.

## Technical Rules

- Use `FlatList` or `Animated.FlatList`.
- Do not place the picker inside a `ScrollView`.
- Use `snapToInterval`.
- Use `decelerationRate="fast"`.
- Use Reanimated when smoother transforms or scroll-driven interpolation are needed.

## State Binding

- Left picker controls `timer`.
- Right picker controls material price.
- On change, price calculation must update immediately.
- Do not debounce picker-driven price updates.

## Forbidden

- No default picker components.
- No boxed UI.
- No overlapping wheels.
- No horizontal scrolling.

## Edit Order

When modifying the component:

1. Identify the main problem: overlap, alignment, spacing, or interaction.
2. Fix positioning first.
3. Fix interaction second.
4. Fix visuals last.

## Output Requirements

- Keep the diff clean.
- Do not introduce breaking changes to pricing logic.
- Keep the component performant and lightweight.
