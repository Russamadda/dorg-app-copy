import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans'
import {
  DMSerifDisplay_400Regular,
} from '@expo-google-fonts/dm-serif-display'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  })
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if ((!fontsLoaded && !fontError) || session === undefined) {
      return
    }

    const rootSegment = segments[0]
    const inAuth = rootSegment === 'auth'
    const inTabs = rootSegment === '(tabs)'

    if (session && !inTabs) {
      router.replace('/(tabs)')
      return
    }

    if (!session && !inAuth) {
      router.replace('/auth/login')
    }
  }, [fontError, fontsLoaded, router, segments, session])

  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  )
}
