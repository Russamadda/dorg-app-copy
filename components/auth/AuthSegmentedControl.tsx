import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { authOnboardingColors } from '../../constants/authOnboardingTheme'

export type AuthMode = 'login' | 'register'

type Props = {
  mode: AuthMode
  onChange: (mode: AuthMode) => void
}

export default function AuthSegmentedControl({ mode, onChange }: Props) {
  return (
    <View style={styles.track}>
      <TouchableOpacity
        style={[styles.segment, mode === 'login' && styles.segmentActive]}
        onPress={() => onChange('login')}
        activeOpacity={0.85}
        accessibilityRole="tab"
        accessibilityState={{ selected: mode === 'login' }}
      >
        <Text style={[styles.label, mode === 'login' && styles.labelActive]}>Logg inn</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.segment, mode === 'register' && styles.segmentActive]}
        onPress={() => onChange('register')}
        activeOpacity={0.85}
        accessibilityRole="tab"
        accessibilityState={{ selected: mode === 'register' }}
      >
        <Text style={[styles.label, mode === 'register' && styles.labelActive]}>Opprett konto</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: authOnboardingColors.segmentInactive,
    borderRadius: 12,
    padding: 4,
    marginTop: 28,
    marginBottom: 28,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: authOnboardingColors.surface,
    borderWidth: 1,
    borderColor: authOnboardingColors.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: authOnboardingColors.textMuted,
  },
  labelActive: {
    fontFamily: 'DMSans_700Bold',
    color: authOnboardingColors.text,
  },
})
