import { View, Text, TextInput, type TextInputProps, StyleSheet } from 'react-native'
import { authOnboardingTheme } from '../../constants/authOnboardingTheme'

type Props = {
  label: string
} & TextInputProps

export default function AuthTextField({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={authOnboardingTheme.fieldLabel}>{label}</Text>
      <TextInput
        {...rest}
        style={[authOnboardingTheme.input, style]}
        placeholderTextColor="#A2A8B3"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
})
