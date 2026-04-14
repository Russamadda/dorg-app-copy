import { useEffect, useRef, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import * as Linking from 'expo-linking'
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans'
import {
  DMSerifDisplay_400Regular,
} from '@expo-google-fonts/dm-serif-display'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import type { Session } from '@supabase/supabase-js'
import { hentAuthCallbackParams } from '../lib/auth'
import { erFirmaOppsettFullfort } from '../lib/firmaSetup'
import { subscribeFirmaOppsettEndret } from '../lib/firmaSetupEvents'
import { supabase, hentFirma } from '../lib/supabase'
import { BRAND_BACKGROUND_BASE_COLOR, prefetchBrandBackground } from '../lib/backgroundConfig'

void SplashScreen.preventAutoHideAsync().catch(() => {
  // This can already be handled by Expo during fast refresh / dev reloads.
})

void prefetchBrandBackground()

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()
  const splashHiddenRef = useRef(false)
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  })
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  /** undefined = ikke avklart ennå (laster firma etter innlogging). */
  const [firmaOppsettKlar, setFirmaOppsettKlar] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    if ((fontsLoaded || fontError) && !splashHiddenRef.current) {
      splashHiddenRef.current = true
      void SplashScreen.hideAsync().catch(() => {
        // Ignore "No native splash screen registered" during dev reload edge cases.
      })
    }
  }, [fontsLoaded, fontError])

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          // Ugyldig eller utløpt refresh token i AsyncStorage — rydd lokalt og vis login.
          void supabase.auth.signOut({ scope: 'local' })
          setSession(null)
          return
        }
        setSession(session ?? null)
      })
      .catch(() => {
        void supabase.auth.signOut({ scope: 'local' })
        setSession(null)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null)

      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/auth/reset-password')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    if (session === undefined) {
      return
    }

    let avbrutt = false

    async function synkOppsett() {
      if (!session?.user) {
        if (!avbrutt) setFirmaOppsettKlar(undefined)
        return
      }
      try {
        const f = await hentFirma(session.user.id)
        if (!avbrutt) setFirmaOppsettKlar(erFirmaOppsettFullfort(f))
      } catch {
        if (!avbrutt) setFirmaOppsettKlar(false)
      }
    }

    void synkOppsett()
    const avmeld = subscribeFirmaOppsettEndret(() => {
      void synkOppsett()
    })

    return () => {
      avbrutt = true
      avmeld()
    }
  }, [session])

  useEffect(() => {
    async function handterAuthLenke(url: string | null) {
      if (!url) {
        return
      }

      const {
        accessToken,
        refreshToken,
        code,
        type,
        errorCode,
        errorDescription,
      } = hentAuthCallbackParams(url)

      if (errorCode || errorDescription) {
        console.error(
          '[auth] Auth-lenke inneholdt feil:',
          errorCode ?? 'ukjent_kode',
          errorDescription ?? 'ukjent feil'
        )
        return
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          console.error('[auth] Klarte ikke bytte auth-kode til session:', error.message)
          return
        }

        if (type === 'recovery') {
          router.replace('/auth/reset-password')
        }

        return
      }

      if (!accessToken || !refreshToken) {
        return
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (error) {
        console.error('[auth] Klarte ikke sette session fra recovery-lenke:', error.message)
        return
      }

      if (type === 'recovery') {
        router.replace('/auth/reset-password')
      }
    }

    void Linking.getInitialURL().then(url => {
      void handterAuthLenke(url)
    })

    const subscription = Linking.addEventListener('url', event => {
      void handterAuthLenke(event.url)
    })

    return () => subscription.remove()
  }, [router])

  useEffect(() => {
    if ((!fontsLoaded && !fontError) || session === undefined) {
      return
    }

    const rootSegment = segments[0]
    const inAuth = rootSegment === 'auth'
    const inTabs = rootSegment === '(tabs)'
    const inBedrift = rootSegment === 'bedrift'
    const inResetPassword = inAuth && segments[1] === 'reset-password'

    if (!session) {
      if (!inAuth) {
        router.replace('/auth')
      }
      return
    }

    if (firmaOppsettKlar === undefined) {
      return
    }

    if (!firmaOppsettKlar && !inBedrift && !inResetPassword) {
      router.replace('/bedrift')
      return
    }

    if (firmaOppsettKlar && !inTabs && !inBedrift && !inResetPassword) {
      router.replace('/(tabs)')
      return
    }
  }, [fontError, fontsLoaded, firmaOppsettKlar, router, segments, session])

  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, overflow: 'visible' }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: BRAND_BACKGROUND_BASE_COLOR },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bedrift" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
