import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Link } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../constants/colors'
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
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.logo}>DORG</Text>
            <Text style={styles.subheader}>Nullstill passord</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.beskrivelse}>
              Skriv inn e-posten din, så sender vi deg en lenke for å sette nytt passord.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>E-POST</Text>
              <TextInput
                style={styles.input}
                value={epost}
                onChangeText={setEpost}
                placeholder="din@epost.no"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {info ? <Text style={styles.info}>{info}</Text> : null}
            {feil ? <Text style={styles.feil}>{feil}</Text> : null}

            <TouchableOpacity
              style={[styles.knapp, laster && styles.knappDisabled]}
              onPress={sendRecovery}
              disabled={laster}
            >
              {laster ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.knappTekst}>Send lenke</Text>
              )}
            </TouchableOpacity>

            <View style={styles.tilbakeRad}>
              <Link href="/auth/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.tilbakeLenke}>Tilbake til innlogging</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 32,
    letterSpacing: 4,
    color: Colors.primary,
  },
  subheader: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  form: {
    gap: 16,
  },
  beskrivelse: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  input: {
    height: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  info: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.infoText,
    textAlign: 'center',
    backgroundColor: Colors.infoBackground,
    borderWidth: 1,
    borderColor: Colors.infoBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  feil: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.danger,
    textAlign: 'center',
  },
  knapp: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  knappDisabled: {
    opacity: 0.7,
  },
  knappTekst: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#fff',
  },
  tilbakeRad: {
    alignItems: 'center',
    marginTop: 8,
  },
  tilbakeLenke: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
})
