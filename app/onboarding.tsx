import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import OnboardingFlow from '../components/onboarding/OnboardingFlow'
import { clearCachedFirma, getCachedFirmaForUser, setCachedFirma } from '../lib/firmaCache'
import { hentFirmanavnFraAuthMetadata } from '../lib/firmaSetup'
import { hentFirma, hentLokalAuthSession, supabase } from '../lib/supabase'
import type { Firma } from '../types'

export default function OnboardingScreen() {
  const router = useRouter()
  const [firma, setFirma] = useState<Firma | null>(null)
  const [userId, setUserId] = useState('')
  const [registrertFirmanavn, setRegistrertFirmanavn] = useState('')
  const [laster, setLaster] = useState(true)

  const lastData = useCallback(async () => {
    setLaster(true)

    try {
      const session = await hentLokalAuthSession()
      if (!session) {
        clearCachedFirma()
        setFirma(null)
        setUserId('')
        setRegistrertFirmanavn('')
        return
      }

      const aktivUserId = session.user.id
      setUserId(aktivUserId)
      let authMetadata = session.user.user_metadata
      const { data: ferskUserData } = await supabase.auth.getUser()
      if (ferskUserData.user?.id === aktivUserId) {
        authMetadata = ferskUserData.user.user_metadata
      }
      setRegistrertFirmanavn(hentFirmanavnFraAuthMetadata(authMetadata))

      const cachedFirma = getCachedFirmaForUser(aktivUserId)
      if (cachedFirma) {
        setFirma(cachedFirma)
      } else {
        setFirma(null)
      }

      const firmaData = await hentFirma(aktivUserId)
      setFirma(firmaData)
      setCachedFirma(firmaData)
    } catch (error) {
      console.error('[onboarding] Kunne ikke laste firma:', error)
    } finally {
      setLaster(false)
    }
  }, [])

  useEffect(() => {
    void lastData()
  }, [lastData])

  if (laster || !userId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    )
  }

  return (
    <OnboardingFlow
      key={`${userId}:${firma?.id ?? 'none'}:${firma?.userId ?? 'none'}`}
      userId={userId}
      firma={firma}
      initialFirmanavn={registrertFirmanavn}
      onFerdig={oppdatertFirma => {
        setFirma(oppdatertFirma)
        setCachedFirma(oppdatertFirma)
        router.replace('/bedrift')
      }}
    />
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
})
