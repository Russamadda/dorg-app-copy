import { forwardRef, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { authOnboardingColors } from '../../constants/authOnboardingTheme'

type Props = {
  label: string
  error?: string
  secureToggle?: boolean
} & TextInputProps

const AuthTextField = forwardRef<TextInput, Props>(function AuthTextField(
  { label, error, style, secureTextEntry, secureToggle, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false)
  const [skjulTekst, setSkjulTekst] = useState(Boolean(secureTextEntry))

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error && styles.fieldError,
        ]}
      >
        <TextInput
          {...rest}
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor="#8692A2"
          secureTextEntry={secureToggle ? skjulTekst : secureTextEntry}
          onFocus={event => {
            setFocused(true)
            rest.onFocus?.(event)
          }}
          onBlur={event => {
            setFocused(false)
            rest.onBlur?.(event)
          }}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setSkjulTekst(current => !current)}
            accessibilityRole="button"
            accessibilityLabel={skjulTekst ? 'Vis passord' : 'Skjul passord'}
            hitSlop={10}
            style={styles.iconButton}
          >
            <Ionicons
              name={skjulTekst ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={focused ? authOnboardingColors.text : authOnboardingColors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
})

export default AuthTextField

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: authOnboardingColors.text,
    marginBottom: 8,
    marginLeft: 8,
  },
  field: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(132,145,161,0.22)',
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#14304B',
    shadowOpacity: 0.03,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  fieldFocused: {
    borderColor: authOnboardingColors.cta,
    shadowColor: '#1B4332',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  fieldError: {
    borderColor: '#C95F5F',
  },
  input: {
    flex: 1,
    minHeight: 56,
    paddingVertical: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: authOnboardingColors.text,
  },
  iconButton: {
    marginLeft: 10,
  },
  error: {
    marginTop: 7,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: authOnboardingColors.error,
  },
})
