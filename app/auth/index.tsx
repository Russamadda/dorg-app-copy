import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import AuthShell from '../../components/auth/AuthShell'
import AuthSegmentedControl, { type AuthMode } from '../../components/auth/AuthSegmentedControl'
import AuthTextField from '../../components/auth/AuthTextField'
import AuthPrimaryButton from '../../components/auth/AuthPrimaryButton'
import { authOnboardingTheme } from '../../constants/authOnboardingTheme'
import { normaliserEpost, oversettAuthFeil } from '../../lib/auth'
import { supabase, opprettFirma } from '../../lib/supabase'

function parseInitialMode(raw: string | string[] | undefined): AuthMode {
  const v = Array.isArray(raw) ? raw[0] : raw
  return v === 'register' ? 'register' : 'login'
}

export default function AuthEntryScreen() {
  const router = useRouter()
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string | string[] }>()
  const [mode, setMode] = useState<AuthMode>(() => parseInitialMode(modeParam))
  const fade = useRef(new Animated.Value(1)).current

  const [epost, setEpost] = useState('')
  const [passord, setPassord] = useState('')
  const [bekreftPassord, setBekreftPassord] = useState('')
  const [feil, setFeil] = useState('')
  const [info, setInfo] = useState('')
  const [laster, setLaster] = useState(false)

  useEffect(() => {
    const next = parseInitialMode(modeParam)
    setMode(next)
  }, [modeParam])

  function crossfadeTo(next: AuthMode) {
    if (next === mode) return
    Animated.timing(fade, {
      toValue: 0,
      duration: 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setMode(next)
      setFeil('')
      setInfo('')
      Animated.timing(fade, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start()
    })
  }

  async function loggInn() {
    if (!epost || !passord) {
      setFeil('Fyll inn e-post og passord.')
      return
    }
    setFeil('')
    setInfo('')
    setLaster(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normaliserEpost(epost),
        password: passord,
      })
      if (error) {
        setFeil(oversettAuthFeil(error.message))
      }
    } catch (e) {
      setFeil(oversettAuthFeil(e instanceof Error ? e.message : null))
    } finally {
      setLaster(false)
    }
  }

  async function registrer() {
    if (!epost || !passord || !bekreftPassord) {
      setFeil('Fyll inn alle feltene.')
      return
    }
    if (passord !== bekreftPassord) {
      setFeil('Passordene stemmer ikke overens.')
      return
    }
    if (passord.length < 6) {
      setFeil('Passordet må være minst 6 tegn.')
      return
    }

    setFeil('')
    setInfo('')
    setLaster(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normaliserEpost(epost),
        password: passord,
      })
      if (error) {
        setFeil(oversettAuthFeil(error.message))
        return
      }
      if (data.user) {
        try {
          await opprettFirma(data.user.id, 'Min bedrift')
        } catch (e) {
          console.error('[auth] opprettFirma:', e)
          setFeil('Kontoen ble opprettet, men firma-raden feilet. Logg inn og prøv igjen.')
          return
        }
      }
      if (data.session) {
        router.replace('/bedrift')
        return
      }
      setInfo('Konto opprettet. Bekreft e-posten, deretter logger du inn og fullfører oppsettet.')
    } catch (e) {
      setFeil(oversettAuthFeil(e instanceof Error ? e.message : null))
    } finally {
      setLaster(false)
    }
  }

  return (
    <AuthShell>
      <View style={styles.centerBlock}>
        <Text style={authOnboardingTheme.brandTitle}>DORG</Text>
        <Text style={authOnboardingTheme.brandSubtitle}>for håndverkere</Text>

        <AuthSegmentedControl mode={mode} onChange={crossfadeTo} />

        <Animated.View style={{ opacity: fade }}>
          {mode === 'login' ? (
            <View>
              <AuthTextField
                label="E-post"
                value={epost}
                onChangeText={setEpost}
                placeholder="din@epost.no"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <AuthTextField
                label="Passord"
                value={passord}
                onChangeText={setPassord}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
              />
              <View style={styles.forgotRow}>
                <Link href="/auth/forgot-password" asChild>
                  <TouchableOpacity>
                    <Text style={authOnboardingTheme.link}>Glemt passord?</Text>
                  </TouchableOpacity>
                </Link>
              </View>
              {feil ? <Text style={authOnboardingTheme.errorText}>{feil}</Text> : null}
              <AuthPrimaryButton label="Logg inn" onPress={() => void loggInn()} loading={laster} />
            </View>
          ) : (
            <View>
              <AuthTextField
                label="E-post"
                value={epost}
                onChangeText={setEpost}
                placeholder="din@epost.no"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <AuthTextField
                label="Passord"
                value={passord}
                onChangeText={setPassord}
                placeholder="Minst 6 tegn"
                secureTextEntry
                autoCapitalize="none"
              />
              <AuthTextField
                label="Bekreft passord"
                value={bekreftPassord}
                onChangeText={setBekreftPassord}
                placeholder="Gjenta passordet"
                secureTextEntry
                autoCapitalize="none"
              />
              {info ? <Text style={authOnboardingTheme.infoText}>{info}</Text> : null}
              {feil ? <Text style={authOnboardingTheme.errorText}>{feil}</Text> : null}
              <AuthPrimaryButton label="Opprett konto" onPress={() => void registrer()} loading={laster} />
            </View>
          )}
        </Animated.View>
      </View>
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  centerBlock: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
    marginTop: -4,
  },
})
