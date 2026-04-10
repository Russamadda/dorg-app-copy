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
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'

export default function LoginScreen() {
  const [epost, setEpost] = useState('')
  const [passord, setPassord] = useState('')
  const [feil, setFeil] = useState('')
  const [laster, setLaster] = useState(false)

  async function loggInn() {
    if (!epost || !passord) {
      setFeil('Fyll inn e-post og passord.')
      return
    }
    setFeil('')
    setLaster(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normaliserEpost(epost),
        password: passord,
      })
      if (error) {
        setFeil(oversettAuthFeil(error.message))
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
            <Text style={styles.subheader}>Håndverkerportal</Text>
          </View>

          <View style={styles.form}>
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
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.glemtPassordRad}>
              <Link href="/auth/forgot-password" asChild>
                <TouchableOpacity>
                  <Text style={styles.glemtPassordLenke}>Glemt passord?</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {feil ? <Text style={styles.feil}>{feil}</Text> : null}

            <TouchableOpacity
              style={[styles.knapp, laster && styles.knappDisabled]}
              onPress={loggInn}
              disabled={laster}
            >
              {laster ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.knappTekst}>Logg inn</Text>
              )}
            </TouchableOpacity>

            <View style={styles.registrerRad}>
              <Text style={styles.registrerTekst}>Har du ikke konto? </Text>
              <Link href="/auth/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.registrerLenke}>Opprett konto</Text>
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
  glemtPassordRad: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
  glemtPassordLenke: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.primary,
    textDecorationLine: 'underline',
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
  registrerRad: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  registrerTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  registrerLenke: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
})
