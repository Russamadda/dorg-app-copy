import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Animated, {
  Easing,
  KeyboardState,
  ReduceMotion,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import AuthBrandHeader from '../../components/auth/AuthBrandHeader'
import AuthCardStage, { type AuthStagePanel } from '../../components/auth/AuthCardStage'
import AuthShell from '../../components/auth/AuthShell'
import AuthTextField from '../../components/auth/AuthTextField'
import AuthPrimaryButton from '../../components/auth/AuthPrimaryButton'
import { authOnboardingColors } from '../../constants/authOnboardingTheme'
import {
  erGyldigEpost,
  lagAuthRedirectUrl,
  normaliserEpost,
  oversettAuthFeil,
} from '../../lib/auth'
import { supabase } from '../../lib/supabase'

type FieldErrors = {
  epost?: string
  passord?: string
}

const AUTH_STAGE_HEIGHT = 440

function parseInitialPanel(raw: string | string[] | undefined): AuthStagePanel {
  const value = Array.isArray(raw) ? raw[0] : raw
  return value === 'forgot-password' ? 'forgot' : 'auth'
}

export default function AuthEntryScreen() {
  const router = useRouter()
  const { panel: panelParam } = useLocalSearchParams<{ panel?: string | string[] }>()

  const [panel, setPanel] = useState<AuthStagePanel>(() => parseInitialPanel(panelParam))

  const passwordRef = useRef<TextInput>(null)
  const keyboard = useAnimatedKeyboard()
  const subtitleProgress = useSharedValue(panel === 'forgot' ? 1 : 0)

  const [epost, setEpost] = useState('')
  const [passord, setPassord] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [laster, setLaster] = useState(false)

  const [resetEpost, setResetEpost] = useState('')
  const [resetEpostFeil, setResetEpostFeil] = useState('')
  const [resetFeil, setResetFeil] = useState<string | null>(null)
  const [resetInfo, setResetInfo] = useState<string | null>(null)
  const [resetLaster, setResetLaster] = useState(false)

  function animateSubtitle(nextPanel: AuthStagePanel) {
    subtitleProgress.value = withTiming(nextPanel === 'forgot' ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    })
  }

  function openForgotPassword() {
    setResetFeil(null)
    setResetInfo(null)
    if (!resetEpost && erGyldigEpost(epost)) {
      setResetEpost(normaliserEpost(epost))
    }
    setPanel('forgot')
    animateSubtitle('forgot')
  }

  function closeForgotPassword() {
    setPanel('auth')
    animateSubtitle('auth')
  }

  const mainSubtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - subtitleProgress.value,
  }))

  const forgotSubtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleProgress.value,
  }))

  const heroKeyboardAnimatedStyle = useAnimatedStyle(() => {
    const keyboardVisible =
      keyboard.state.value === KeyboardState.OPEN ||
      keyboard.state.value === KeyboardState.OPENING
    return {
      transform: [
        {
          translateY: withTiming(keyboardVisible && panel === 'auth' ? -48 : 0, {
            duration: 150,
            reduceMotion: ReduceMotion.System,
          }),
        },
      ],
    }
  }, [keyboard.state, panel])

  function validerSkjema(): boolean {
    const nesteFeil: FieldErrors = {}

    if (!epost.trim()) {
      nesteFeil.epost = 'Skriv inn e-post.'
    } else if (!erGyldigEpost(epost)) {
      nesteFeil.epost = 'Skriv inn en gyldig e-postadresse.'
    }

    if (!passord.trim()) {
      nesteFeil.passord = 'Skriv inn passord.'
    }

    setFieldErrors(nesteFeil)
    return Object.keys(nesteFeil).length === 0
  }

  async function loggInn() {
    if (!validerSkjema()) {
      return
    }

    setSubmitError('')
    setLaster(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normaliserEpost(epost),
        password: passord,
      })

      if (error) {
        setSubmitError(oversettAuthFeil(error.message))
      }
    } catch (error) {
      setSubmitError(oversettAuthFeil(error instanceof Error ? error.message : null))
    } finally {
      setLaster(false)
    }
  }

  async function sendRecovery() {
    if (!resetEpost.trim()) {
      setResetEpostFeil('Skriv inn e-postadressen din.')
      return
    }

    if (!erGyldigEpost(resetEpost)) {
      setResetEpostFeil('Skriv inn en gyldig e-postadresse.')
      return
    }

    setResetEpostFeil('')
    setResetFeil(null)
    setResetInfo(null)
    setResetLaster(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normaliserEpost(resetEpost), {
        redirectTo: lagAuthRedirectUrl(),
      })

      if (error) {
        setResetFeil(oversettAuthFeil(error.message))
        return
      }

      setResetInfo('Hvis kontoen finnes, har vi sendt en lenke for å sette nytt passord. Sjekk også søppelpost.')
    } catch (error) {
      setResetFeil(oversettAuthFeil(error instanceof Error ? error.message : null))
    } finally {
      setResetLaster(false)
    }
  }

  const authCard = (
    <View style={styles.card}>
      <View>
        <AuthTextField
          label="E-post"
          value={epost}
          onChangeText={text => {
            setEpost(text)
            if (fieldErrors.epost) {
              setFieldErrors(current => ({ ...current, epost: undefined }))
            }
          }}
          error={fieldErrors.epost}
          placeholder="navn@firma.no"
          keyboardType="email-address"
          textContentType="username"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <AuthTextField
          ref={passwordRef}
          label="Passord"
          value={passord}
          onChangeText={text => {
            setPassord(text)
            if (fieldErrors.passord) {
              setFieldErrors(current => ({ ...current, passord: undefined }))
            }
          }}
          error={fieldErrors.passord}
          placeholder="Skriv inn passordet ditt"
          secureTextEntry
          secureToggle
          textContentType="password"
          autoComplete="current-password"
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={() => void loggInn()}
        />

        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

        <AuthPrimaryButton
          label="Logg inn"
          onPress={() => void loggInn()}
          loading={laster}
          style={styles.submitButton}
        />

        <View style={styles.forgotAfterCta}>
          <Pressable onPress={openForgotPassword}>
            <Text style={styles.inlineLink}>Glemt passord?</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )

  const forgotCard = (
    <View style={styles.card}>
      <Text style={styles.forgotTitle}>Få tilsendt ny lenke</Text>
      <Text style={styles.forgotBody}>
        Skriv inn e-posten din, så sender vi en sikker lenke som lar deg velge nytt passord.
      </Text>

      <AuthTextField
        label="E-post"
        value={resetEpost}
        onChangeText={text => {
          setResetEpost(text)
          if (resetEpostFeil) {
            setResetEpostFeil('')
          }
        }}
        error={resetEpostFeil}
        placeholder="navn@firma.no"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {resetInfo ? <Text style={styles.info}>{resetInfo}</Text> : null}
      {resetFeil ? <Text style={styles.submitError}>{resetFeil}</Text> : null}

      <AuthPrimaryButton label="Send lenke" onPress={() => void sendRecovery()} loading={resetLaster} />

      <View style={styles.forgotBackRow}>
        <Pressable onPress={closeForgotPassword}>
          <Text style={styles.backLink}>Tilbake til innlogging</Text>
        </Pressable>
      </View>
    </View>
  )

  return (
    <AuthShell scroll={false}>
      <View style={styles.content}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back()
            } else {
              router.replace('/auth/velkommen')
            }
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Tilbake til velkomstskjermen"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>

        <Animated.View style={[styles.hero, heroKeyboardAnimatedStyle]}>
          <AuthBrandHeader />
          <View style={styles.descriptionWrap}>
            <Animated.Text
              style={[styles.heroDescription, styles.descriptionLayer, mainSubtitleAnimatedStyle]}
            >
              Tilbudsverktøy for håndverksbedrifter.
            </Animated.Text>
            <Animated.Text
              style={[styles.heroDescription, styles.descriptionLayer, forgotSubtitleAnimatedStyle]}
            >
              Nullstill passord.
            </Animated.Text>
          </View>
        </Animated.View>

        <AuthCardStage
          activePanel={panel}
          authCard={authCard}
          forgotCard={forgotCard}
          fallbackHeight={AUTH_STAGE_HEIGHT}
          keyboardLift={120}
          style={styles.stage}
        />
      </View>
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 28,
  },
  hero: {
    marginTop: -4,
    marginBottom: 56,
    transform: [{ translateY: 20 }],
  },
  descriptionWrap: {
    alignSelf: 'stretch',
    marginTop: 10,
    minHeight: 22,
    justifyContent: 'center',
  },
  descriptionLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  heroDescription: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: authOnboardingColors.textMuted,
    textAlign: 'center',
  },
  stage: {
    alignSelf: 'stretch',
    marginTop: 34,
  },
  card: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(27,67,50,0.08)',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  forgotAfterCta: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 2,
  },
  inlineLink: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: authOnboardingColors.cta,
  },
  info: {
    marginBottom: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#215A39',
  },
  submitError: {
    marginBottom: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: authOnboardingColors.error,
  },
  submitButton: {
    marginTop: 8,
  },
  forgotTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 28,
    lineHeight: 34,
    color: authOnboardingColors.text,
  },
  forgotBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: authOnboardingColors.textMuted,
    marginTop: 10,
    marginBottom: 20,
  },
  forgotBackRow: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  backLink: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: authOnboardingColors.textMuted,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    padding: 4,
  },
  backButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 30,
    color: '#111111',
    lineHeight: 36,
  },
})
