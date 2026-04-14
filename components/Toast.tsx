import { useEffect, useRef } from 'react'
import { Animated, Platform, StyleSheet, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getFloatingToastBottomOffset, getStackToastBottomOffset } from './FloatingTabBar'

export type ToastLayoutPreset = 'floatingTabs' | 'stack'

interface ToastProps {
  melding: string
  type: 'suksess' | 'feil'
  synlig: boolean
  onHide?: () => void
  /** Tab screens: above floating bar. Stack screens (e.g. Bedrift): uses bottom safe inset. */
  layoutPreset?: ToastLayoutPreset
}

export function Toast({ melding, type, synlig, onHide, layoutPreset = 'floatingTabs' }: ToastProps) {
  const insets = useSafeAreaInsets()
  const bottomOffset =
    layoutPreset === 'stack'
      ? getStackToastBottomOffset(insets.bottom)
      : getFloatingToastBottomOffset()
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(16)).current
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onHideRef = useRef(onHide)

  onHideRef.current = onHide

  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }

    if (!synlig || !melding.trim()) {
      opacity.stopAnimation()
      translateY.stopAnimation()
      opacity.setValue(0)
      translateY.setValue(16)
      return
    }

    opacity.setValue(0)
    translateY.setValue(16)

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        return
      }

      hideTimerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 16,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start(({ finished: hideFinished }) => {
          if (hideFinished) {
            hideTimerRef.current = null
            onHideRef.current?.()
          }
        })
      }, 2500)
    })

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      opacity.stopAnimation()
      translateY.stopAnimation()
    }
  }, [synlig, melding, opacity, translateY])

  if (!synlig || !melding.trim()) {
    return null
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.host,
        { bottom: bottomOffset },
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.surface}>
        <BlurView
          intensity={72}
          tint="light"
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[styles.tint, type === 'feil' ? styles.tintFeil : styles.tintSuksess]}
        />
        <Text style={[styles.tekst, type === 'feil' ? styles.tekstFeil : styles.tekstSuksess]}>
          {melding}
        </Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  surface: {
    maxWidth: '86%',
    minHeight: 46,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
  },
  tintSuksess: {
    backgroundColor: 'rgba(230,236,245,0.8)',
  },
  tintFeil: {
    backgroundColor: 'rgba(243,227,233,0.82)',
  },
  tekst: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'DMSans_500Medium',
    textAlign: 'center',
    flexShrink: 1,
  },
  tekstSuksess: {
    color: '#243033',
  },
  tekstFeil: {
    color: '#7A3145',
  },
})
