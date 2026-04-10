import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { Link } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { normaliserEpost, oversettAuthFeil } from '../../lib/auth'
import { supabase, opprettFirma } from '../../lib/supabase'
import { Colors } from '../../constants/colors'

export default function RegisterScreen() {
  const [firmanavn, setFirmanavn] = useState('')
  const [epost, setEpost] = useState('')
  const [passord, setPassord] = useState('')
  const [bekreftPassord, setBekreftPassord] = useState('')
  const [feil, setFeil] = useState('')
  const [info, setInfo] = useState('')
  const [laster, setLaster] = useState(false)

  async function registrer() {
    if (!firmanavn || !epost || !passord || !bekreftPassord) {
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
        await opprettFirma(data.user.id, firmanavn.trim())
      }
      if (!data.session) {
        setInfo('Konto opprettet. Bekreft e-posten før du logger inn.')
      }
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
            <Text style={styles.subheader}>Opprett konto</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>FIRMANAVN</Text>
              <TextInput
                style={styles.input}
                value={firmanavn}
                onChangeText={setFirmanavn}
                placeholder="Ditt firma AS"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>

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

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PASSORD</Text>
              <TextInput
                style={styles.input}
                value={passord}
                onChangeText={setPassord}
                placeholder="Minst 6 tegn"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>BEKREFT PASSORD</Text>
              <TextInput
                style={styles.input}
                value={bekreftPassord}
                onChangeText={setBekreftPassord}
                placeholder="Gjenta passordet"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {info ? <Text style={styles.info}>{info}</Text> : null}
            {feil ? <Text style={styles.feil}>{feil}</Text> : null}

            <TouchableOpacity
              style={[styles.knapp, laster && styles.knappDisabled]}
              onPress={registrer}
              disabled={laster}
            >
              {laster ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.knappTekst}>Opprett konto</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loggInnRad}>
              <Text style={styles.loggInnTekst}>Har du allerede konto? </Text>
              <Link href="/auth/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.loggInnLenke}>Logg inn</Text>
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
  feil: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.danger,
    textAlign: 'center',
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
  loggInnRad: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  loggInnTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loggInnLenke: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
})
