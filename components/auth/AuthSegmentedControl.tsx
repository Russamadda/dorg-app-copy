import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { authOnboardingColors } from '../../constants/authOnboardingTheme'

export type AuthMode = 'login' | 'register'

type Props = {
  mode: AuthMode
  onChange: (mode: AuthMode) => void
}

export default function AuthSegmentedControl({ mode, onChange }: Props) {
  const [trackWidth, setTrackWidth] = useState(0)
  const thumbX = useRef(new Animated.Value(mode === 'register' ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(thumbX, {
      toValue: mode === 'register' ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start()
  }, [mode, thumbX])

  const thumbWidth = trackWidth > 0 ? (trackWidth - 8) / 2 : 0
  const translateX = thumbX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, thumbWidth],
  })

  return (
    <View style={styles.track} onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}>
      <Animated.View style={[styles.thumb, { width: thumbWidth, transform: [{ translateX }] }]} />
      <Pressable
        style={({ pressed }) => [styles.segment, pressed && styles.segmentPressed]}
        onPress={() => onChange('login')}
        accessibilityRole="tab"
        accessibilityState={{ selected: mode === 'login' }}
      >
        <Text style={[styles.label, mode === 'login' && styles.labelActive]}>Logg inn</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.segment, pressed && styles.segmentPressed]}
        onPress={() => onChange('register')}
        accessibilityRole="tab"
        accessibilityState={{ selected: mode === 'register' }}
      >
        <Text style={[styles.label, mode === 'register' && styles.labelActive]}>Opprett konto</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    position: 'relative',
    backgroundColor: 'rgba(27,67,50,0.06)',
    borderRadius: 18,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(27,67,50,0.08)',
    marginBottom: 18,
  },
  thumb: {
    position: 'absolute',
    top: 4,
    left: 4,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(27,67,50,0.1)',
    shadowColor: '#1B4332',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  segment: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentPressed: {
    opacity: 0.88,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: authOnboardingColors.textMuted,
  },
  labelActive: {
    fontFamily: 'DMSans_700Bold',
    color: authOnboardingColors.cta,
  },
})
