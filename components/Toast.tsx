import { useEffect, useRef } from 'react'
import { Animated, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getFloatingTabBarPadding } from './FloatingTabBar'

interface ToastProps {
  melding: string
  type: 'suksess' | 'feil'
  synlig: boolean
}

export function Toast({ melding, type, synlig }: ToastProps) {
  const insets = useSafeAreaInsets()
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(20)).current

  useEffect(() => {
    if (!synlig) return

    const hideTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    }, 2500)

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()

    return () => clearTimeout(hideTimer)
  }, [synlig, melding, opacity, translateY])

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { bottom: getFloatingTabBarPadding(insets.bottom) + 18 },
        { opacity, transform: [{ translateY }] },
        type === 'feil' && styles.feil,
      ]}
    >
      <Text style={styles.tekst}>{melding}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#1B4332',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    zIndex: 999,
  },
  feil: {
    backgroundColor: '#DC2626',
  },
  tekst: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
  },
})
