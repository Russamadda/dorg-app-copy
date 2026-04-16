import {
  Pressable,
  Text,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
  StyleSheet,
} from 'react-native'
import { authOnboardingTheme } from '../../constants/authOnboardingTheme'

type Props = {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

export default function AuthPrimaryButton({ label, onPress, loading, disabled, style }: Props) {
  const inaktiv = disabled || loading
  return (
    <Pressable
      style={({ pressed }) => [
        authOnboardingTheme.cta,
        inaktiv && authOnboardingTheme.ctaDisabled,
        pressed && !inaktiv && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={inaktiv}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={authOnboardingTheme.ctaLabel}>{label}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressed: {
    transform: [{ scale: 0.99 }],
  },
})
