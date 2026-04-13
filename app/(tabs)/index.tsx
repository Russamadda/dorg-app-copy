import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNyttTilbudFlyt } from '../../hooks/useNyttTilbudFlyt'
import { hentTilbudJobbtyper } from '../../lib/tilbudTjenester'
import { TjenesteSelectorSheet } from '../../components/TjenesteSelectorSheet'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { SwipeListView } from 'react-native-swipe-list-view'
import {
  supabase,
  hentForespørsler,
  hentFirma,
  hentUtkast,
  slettTilbud,
} from '../../lib/supabase'
import { getCachedFirma, setCachedFirma } from '../../lib/firmaCache'
import { fabEmitter } from '../../lib/fabEmitter'
import type { Forespørsel, Firma } from '../../types'
import TopBar, { getTopBarOuterHeight } from '../../components/TopBar'
import ForespørselKort from '../../components/ForespørselKort'
import NyttTilbudModal from '../../components/NyttTilbudModal'
import ToastMessage from '../../components/ToastMessage'
import { getFloatingTabBarPadding } from '../../components/FloatingTabBar'

type FilterKey = 'alle' | 'avventer' | 'utkast'

const FILTRE: Array<{ key: FilterKey; label: string }> = [
  { key: 'alle', label: 'Alle' },
  { key: 'avventer', label: 'Avventer' },
  { key: 'utkast', label: 'Utkast' },
]

type SwipeListItem = Forespørsel & {
  rowKey: string
  leftOpenValue?: number
  stopLeftSwipe?: number
  rightOpenValue?: number
  stopRightSwipe?: number
  disableLeftSwipe?: boolean
}

const SWIPE_OPEN_VALUE = 0
const DELETE_OPEN_VALUE = -92
const SWIPE_TO_OPEN_PERCENT = 40
const SWIPE_TO_CLOSE_PERCENT = 42
const DIRECTION_THRESHOLD = 5

const listAnimationConfig = {
  duration: 220,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
}

function animateListChange() {
  LayoutAnimation.configureNext(listAnimationConfig)
}

async function giSwipeHaptikk() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  } catch {
    // Haptics skal aldri blokkere hovedflyten.
  }
}

export default function ForespørslerScreen() {
  const insets = useSafeAreaInsets()
  const [forespørsler, setForespørsler] = useState<Forespørsel[]>([])
  const [skjulteIds, setSkjulteIds] = useState<string[]>([])
  const [firma, setFirma] = useState<Firma | null>(null)
  const [laster, setLaster] = useState(true)
  const [oppdaterer, setOppdaterer] = useState(false)
  const tilbudFlyt = useNyttTilbudFlyt()
  const jobbtyperListe = useMemo(() => hentTilbudJobbtyper(firma), [firma])
  const [aktivFilter, setAktivFilter] = useState<FilterKey>('alle')
  const [toast, setToast] = useState({ visible: false, message: '' })

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true)
    }
  }, [])

  const lastData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const firmaData = await hentFirma(session.user.id)
      setFirma(firmaData)
      setCachedFirma(firmaData)
      if (firmaData) {
        const [avventerRader, utkastRader] = await Promise.all([
          hentForespørsler(firmaData.id),
          hentUtkast(firmaData.id),
        ])
        const merged = [...utkastRader, ...avventerRader].sort((a, b) => {
          const da = new Date(a.sistOppdatertDato ?? a.opprettetDato).getTime()
          const db = new Date(b.sistOppdatertDato ?? b.opprettetDato).getTime()
          return db - da
        })
        setForespørsler(merged)
      }
    } catch (err) {
      console.error('Feil ved lasting av forespørsler:', err)
    } finally {
      setLaster(false)
      setOppdaterer(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      const cachedFirma = getCachedFirma()
      if (cachedFirma) {
        setFirma(cachedFirma)
      }

      void lastData()
    }, [lastData])
  )

  // Ikke bruk useFocusEffect til FAB: RN Modal (nytt tilbud) kan trigge blur → cleanup
  // fjerner lytteren mens skjermen fortsatt er «Forespørsler», og FAB virker død etter lukking.
  useEffect(() => {
    return fabEmitter.on(aktivRute => {
      if (aktivRute === 'index') {
        tilbudFlyt.fabTrykket()
      }
    })
  }, [tilbudFlyt.fabTrykket])

  function onRefresh() {
    setOppdaterer(true)
    lastData()
  }

  const avventer = forespørsler.filter(f => f.status === 'avventer').length

  const filtrerteForespørsler = useMemo(() => {
    switch (aktivFilter) {
      case 'avventer':
        return forespørsler.filter(item => item.status === 'avventer')
      case 'utkast':
        return forespørsler.filter(item => item.status === 'utkast')
      case 'alle':
      default:
        return forespørsler
    }
  }, [aktivFilter, forespørsler])

  const synligeRader = useMemo(
    () => filtrerteForespørsler.filter(item => !skjulteIds.includes(item.id)),
    [filtrerteForespørsler, skjulteIds]
  )

  const swipeData = useMemo<SwipeListItem[]>(
    () =>
      synligeRader.map(item => {
        const erUtkast = item.status === 'utkast'
        return {
          ...item,
          rowKey: item.id,
          leftOpenValue: SWIPE_OPEN_VALUE,
          stopLeftSwipe: SWIPE_OPEN_VALUE,
          rightOpenValue: erUtkast ? DELETE_OPEN_VALUE : 0,
          stopRightSwipe: erUtkast ? DELETE_OPEN_VALUE : 0,
          /** Per rad: SwipeListView bruker `item.rightOpenValue || props` så 0 blir overskrevet; venstresveip = slett. */
          disableLeftSwipe: !erUtkast,
        }
      }),
    [synligeRader]
  )

  const håndterSlettUtkast = useCallback(
    async (rad: Forespørsel) => {
      if (rad.status !== 'utkast') return
      animateListChange()
      setSkjulteIds(current => (current.includes(rad.id) ? current : [...current, rad.id]))
      try {
        await slettTilbud(rad.id)
        setToast({ visible: true, message: 'Utkast slettet' })
      } catch (err) {
        console.error(err)
        animateListChange()
        setSkjulteIds(current => current.filter(id => id !== rad.id))
        setToast({ visible: true, message: 'Kunne ikke slette utkast' })
      }
    },
    []
  )

  const renderHiddenItem = useCallback(() => {
    return (
      <View style={styles.hiddenRow}>
        <View style={styles.hiddenDelete}>
          <Ionicons name="trash-outline" size={20} color="#CC3333" />
        </View>
      </View>
    )
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: SwipeListItem }) => (
      <View style={styles.rowFront}>
        <ForespørselKort
          forespørsel={item}
          firma={firma}
          onOppdater={lastData}
          onÅpneUtkast={tilbudFlyt.åpneMedUtkast}
        />
      </View>
    ),
    [firma, lastData, tilbudFlyt.åpneMedUtkast]
  )

  const håndterRowDidOpen = useCallback(
    async (
      rowKey: string,
      rowMap: Record<string, { closeRow?: () => void }>,
      toValue: number
    ) => {
      const rad = swipeData.find(r => r.rowKey === rowKey)
      if (!rad || rad.status !== 'utkast') {
        return
      }

      rowMap[rowKey]?.closeRow?.()
      if (toValue < 0) {
        await giSwipeHaptikk()
        await håndterSlettUtkast(rad)
      }
    },
    [håndterSlettUtkast, swipeData]
  )

  const listHeader = useMemo(
    () => (
      <>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Forespørsler</Text>
          <View style={styles.subtitleIndent}>
            <Text style={styles.subtitle}>{avventer} AVVENTER GODKJENNING</Text>
          </View>
        </View>

        <View style={styles.filterSection}>
          <View style={styles.filterRow}>
            {FILTRE.map(filter => {
              const aktiv = aktivFilter === filter.key

              return (
                <View key={filter.key} style={styles.filterPillWrap}>
                  <TouchableOpacity
                    style={[
                      styles.filterPill,
                      aktiv ? styles.filterPillActive : styles.filterPillInactive,
                    ]}
                    onPress={() => setAktivFilter(filter.key)}
                    activeOpacity={0.86}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        aktiv ? styles.filterTextActive : styles.filterTextInactive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>
        </View>
      </>
    ),
    [aktivFilter, avventer]
  )

  return (
    <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.header}>
          <View pointerEvents="none" style={styles.headerFrost}>
            <BlurView
              intensity={72}
              tint="light"
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.headerTint} />
          </View>

          <TopBar absolute={false} />
        </View>

        <ToastMessage
          message={toast.message}
          visible={toast.visible}
          onHide={() => setToast(t => ({ ...t, visible: false }))}
        />

        <View style={styles.body}>
          {laster ? (
            <ScrollView
              style={styles.listFlex}
              contentContainerStyle={[
                styles.listContent,
                {
                  paddingTop: getTopBarOuterHeight(insets.top),
                  paddingBottom: getFloatingTabBarPadding(insets.bottom),
                  flexGrow: 1,
                },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.titleBlock}>
                <Text style={styles.title}>Forespørsler</Text>
                <View style={styles.subtitleIndent}>
                  <Text style={styles.subtitle}>{avventer} AVVENTER GODKJENNING</Text>
                </View>
              </View>
              <View style={styles.loadingWrap}>
                <ActivityIndicator color="#111111" style={styles.spinner} size="large" />
              </View>
            </ScrollView>
          ) : (
            <SwipeListView
              style={styles.listFlex}
              data={swipeData}
              keyExtractor={item => item.rowKey}
              renderItem={renderItem}
              renderHiddenItem={renderHiddenItem}
              ListHeaderComponent={listHeader}
              ListEmptyComponent={<TomTilstand />}
              contentContainerStyle={[
                styles.listContent,
                {
                  paddingTop: getTopBarOuterHeight(insets.top),
                  paddingBottom: getFloatingTabBarPadding(insets.bottom),
                },
              ]}
            refreshControl={
              <RefreshControl
                refreshing={oppdaterer}
                onRefresh={onRefresh}
                tintColor="#111111"
              />
            }
            leftOpenValue={SWIPE_OPEN_VALUE}
            rightOpenValue={DELETE_OPEN_VALUE}
            stopLeftSwipe={SWIPE_OPEN_VALUE}
            stopRightSwipe={DELETE_OPEN_VALUE}
            swipeToOpenPercent={SWIPE_TO_OPEN_PERCENT}
            swipeToClosePercent={SWIPE_TO_CLOSE_PERCENT}
            directionalDistanceChangeThreshold={DIRECTION_THRESHOLD}
            closeOnScroll
            closeOnRowPress
            closeOnRowOpen
            closeOnRowBeginSwipe
            disableLeftSwipe={false}
            disableRightSwipe
            recalculateHiddenLayout
            onRowDidOpen={håndterRowDidOpen}
            showsVerticalScrollIndicator={false}
            useFlatList
            swipeRowStyle={styles.swipeRow}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            updateCellsBatchingPeriod={50}
            />
          )}
        </View>

        {tilbudFlyt.valgtTjeneste != null ? (
          <NyttTilbudModal
            visible={tilbudFlyt.visNyttTilbudModal}
            onClose={tilbudFlyt.lukkModal}
            firma={firma}
            valgtTjeneste={tilbudFlyt.valgtTjeneste}
            onRequestVelgTjeneste={tilbudFlyt.åpneTjenesteVelger}
            utkastKilde={tilbudFlyt.utkastKilde}
            onConsumedUtkastKilde={tilbudFlyt.konsumerUtkastKilde}
            onSendt={navn => {
              lastData()
              setToast({ visible: true, message: `Tilbud sendt til ${navn}` })
            }}
          />
        ) : null}
        <TjenesteSelectorSheet
          visible={tilbudFlyt.visTjenesteSheet}
          onClose={tilbudFlyt.lukkTjenesteSheet}
          jobbtyper={jobbtyperListe}
          valgtTjeneste={tilbudFlyt.valgtTjeneste}
          onSelect={tilbudFlyt.onTjenesteValgt}
        />
    </SafeAreaView>
  )
}

function TomTilstand() {
  return (
    <View style={styles.tomWrapper}>
      <Ionicons name="mail-open-outline" size={58} color="#111111" style={styles.tomIcon} />
      <Text style={styles.tomTittel}>Ingen forespørsler ennå</Text>
      <Text style={styles.tomTekst}>Nye forespørsler fra kunder dukker opp her.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  body: {
    flex: 1,
  },
  listFlex: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  headerFrost: {
    ...StyleSheet.absoluteFillObject,
  },
  headerTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(238,241,246,0.1)',
  },
  titleBlock: {
    marginTop: 12,
  },
  subtitleIndent: {
    marginTop: 4,
    paddingLeft: 8,
  },
  title: {
    paddingLeft: 4,
    fontSize: 28,
    lineHeight: 32,
    fontFamily: 'DMSans_700Bold',
    color: '#111111',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
  },
  filterSection: {
    marginTop: 10,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 2,
  },
  filterPillWrap: {
    position: 'relative',
  },
  filterPill: {
    height: 32,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: '#111111',
  },
  filterPillInactive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  filterText: {
    fontSize: 13,
  },
  filterTextActive: {
    fontFamily: 'DMSans_500Medium',
    color: '#FFFFFF',
  },
  filterTextInactive: {
    fontFamily: 'DMSans_400Regular',
    color: '#666666',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  swipeRow: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'visible',
  },
  rowFront: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  hiddenRow: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#D4D4E6',
    justifyContent: 'center',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  hiddenDelete: {
    width: Math.abs(DELETE_OPEN_VALUE),
    height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginTop: 60,
  },
  tomWrapper: {
    marginTop: 84,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  tomIcon: {
    opacity: 0.2,
    marginBottom: 16,
  },
  tomTittel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
    color: '#111111',
    textAlign: 'center',
  },
  tomTekst: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#888888',
    textAlign: 'center',
  },
})
