import { useEffect, useRef } from 'react'
import { Animated, Text, StyleSheet } from 'react-native'

interface Props {
  message: string
  visible: boolean
  type?: 'success' | 'error'
  onHide?: () => void
}

export default function ToastMessage({ message, visible, type = 'success', onHide }: Props) {
  const translateY = useRef(new Animated.Value(-80)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(translateY, { toValue: -80, duration: 300, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]).start(() => {
            onHide?.()
          })
        }, 2500)
      })
    }
  }, [visible])

  if (!visible) return null

  const bg = type === 'error' ? '#DC2626' : '#1B4332'

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bg, transform: [{ translateY }], opacity },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 8,
    padding: 14,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
})
