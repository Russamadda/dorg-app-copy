import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Dimensions, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  KeyboardState,
  ReduceMotion,
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

export type AuthStagePanel = 'auth' | 'forgot'

type Props = {
  activePanel: AuthStagePanel
  authCard: ReactNode
  forgotCard: ReactNode
  fallbackHeight?: number
  keyboardLift?: number
  style?: StyleProp<ViewStyle>
}

const CARD_TRANSITION = {
  duration: 230,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const

export default function AuthCardStage({
  activePanel,
  authCard,
  forgotCard,
  fallbackHeight = 460,
  keyboardLift = 52,
  style,
}: Props) {
  const keyboard = useAnimatedKeyboard()
  const previousPanelRef = useRef<AuthStagePanel>(activePanel)

  const [viewportWidth, setViewportWidth] = useState(Dimensions.get('window').width - 40)
  const [authHeight, setAuthHeight] = useState(0)
  const [forgotHeight, setForgotHeight] = useState(0)
  const [transitioning, setTransitioning] = useState(false)

  const authX = useSharedValue(activePanel === 'forgot' ? -viewportWidth : 0)
  const forgotX = useSharedValue(activePanel === 'forgot' ? 0 : viewportWidth)

  const finishTransition = useCallback(() => {
    setTransitioning(false)
  }, [])

  useEffect(() => {
    authX.value = activePanel === 'forgot' ? -viewportWidth : 0
    forgotX.value = activePanel === 'forgot' ? 0 : viewportWidth
    previousPanelRef.current = activePanel
  }, [viewportWidth, authX, forgotX])

  useEffect(() => {
    if (viewportWidth <= 0) return

    const previousPanel = previousPanelRef.current
    if (previousPanel === activePanel) return

    previousPanelRef.current = activePanel
    setTransitioning(true)

    if (activePanel === 'forgot') {
      forgotX.value = viewportWidth
      authX.value = withTiming(-viewportWidth, CARD_TRANSITION)
      forgotX.value = withTiming(0, CARD_TRANSITION, finished => {
        if (finished) {
          runOnJS(finishTransition)()
        }
      })
      return
    }

    authX.value = -viewportWidth
    forgotX.value = withTiming(viewportWidth, CARD_TRANSITION)
    authX.value = withTiming(0, CARD_TRANSITION, finished => {
      if (finished) {
        runOnJS(finishTransition)()
      }
    })
  }, [activePanel, authX, finishTransition, forgotX, viewportWidth])

  const stageAnimatedStyle = useAnimatedStyle(() => {
    const keyboardVisible =
      keyboard.state.value === KeyboardState.OPEN ||
      keyboard.state.value === KeyboardState.OPENING

    return {
      transform: [
        {
          translateY: withTiming(keyboardVisible ? -keyboardLift : 0, {
            duration: 150,
            reduceMotion: ReduceMotion.System,
          }),
        },
      ],
    }
  }, [keyboard.state, keyboardLift])

  const authCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: authX.value }],
  }))

  const forgotCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: forgotX.value }],
  }))

  const stageHeight = Math.max(authHeight, forgotHeight, fallbackHeight)

  return (
    <Animated.View style={[styles.stage, stageAnimatedStyle, style]}>
      <View
        style={[styles.viewport, { height: stageHeight }]}
        onLayout={event => {
          const width = event.nativeEvent.layout.width
          if (width > 0 && Math.abs(width - viewportWidth) > 1) {
            setViewportWidth(width)
          }
        }}
      >
        <Animated.View
          pointerEvents={activePanel === 'auth' ? 'auto' : 'none'}
          style={[styles.cardLayer, authCardAnimatedStyle]}
          onLayout={event => {
            const height = event.nativeEvent.layout.height
            if (height > 0 && Math.abs(height - authHeight) > 1) {
              setAuthHeight(height)
            }
          }}
        >
          {authCard}
        </Animated.View>

        <Animated.View
          pointerEvents={activePanel === 'forgot' ? 'auto' : 'none'}
          style={[styles.cardLayer, forgotCardAnimatedStyle]}
          onLayout={event => {
            const height = event.nativeEvent.layout.height
            if (height > 0 && Math.abs(height - forgotHeight) > 1) {
              setForgotHeight(height)
            }
          }}
        >
          {forgotCard}
        </Animated.View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  stage: {
    alignSelf: 'stretch',
  },
  viewport: {
    position: 'relative',
    overflow: 'hidden',
  },
  cardLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
})
