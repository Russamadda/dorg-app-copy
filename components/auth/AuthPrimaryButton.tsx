import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
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
    <TouchableOpacity
      style={[authOnboardingTheme.cta, inaktiv && authOnboardingTheme.ctaDisabled, style]}
      onPress={onPress}
      disabled={inaktiv}
      activeOpacity={0.88}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={authOnboardingTheme.ctaLabel}>{label}</Text>
      )}
    </TouchableOpacity>
  )
}
