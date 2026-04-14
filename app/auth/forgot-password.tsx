import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Link } from 'expo-router'
import AuthShell from '../../components/auth/AuthShell'
import AuthTextField from '../../components/auth/AuthTextField'
import AuthPrimaryButton from '../../components/auth/AuthPrimaryButton'
import { authOnboardingTheme } from '../../constants/authOnboardingTheme'
import { lagAuthRedirectUrl, normaliserEpost, oversettAuthFeil } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default function ForgotPasswordScreen() {
  const [epost, setEpost] = useState('')
  const [feil, setFeil] = useState('')
  const [info, setInfo] = useState('')
  const [laster, setLaster] = useState(false)

  async function sendRecovery() {
    if (!epost.trim()) {
      setFeil('Fyll inn e-postadressen din.')
      return
    }

    setFeil('')
    setInfo('')
    setLaster(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normaliserEpost(epost), {
        redirectTo: lagAuthRedirectUrl(),
      })

      if (error) {
        setFeil(oversettAuthFeil(error.message))
        return
      }

      setInfo('Hvis kontoen finnes, har vi sendt en lenke for å sette nytt passord. Sjekk også søppelpost.')
    } catch (error) {
      setFeil(oversettAuthFeil(error instanceof Error ? error.message : null))
    } finally {
      setLaster(false)
    }
  }

  return (
    <AuthShell>
      <View style={styles.block}>
        <Text style={authOnboardingTheme.brandTitle}>DORG</Text>
        <Text style={authOnboardingTheme.brandSubtitle}>Nullstill passord</Text>

        <Text style={styles.body}>
          Skriv inn e-posten din, så sender vi deg en lenke for å sette nytt passord.
        </Text>

        <AuthTextField
          label="E-post"
          value={epost}
          onChangeText={setEpost}
          placeholder="din@epost.no"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {info ? <Text style={authOnboardingTheme.infoText}>{info}</Text> : null}
        {feil ? <Text style={authOnboardingTheme.errorText}>{feil}</Text> : null}

        <AuthPrimaryButton label="Send lenke" onPress={() => void sendRecovery()} loading={laster} />

        <View style={styles.backRow}>
          <Link href="/auth" asChild>
            <TouchableOpacity>
              <Text style={authOnboardingTheme.link}>Tilbake til innlogging</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  block: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    marginTop: 8,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#5C6570',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  backRow: {
    alignItems: 'center',
    marginTop: 20,
  },
})
