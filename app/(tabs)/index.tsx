import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase, hentForespørsler, hentFirma } from '../../lib/supabase'
import { fabEmitter } from '../../lib/fabEmitter'
import { Colors } from '../../constants/colors'
import type { Forespørsel, Firma } from '../../types'
import TopBar from '../../components/TopBar'
import ForespørselKort from '../../components/ForespørselKort'
import NyttTilbudModal from '../../components/NyttTilbudModal'
import ToastMessage from '../../components/ToastMessage'

export default function ForespørslerScreen() {
  const insets = useSafeAreaInsets()
  const [forespørsler, setForespørsler] = useState<Forespørsel[]>([])
  const [firma, setFirma] = useState<Firma | null>(null)
  const [laster, setLaster] = useState(true)
  const [oppdaterer, setOppdaterer] = useState(false)
  const [visNyttTilbud, setVisNyttTilbud] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '' })

  useFocusEffect(
    useCallback(() => {
      return fabEmitter.on(() => setVisNyttTilbud(true))
    }, [])
  )

  async function lastData() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const firmaData = await hentFirma(session.user.id)
      setFirma(firmaData)
      if (firmaData) {
        const data = await hentForespørsler(firmaData.id)
        setForespørsler(data)
      }
    } catch (err) {
      console.error('Feil ved lasting av forespørsler:', err)
    } finally {
      setLaster(false)
      setOppdaterer(false)
    }
  }

  useEffect(() => { lastData() }, [])

  function onRefresh() {
    setOppdaterer(true)
    lastData()
  }

  const avventer = forespørsler.filter(f => f.status === 'avventer').length

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />
      <ToastMessage
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 58 }]}
        refreshControl={
          <RefreshControl
            refreshing={oppdaterer}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Forespørsler</Text>
          <Text style={styles.subtitle}>
            {avventer} AVVENTER GODKJENNING
          </Text>
        </View>

        {laster ? (
          <ActivityIndicator color={Colors.accent} style={styles.spinner} size="large" />
        ) : forespørsler.length === 0 ? (
          <TomTilstand />
        ) : (
          forespørsler.map(f => (
            <ForespørselKort
              key={f.id}
              forespørsel={f}
              firma={firma}
              onOppdater={lastData}
            />
          ))
        )}
      </ScrollView>

      <NyttTilbudModal
        visible={visNyttTilbud}
        onClose={() => setVisNyttTilbud(false)}
        firma={firma}
        onSendt={(navn) => {
          lastData()
          setToast({ visible: true, message: `Tilbud sendt til ${navn}` })
        }}
      />
    </SafeAreaView>
  )
}

function TomTilstand() {
  return (
    <View style={styles.tomWrapper}>
      <View style={styles.tomSirkel}>
        <Ionicons name="mail-outline" size={36} color={Colors.accent} />
      </View>
      <Text style={styles.tomTittel}>Ingen forespørsler ennå</Text>
      <Text style={styles.tomTekst}>Nye forespørsler fra kunder dukker opp her</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16 },
  titleRow: { marginTop: 16, marginBottom: 16 },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: Colors.primary,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  spinner: { marginTop: 60 },
  tomWrapper: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  tomSirkel: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.infoBackground,
    borderWidth: 1,
    borderColor: Colors.infoBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tomTittel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  tomTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
})
