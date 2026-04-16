import { StyleSheet } from 'react-native'
import { Colors } from './colors'

/** Delte design-tokens for innlogging og onboarding (moderne SaaS-profil). */
export const authOnboardingColors = {
  bg: '#F3F5F1',
  surface: 'rgba(255,255,255,0.92)',
  surfaceMuted: 'rgba(255,255,255,0.55)',
  border: 'rgba(17,17,17,0.08)',
  borderStrong: 'rgba(17,17,17,0.14)',
  text: '#111111',
  textMuted: '#5C6570',
  textSubtle: '#7B818C',
  cta: Colors.primary,
  ctaPressed: Colors.sidebar,
  error: '#B91C1C',
  success: '#166534',
  segmentInactive: 'rgba(27,67,50,0.07)',
  focusRing: 'rgba(27,67,50,0.18)',
  softAccent: 'rgba(27,67,50,0.08)',
}

export const authOnboardingTheme = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: authOnboardingColors.bg,
  },
  brandTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    letterSpacing: 2,
    color: '#111111',
  },
  brandSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: authOnboardingColors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  fieldLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: authOnboardingColors.textMuted,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    minHeight: 52,
    backgroundColor: authOnboardingColors.surface,
    borderWidth: 1,
    borderColor: authOnboardingColors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: authOnboardingColors.text,
  },
  cta: {
    minHeight: 54,
    borderRadius: 22,
    backgroundColor: authOnboardingColors.cta,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  link: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: authOnboardingColors.cta,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: authOnboardingColors.error,
    textAlign: 'center',
    marginTop: 8,
  },
  infoText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: authOnboardingColors.success,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
})
