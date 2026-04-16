import { useEffect, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import type { Session } from '@supabase/supabase-js'
import AuthBrandHeader from '../../components/auth/AuthBrandHeader'
import AuthShell from '../../components/auth/AuthShell'
import AuthTextField from '../../components/auth/AuthTextField'
import AuthPrimaryButton from '../../components/auth/AuthPrimaryButton'
import { authOnboardingColors } from '../../constants/authOnboardingTheme'
import { oversettAuthFeil } from '../../lib/auth'
import { hentLokalAuthSession, supabase } from '../../lib/supabase'

export default function ResetPasswordScreen() {
  const [passord, setPassord] = useState('')
  const [bekreftPassord, setBekreftPassord] = useState('')
  const [passordFeil, setPassordFeil] = useState('')
  const [bekreftFeil, setBekreftFeil] = useState('')
  const [feil, setFeil] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [laster, setLaster] = useState(false)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    void hentLokalAuthSession().then(setSession)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nesteSession) => {
      setSession(nesteSession ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function oppdaterPassord() {
    if (!session) {
      setFeil('Åpne lenken fra e-posten på denne enheten før du setter nytt passord.')
      return
    }

    let harFeil = false

    if (!passord.trim()) {
      setPassordFeil('Skriv inn nytt passord.')
      harFeil = true
    } else if (passord.length < 6) {
      setPassordFeil('Passordet må være minst 6 tegn.')
      harFeil = true
    } else {
      setPassordFeil('')
    }

    if (!bekreftPassord.trim()) {
      setBekreftFeil('Bekreft passordet ditt.')
      harFeil = true
    } else if (passord !== bekreftPassord) {
      setBekreftFeil('Passordene stemmer ikke overens.')
      harFeil = true
    } else {
      setBekreftFeil('')
    }

    if (harFeil) {
      return
    }

    setFeil(null)
    setInfo(null)
    setLaster(true)

    try {
      const { error } = await supabase.auth.updateUser({ password: passord })

      if (error) {
        setFeil(oversettAuthFeil(error.message))
        return
      }

      setInfo('Passordet er oppdatert. Du blir sendt videre.')
      router.replace('/')
    } catch (error) {
      setFeil(oversettAuthFeil(error instanceof Error ? error.message : null))
    } finally {
      setLaster(false)
    }
  }

  return (
    <AuthShell>
      <View style={styles.content}>
        <View style={styles.hero}>
          <AuthBrandHeader subtitle="Sett nytt passord." />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Velg et nytt passord</Text>
          <Text style={styles.beskrivelse}>
            Recovery-lenken fra e-posten må være åpnet på denne enheten før du kan fullføre.
          </Text>

          <AuthTextField
            label="Nytt passord"
            value={passord}
            onChangeText={text => {
              setPassord(text)
              if (passordFeil) {
                setPassordFeil('')
              }
            }}
            error={passordFeil}
            placeholder="Minst 6 tegn"
            secureTextEntry
            secureToggle
            autoCapitalize="none"
          />

          <AuthTextField
            label="Bekreft passord"
            value={bekreftPassord}
            onChangeText={text => {
              setBekreftPassord(text)
              if (bekreftFeil) {
                setBekreftFeil('')
              }
            }}
            error={bekreftFeil}
            placeholder="Gjenta passordet"
            secureTextEntry
            secureToggle
            autoCapitalize="none"
          />

          {info ? <Text style={styles.info}>{info}</Text> : null}
          {feil ? <Text style={styles.error}>{feil}</Text> : null}

          <AuthPrimaryButton label="Oppdater passord" onPress={oppdaterPassord} loading={laster} />

          {!session ? (
            <Pressable onPress={() => router.replace('/auth')} style={styles.backAction}>
              <Text style={styles.backActionText}>Tilbake til innlogging</Text>
            </Pressable>
          ) : null}
        </View>
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
    marginTop: -2,
    marginBottom: 42,
    transform: [{ translateY: 20 }],
  },
  card: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(27,67,50,0.08)',
    marginTop: 34,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 28,
    lineHeight: 34,
    color: authOnboardingColors.text,
  },
  beskrivelse: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: authOnboardingColors.textMuted,
    marginTop: 10,
    marginBottom: 20,
  },
  info: {
    marginBottom: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#215A39',
  },
  error: {
    marginBottom: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: authOnboardingColors.error,
  },
  backAction: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  backActionText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: authOnboardingColors.textMuted,
  },
})
