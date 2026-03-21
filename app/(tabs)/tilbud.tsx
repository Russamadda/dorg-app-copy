import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase, hentSendteTilbud, hentFirma } from '../../lib/supabase'
import { fabEmitter } from '../../lib/fabEmitter'
import { Colors } from '../../constants/colors'
import type { Forespørsel, Firma } from '../../types'
import TopBar from '../../components/TopBar'
import TilbudKort from '../../components/TilbudKort'
import NyttTilbudModal from '../../components/NyttTilbudModal'
import TilbudDetaljerModal from '../../components/TilbudDetaljerModal'
import ToastMessage from '../../components/ToastMessage'

type Filter = 'alle' | 'godkjent' | 'avslatt' | 'sendt'

const FILTRE: { key: Filter; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'godkjent', label: 'Godkjent' },
  { key: 'avslatt', label: 'Avslått' },
  { key: 'sendt', label: 'Avventer' },
]

export default function TilbudScreen() {
  const insets = useSafeAreaInsets()
  const [tilbud, setTilbud] = useState<Forespørsel[]>([])
  const [firma, setFirma] = useState<Firma | null>(null)
  const [laster, setLaster] = useState(true)
  const [oppdaterer, setOppdaterer] = useState(false)
  const [aktivFilter, setAktivFilter] = useState<Filter>('alle')
  const [visNyttTilbud, setVisNyttTilbud] = useState(false)
  const [valgtTilbud, setValgtTilbud] = useState<Forespørsel | null>(null)
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
        const data = await hentSendteTilbud(firmaData.id)
        setTilbud(data)
      }
    } catch (err) {
      console.error(err)
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

  const filtrert =
    aktivFilter === 'alle' ? tilbud : tilbud.filter(t => t.status === aktivFilter)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />
      <ToastMessage
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 85 }]}
        refreshControl={
          <RefreshControl refreshing={oppdaterer} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        <Text style={styles.title}>Sendte tilbud</Text>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {FILTRE.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, aktivFilter === f.key && styles.filterPillAktiv]}
              onPress={() => setAktivFilter(f.key)}
            >
              <Text style={[styles.filterTekst, aktivFilter === f.key && styles.filterTekstAktiv]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {laster ? (
          <ActivityIndicator color={Colors.accent} style={styles.spinner} size="large" />
        ) : filtrert.length === 0 ? (
          <TomTilstand />
        ) : (
          filtrert.map(t => (
            <TilbudKort
              key={t.id}
              tilbud={t}
              onPress={() => setValgtTilbud(t)}
            />
          ))
        )}

        {!laster && filtrert.length > 0 && (
          <Text style={styles.footer}>
            Viser {filtrert.length} av {tilbud.length} tilbud
          </Text>
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

      <TilbudDetaljerModal
        tilbud={valgtTilbud}
        visible={valgtTilbud !== null}
        onClose={() => setValgtTilbud(null)}
        onOppdatert={() => {
          lastData()
          setValgtTilbud(null)
        }}
      />
    </SafeAreaView>
  )
}

function TomTilstand() {
  return (
    <View style={styles.tomWrapper}>
      <View style={styles.tomSirkel}>
        <Ionicons name="send-outline" size={36} color={Colors.accent} />
      </View>
      <Text style={styles.tomTittel}>Ingen tilbud sendt ennå</Text>
      <Text style={styles.tomTekst}>Tilbud du sender dukker opp her</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16 },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: Colors.primary,
    marginTop: 16,
    marginBottom: 16,
  },
  filterScroll: { marginBottom: 16 },
  filterContent: { gap: 8, paddingRight: 4 },
  filterPill: {
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillAktiv: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterTekstAktiv: { color: '#fff' },
  spinner: { marginTop: 60 },
  footer: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
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
