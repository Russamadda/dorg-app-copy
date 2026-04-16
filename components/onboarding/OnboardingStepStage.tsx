import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  ReduceMotion,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated'

type Direction = 1 | -1

type Props<Step extends string | number> = {
  step: Step
  direction: Direction
  renderStep: (step: Step) => ReactNode
}

const STEP_DURATION_MS = 280
const STEP_EASING = Easing.out(Easing.cubic)

export default function OnboardingStepStage<Step extends string | number>({
  step,
  direction,
  renderStep,
}: Props<Step>) {
  const entering = direction > 0
    ? SlideInRight
      .withInitialValues({ opacity: 0.98 })
      .duration(STEP_DURATION_MS)
      .easing(STEP_EASING)
      .reduceMotion(ReduceMotion.System)
    : SlideInLeft
      .withInitialValues({ opacity: 0.98 })
      .duration(STEP_DURATION_MS)
      .easing(STEP_EASING)
      .reduceMotion(ReduceMotion.System)

  const exiting = direction > 0
    ? SlideOutLeft
      .duration(STEP_DURATION_MS)
      .easing(STEP_EASING)
      .reduceMotion(ReduceMotion.System)
    : SlideOutRight
      .duration(STEP_DURATION_MS)
      .easing(STEP_EASING)
      .reduceMotion(ReduceMotion.System)

  return (
    <View style={styles.viewport}>
      <Animated.View
        key={String(step)}
        entering={entering}
        exiting={exiting}
        style={styles.layer}
      >
        {renderStep(step)}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
})
