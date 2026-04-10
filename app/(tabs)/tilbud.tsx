import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useNyttTilbudFlyt } from '../../hooks/useNyttTilbudFlyt'
import { hentTilbudJobbtyper } from '../../lib/tilbudTjenester'
import { TjenesteSelectorSheet } from '../../components/TjenesteSelectorSheet'
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  Easing,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { SwipeListView } from 'react-native-swipe-list-view'
import {
  supabase,
  hentSendteTilbud,
  hentFirma,
  markerSomLest,
  slettTilbud,
} from '../../lib/supabase'
import { getCachedFirma, setCachedFirma } from '../../lib/firmaCache'
import { fabEmitter } from '../../lib/fabEmitter'
import { oppdaterBadge } from '../../lib/notificationState'
import { beregnTilbudTotalInklMva } from '../../lib/tilbudPris'
import { prefetchTilbudHendelser } from '../../lib/tilbudHendelserCache'
import type { Forespørsel, Firma } from '../../types'
import NotificationBadge from '../../components/NotificationBadge'
import TopBar from '../../components/TopBar'
import TilbudKort from '../../components/TilbudKort'
import NyttTilbudModal from '../../components/NyttTilbudModal'
import TilbudDetaljerModal from '../../components/TilbudDetaljerModal'
import { Toast } from '../../components/Toast'
import { getFloatingTabBarPadding } from '../../components/FloatingTabBar'
import AppBackground from '../../components/AppBackground'

type FilterLabel = 'Sendt' | 'Justering' | 'Godkjent' | 'Alle'

type SwipeListItem = Forespørsel & {
  rowKey: string
  leftOpenValue?: number
  stopLeftSwipe?: number
  rightOpenValue?: number
  stopRightSwipe?: number
}

const SWIPE_OPEN_VALUE = 0
const DELETE_OPEN_VALUE = -92
const SWIPE_TO_OPEN_PERCENT = 40
const SWIPE_TO_CLOSE_PERCENT = 42
const DIRECTION_THRESHOLD = 5

const FILTRE: FilterLabel[] = ['Sendt', 'Justering', 'Godkjent', 'Alle']

const filterStatuser: Record<FilterLabel, string[] | null> = {
  Sendt: ['sendt', 'paminnelse_sendt', 'siste_paminnelse_sendt'],
  Justering: ['justering'],
  Godkjent: ['godkjent'],
  Alle: null,
}

function tellUleste(tilbud: Forespørsel[], status: string): number {
  return tilbud.filter(t => t.status === status && !t.settSomLest).length
}

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

function sorterTilbud(a: Forespørsel, b: Forespørsel) {
  const erAvsluttet = (status: Forespørsel['status']) =>
    status === 'godkjent' || status === 'utfort' || status === 'avslatt'

  const aAvsluttet = erAvsluttet(a.status)
  const bAvsluttet = erAvsluttet(b.status)

  if (aAvsluttet !== bAvsluttet) {
    return aAvsluttet ? 1 : -1
  }

  return new Date(b.opprettetDato).getTime() - new Date(a.opprettetDato).getTime()
}

function filtrerTilbudEtterValgtFilter(liste: Forespørsel[], filter: FilterLabel) {
  const aktivtFilter = filterStatuser[filter]

  if (!aktivtFilter) {
    return [...liste].sort(sorterTilbud)
  }

  if (Array.isArray(aktivtFilter)) {
    return liste.filter(item => aktivtFilter.includes(item.status)).sort(sorterTilbud)
  }

  return liste.filter(item => item.status === aktivtFilter).sort(sorterTilbud)
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

export default function TilbudScreen() {
  const insets = useSafeAreaInsets()

  const nudgeAnim = useRef(new Animated.Value(0)).current
  const tilbudRef = useRef<Forespørsel[]>([])
  const nudgeKjørtForFokusRef = useRef(0)

  const [tilbud, setTilbud] = useState<Forespørsel[]>([])
  const [skjulteTilbudIds, setSkjulteTilbudIds] = useState<string[]>([])
  const [firma, setFirma] = useState<Firma | null>(null)
  const [laster, setLaster] = useState(true)
  const [refresher, setRefresher] = useState(false)
  const [aktivFilter, setAktivFilter] = useState<FilterLabel>('Sendt')
  const [fokusNudgeVersjon, setFokusNudgeVersjon] = useState(0)
  const tilbudFlyt = useNyttTilbudFlyt()
  const jobbtyperListe = useMemo(() => hentTilbudJobbtyper(firma), [firma])
  const [valgtTilbud, setValgtTilbud] = useState<Forespørsel | null>(null)
  const [toast, setToast] = useState<{
    synlig: boolean
    melding: string
    type: 'suksess' | 'feil'
  }>({ synlig: false, melding: '', type: 'suksess' })

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true)
    }
  }, [])

  const visToast = useCallback((melding: string, type: 'suksess' | 'feil' = 'suksess') => {
    setToast({ synlig: true, melding, type })
  }, [])

  useEffect(() => {
    tilbudRef.current = tilbud
  }, [tilbud])

  const hentTilbud = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setTilbud([])
        return
      }
      const firmaData = await hentFirma(session.user.id)
      setFirma(firmaData)
      setCachedFirma(firmaData)
      if (firmaData) {
        const data = await hentSendteTilbud(firmaData.id)
        setTilbud(data)
      } else {
        setTilbud([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLaster(false)
      setRefresher(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      const cachedFirma = getCachedFirma()
      if (cachedFirma) {
        setFirma(cachedFirma)
      }

      const unsubscribeFab = fabEmitter.on(() => tilbudFlyt.fabTrykket())

      setFokusNudgeVersjon(prev => prev + 1)
      hentTilbud()

      return () => {
        nudgeAnim.stopAnimation()
        nudgeAnim.setValue(0)
        unsubscribeFab()
      }
    }, [hentTilbud, nudgeAnim, tilbudFlyt.fabTrykket])
  )

  const håndterSlettTilbud = useCallback(
    async (swipetTilbud: Forespørsel) => {
      animateListChange()
      setSkjulteTilbudIds(current =>
        current.includes(swipetTilbud.id) ? current : [...current, swipetTilbud.id]
      )
      try {
        await slettTilbud(swipetTilbud.id)
        visToast('Tilbud slettet')
      } catch (err) {
        console.error(err)
        animateListChange()
        setSkjulteTilbudIds(current => current.filter(id => id !== swipetTilbud.id))
        visToast('Kunne ikke slette tilbud', 'feil')
      }
    },
    [visToast]
  )

  const filtrert = useMemo(() => {
    const alleTilbud = tilbud.filter(item => !skjulteTilbudIds.includes(item.id))
    return filtrerTilbudEtterValgtFilter(alleTilbud, aktivFilter)
  }, [aktivFilter, skjulteTilbudIds, tilbud])

  const tilbudListe = useMemo(
    () => tilbud.filter(item => !skjulteTilbudIds.includes(item.id)).sort(sorterTilbud),
    [skjulteTilbudIds, tilbud]
  )

  const aktivVerdi = useMemo(
    () =>
      tilbudListe
        .filter(t => t.status !== 'godkjent' && t.status !== 'utfort' && t.status !== 'avslatt')
        .reduce((sum, t) => sum + beregnTilbudTotalInklMva(t), 0),
    [tilbudListe]
  )

  const aktivtAntall = useMemo(
    () => tilbudListe.filter(t => t.status !== 'godkjent' && t.status !== 'utfort' && t.status !== 'avslatt').length,
    [tilbudListe]
  )

  const antallJustering = useMemo(
    () => tellUleste(tilbudListe, 'justering'),
    [tilbudListe]
  )

  const antallGodkjent = useMemo(
    () => tellUleste(tilbudListe, 'godkjent'),
    [tilbudListe]
  )

  const antallTotalt = antallJustering + antallGodkjent

  const oppsummering = `${aktivtAntall} aktive · kr ${aktivVerdi.toLocaleString('nb-NO')} totalt`
  const firmaId = firma?.id

  const swipeData = useMemo<SwipeListItem[]>(
    () =>
      filtrert.map(item => ({
        ...item,
        rowKey: item.id,
        leftOpenValue: SWIPE_OPEN_VALUE,
        stopLeftSwipe: SWIPE_OPEN_VALUE,
        rightOpenValue: DELETE_OPEN_VALUE,
        stopRightSwipe: DELETE_OPEN_VALUE,
      })),
    [filtrert]
  )

  const førsteKortKey = swipeData[0]?.rowKey

  useEffect(() => {
    oppdaterBadge(antallTotalt)
  }, [antallTotalt])

  useEffect(() => {
    nudgeAnim.stopAnimation()
    nudgeAnim.setValue(0)

    if (!førsteKortKey) return
    if (nudgeKjørtForFokusRef.current === fokusNudgeVersjon) return

    nudgeKjørtForFokusRef.current = fokusNudgeVersjon

    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(nudgeAnim, {
          toValue: -22,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(nudgeAnim, {
          toValue: 0,
          duration: 160,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start()
    }, 800)

    return () => {
      clearTimeout(timer)
      nudgeAnim.stopAnimation()
      nudgeAnim.setValue(0)
    }
  }, [førsteKortKey, fokusNudgeVersjon, nudgeAnim])

  const åpneTilbud = useCallback(
    async (nesteTilbud: Forespørsel) => {
      void prefetchTilbudHendelser(nesteTilbud.id)
      const skalMarkeresSomLest =
        (nesteTilbud.status === 'godkjent' || nesteTilbud.status === 'justering') &&
        !nesteTilbud.settSomLest

      const tilbudForModal = skalMarkeresSomLest
        ? { ...nesteTilbud, settSomLest: true }
        : nesteTilbud

      setValgtTilbud(tilbudForModal)

      if (!skalMarkeresSomLest) {
        return
      }

      setTilbud(prev =>
        prev.map(tilbudItem =>
          tilbudItem.id === nesteTilbud.id
            ? { ...tilbudItem, settSomLest: true }
            : tilbudItem
        )
      )

      try {
        await markerSomLest(nesteTilbud.id)
      } catch (error) {
        console.error('Feil ved markering som lest:', error)
        void hentTilbud()
      }
    },
    [hentTilbud]
  )

  useEffect(() => {
    const kandidater = tilbud
      .filter(t => t.status === 'godkjent' || t.status === 'justering')
      .slice(0, 12)

    for (const t of kandidater) {
      void prefetchTilbudHendelser(t.id)
    }
  }, [tilbud])

  useEffect(() => {
    if (!firmaId) return

    const kanal = supabase
      .channel('tilbud-endringer')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tilbud',
          filter: `firma_id=eq.${firmaId}`,
        },
        payload => {
          const nyRad = payload.new as { id?: string; status?: string } | null
          const gammelRad = payload.old as { status?: string } | null
          const nyStatus = nyRad?.status

          if (
            (nyStatus === 'godkjent' || nyStatus === 'justering') &&
            gammelRad?.status !== nyStatus
          ) {
            const tilbudId = nyRad?.id

            if (!tilbudId || !tilbudRef.current.some(item => item.id === tilbudId)) {
              void hentTilbud()
              return
            }

            setTilbud(prev =>
              prev.map(item =>
                item.id === tilbudId
                  ? {
                      ...item,
                      status: nyStatus as Forespørsel['status'],
                      settSomLest: false,
                    }
                  : item
              )
            )

            setValgtTilbud(prev =>
              prev?.id === tilbudId
                ? {
                    ...prev,
                    status: nyStatus as Forespørsel['status'],
                    settSomLest: false,
                  }
                : prev
            )
            return
          }

          void hentTilbud()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(kanal)
    }
  }, [firmaId, hentTilbud])

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
    ({ item }: { item: SwipeListItem }) => {
      const erFørsteKort = item.rowKey === førsteKortKey

      return (
        <Animated.View
          style={[
            styles.rowFront,
            erFørsteKort
              ? {
                  transform: [{ translateX: nudgeAnim }],
                }
              : null,
          ]}
        >
          <TilbudKort tilbud={item} onPress={t => void åpneTilbud(t)} />
        </Animated.View>
      )
    },
    [førsteKortKey, nudgeAnim, åpneTilbud]
  )

  const håndterRowDidOpen = useCallback(
    async (
      rowKey: string,
      rowMap: Record<string, { closeRow?: () => void }>,
      toValue: number
    ) => {
      const swipetTilbud = swipeData.find(item => item.rowKey === rowKey)
      if (!swipetTilbud) {
        return
      }

      rowMap[rowKey]?.closeRow?.()
      if (toValue < 0) {
        await giSwipeHaptikk()
        await håndterSlettTilbud(swipetTilbud)
      }
    },
    [håndterSlettTilbud, swipeData]
  )

  const listHeader = useMemo(
    () => (
      <View style={styles.filterSection}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summary}>{oppsummering}</Text>
        </View>

        <View style={styles.filterRow}>
          {FILTRE.map(filter => {
            const badgeCount =
              filter === 'Justering'
                ? antallJustering
                : filter === 'Godkjent'
                  ? antallGodkjent
                  : undefined

            return (
              <View key={filter} style={styles.filterPillWrap}>
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    aktivFilter === filter ? styles.filterPillActive : styles.filterPillInactive,
                  ]}
                  onPress={() => setAktivFilter(filter)}
                  activeOpacity={0.86}
                >
                  <Text
                    style={[
                      styles.filterText,
                      aktivFilter === filter ? styles.filterTextActive : styles.filterTextInactive,
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
                {badgeCount !== undefined ? <NotificationBadge count={badgeCount} /> : null}
              </View>
            )
          })}
        </View>
      </View>
    ),
    [aktivFilter, antallGodkjent, antallJustering, oppsummering]
  )

  const listFooter = useMemo(
    () =>
      !laster && filtrert.length > 0 ? (
        <Text style={styles.footer}>
          Viser {filtrert.length} av {tilbudListe.length} tilbud
        </Text>
      ) : (
        <View style={styles.footerSpacer} />
      ),
    [filtrert.length, laster, tilbudListe.length]
  )

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <AppBackground />
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

        <TopBar />

        <View style={[styles.titleSection, { paddingTop: insets.top + 58 }]}>
          <Text style={styles.title}>Sendte tilbud</Text>
        </View>
      </View>

      <Toast
        melding={toast.melding}
        type={toast.type}
        synlig={toast.synlig}
        onHide={() => setToast(prev => ({ ...prev, synlig: false }))}
      />

      {laster ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#111111" style={styles.spinner} size="large" />
        </View>
      ) : (
        <SwipeListView
          data={swipeData}
          keyExtractor={item => item.rowKey}
          renderItem={renderItem}
          renderHiddenItem={renderHiddenItem}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={<TomTilstand />}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: insets.top + 96,
              paddingBottom: getFloatingTabBarPadding(insets.bottom),
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refresher}
              onRefresh={async () => {
                setRefresher(true)
                await hentTilbud()
                setRefresher(false)
              }}
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
            hentTilbud()
            visToast(`Tilbud sendt til ${navn}`)
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

      <TilbudDetaljerModal
        tilbud={valgtTilbud}
        visible={valgtTilbud !== null}
        onClose={() => setValgtTilbud(null)}
        onOppdatert={navn => {
          hentTilbud()
          setValgtTilbud(null)
          visToast(`Oppdatert tilbud sendt til ${navn}`)
        }}
        onUtfort={navn => {
          hentTilbud()
          setValgtTilbud(null)
          visToast(`Jobb markert som utført (${navn})`)
        }}
      />
    </SafeAreaView>
  )
}

function TomTilstand() {
  return (
    <View style={styles.tomWrapper}>
      <Ionicons name="send-outline" size={58} color="#111111" style={styles.tomIcon} />
      <Text style={styles.tomTittel}>Ingen tilbud sendt ennå</Text>
      <Text style={styles.tomTekst}>Tilbud du sender dukker opp her.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F6',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerFrost: {
    ...StyleSheet.absoluteFillObject,
  },
  headerTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(238,241,246,0.1)',
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: 'DMSans_700Bold',
    color: '#111111',
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
    marginBottom: 16,
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
  filterSection: {
    marginBottom: 16,
  },
  summaryBlock: {
    marginTop: -4,
    paddingLeft: 2,
    paddingBottom: 0,
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
  footer: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
    textAlign: 'center',
  },
  footerSpacer: {
    height: 8,
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
