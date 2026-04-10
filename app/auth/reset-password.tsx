import { useEffect, useState } from 'react'
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
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import type { Session } from '@supabase/supabase-js'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../constants/colors'
import { oversettAuthFeil } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default function ResetPasswordScreen() {
  const [passord, setPassord] = useState('')
  const [bekreftPassord, setBekreftPassord] = useState('')
  const [feil, setFeil] = useState('')
  const [info, setInfo] = useState('')
  const [laster, setLaster] = useState(false)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

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

    if (!passord || !bekreftPassord) {
      setFeil('Fyll inn begge passordfeltene.')
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
      const { error } = await supabase.auth.updateUser({ password: passord })

      if (error) {
        setFeil(oversettAuthFeil(error.message))
        return
      }

      setInfo('Passordet er oppdatert. Du kan fortsette i appen.')
      router.replace('/(tabs)')
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
            <Text style={styles.subheader}>Sett nytt passord</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.beskrivelse}>
              Velg et nytt passord for kontoen din. Recovery-lenken fra e-posten må åpnes på denne enheten først.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>NYTT PASSORD</Text>
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
              onPress={oppdaterPassord}
              disabled={laster}
            >
              {laster ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.knappTekst}>Oppdater passord</Text>
              )}
            </TouchableOpacity>
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
})
