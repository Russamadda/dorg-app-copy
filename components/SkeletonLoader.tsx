import { useEffect, useRef } from 'react'
import { Animated, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'

interface SkeletonLoaderProps {
  style?: StyleProp<ViewStyle>
}

export function SkeletonLoader({ style }: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [])

  return (
    <Animated.View style={[styles.container, style, { opacity }]}>
      <View style={styles.titleLine} />
      <View style={styles.line} />
      <View style={styles.lineShort} />
      <View style={[styles.line, { marginTop: 16 }]} />
      <View style={styles.line} />
      <View style={styles.lineShort} />
      <View style={[styles.line, { marginTop: 16 }]} />
      <View style={styles.lineShort} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    gap: 10,
  },
  titleLine: {
    height: 20,
    width: '60%',
    backgroundColor: '#E2E8E4',
    borderRadius: 4,
    marginBottom: 8,
  },
  line: {
    height: 14,
    width: '100%',
    backgroundColor: '#E2E8E4',
    borderRadius: 4,
  },
  lineShort: {
    height: 14,
    width: '75%',
    backgroundColor: '#E2E8E4',
    borderRadius: 4,
  },
})
