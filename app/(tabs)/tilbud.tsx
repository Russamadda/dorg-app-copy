import { useEffect, useState, useCallback, useMemo, useRef, type MutableRefObject } from 'react'
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
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { SwipeListView } from 'react-native-swipe-list-view'
import { supabase, hentSendteTilbud, hentFirma, oppdaterTilbudStatus, slettTilbud } from '../../lib/supabase'
import { fabEmitter } from '../../lib/fabEmitter'
import { Colors } from '../../constants/colors'
import type { Forespørsel, Firma } from '../../types'
import TopBar from '../../components/TopBar'
import TilbudKort from '../../components/TilbudKort'
import NyttTilbudModal from '../../components/NyttTilbudModal'
import TilbudDetaljerModal from '../../components/TilbudDetaljerModal'
import { Toast } from '../../components/Toast'
import { getFloatingTabBarPadding } from '../../components/FloatingTabBar'

type FilterLabel = 'Sendt' | 'Godkjent' | 'Avslått' | 'Alle'
type EndeligStatus = 'godkjent' | 'avslatt'

type RowController = {
  manuallySwipeRow?: (toValue: number, onAnimationEnd?: () => void) => void
  closeRow?: () => void
}

type RowMap = Record<string, RowController>

type SwipeListItem = Forespørsel & {
  rowKey: string
  disableRightSwipe?: boolean
  leftOpenValue?: number
  stopLeftSwipe?: number
  rightOpenValue?: number
  stopRightSwipe?: number
}

const SWIPE_OPEN_VALUE = 88
const DELETE_OPEN_VALUE = -84
const PREVIEW_OPEN_VALUE = 34

const SWIPE_TO_OPEN_PERCENT = 54
const SWIPE_TO_CLOSE_PERCENT = 42
const DIRECTION_THRESHOLD = 5

const PREVIEW_DELAY_MS = 650
const PREVIEW_RETURN_DELAY_MS = 220
const PREVIEW_SECOND_SWIPE_DELAY_MS = 520
const PREVIEW_RETRY_MS = 120
const PREVIEW_MAX_RETRIES = 8

const USER_INTERACTION_MIN_DISTANCE = 8
const HAPTIC_RESET_DISTANCE = 4

const FILTRE: FilterLabel[] = ['Sendt', 'Godkjent', 'Avslått', 'Alle']

const filterStatuser: Record<FilterLabel, string | string[] | null> = {
  Sendt: ['sendt', 'avventer', 'paminnelse', 'siste'],
  Godkjent: 'godkjent',
  Avslått: 'avslatt',
  Alle: null,
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
    status === 'godkjent' || status === 'avslatt'

  const aAvsluttet = erAvsluttet(a.status)
  const bAvsluttet = erAvsluttet(b.status)

  if (aAvsluttet !== bAvsluttet) {
    return aAvsluttet ? 1 : -1
  }

  return new Date(b.opprettetDato).getTime() - new Date(a.opprettetDato).getTime()
}

function animateListChange() {
  LayoutAnimation.configureNext(listAnimationConfig)
}

function resetHaptikkForRad(
  ref: MutableRefObject<Record<string, boolean>>,
  rowKey: string
) {
  ref.current[rowKey] = false
}

function getCommitThresholdForItem(item: SwipeListItem, value: number) {
  const openValue =
    value > 0
      ? Math.abs(item.leftOpenValue ?? SWIPE_OPEN_VALUE)
      : Math.abs(item.rightOpenValue ?? DELETE_OPEN_VALUE)

  return Math.round(openValue * (SWIPE_TO_OPEN_PERCENT / 100))
}

async function giSwipeHaptikk(type: 'godkjent' | 'avslatt' | 'slett') {
  try {
    if (type === 'godkjent') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      return
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  } catch {
    // Haptics skal aldri blokkere hovedflyten.
  }
}

export default function TilbudScreen() {
  const insets = useSafeAreaInsets()

  const rowMapRef = useRef<RowMap>({})
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const previewAktivRef = useRef(false)
  const previewRowKeyRef = useRef<string | null>(null)
  const brukerHarInteragertRef = useRef(false)
  const hapticTriggetRef = useRef<Record<string, boolean>>({})

  const [tilbud, setTilbud] = useState<Forespørsel[]>([])
  const [skjulteTilbudIds, setSkjulteTilbudIds] = useState<string[]>([])
  const [firma, setFirma] = useState<Firma | null>(null)
  const [laster, setLaster] = useState(true)
  const [refresher, setRefresher] = useState(false)
  const [aktivFilter, setAktivFilter] = useState<FilterLabel>('Sendt')
  const [previewSekvens, setPreviewSekvens] = useState(0)
  const [visNyttTilbud, setVisNyttTilbud] = useState(false)
  const [valgtTilbud, setValgtTilbud] = useState<Forespørsel | null>(null)
  const [toast, setToast] = useState<{
    synlig: boolean
    melding: string
    type: 'suksess' | 'feil'
  }>({ synlig: false, melding: '', type: 'suksess' })

  useFocusEffect(
    useCallback(() => {
      return fabEmitter.on(() => setVisNyttTilbud(true))
    }, [])
  )

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true)
    }
  }, [])

  const clearPreviewTimers = useCallback(() => {
    previewTimersRef.current.forEach(timer => clearTimeout(timer))
    previewTimersRef.current = []
  }, [])

  const stoppPreview = useCallback((closeRow = false) => {
    clearPreviewTimers()

    const previewKey = previewRowKeyRef.current
    if (closeRow && previewKey) {
      rowMapRef.current[previewKey]?.closeRow?.()
      resetHaptikkForRad(hapticTriggetRef, previewKey)
    }

    previewAktivRef.current = false
    previewRowKeyRef.current = null
  }, [clearPreviewTimers])

  const markerBrukerInteraksjon = useCallback(() => {
    brukerHarInteragertRef.current = true

    if (previewAktivRef.current || previewTimersRef.current.length > 0) {
      stoppPreview(true)
    }
  }, [stoppPreview])

  useFocusEffect(
    useCallback(() => {
      brukerHarInteragertRef.current = false
      setPreviewSekvens(current => current + 1)

      return () => {
        stoppPreview(true)
      }
    }, [stoppPreview])
  )

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }

      stoppPreview(true)
      hapticTriggetRef.current = {}
    }
  }, [stoppPreview])

  const visToast = useCallback((melding: string, type: 'suksess' | 'feil' = 'suksess') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }

    setToast({ synlig: true, melding, type })
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, synlig: false }))
    }, 2700)
  }, [])

  const hentTilbud = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setTilbud([])
        return
      }

      const firmaData = await hentFirma(session.user.id)
      setFirma(firmaData)

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

  useEffect(() => {
    hentTilbud()
  }, [hentTilbud])

  const håndterStatusOppdatering = useCallback(
    async (swipetTilbud: Forespørsel, nyStatus: EndeligStatus) => {
      const forrigeTilbud = tilbud

      animateListChange()
      setTilbud(current =>
        current.map(item =>
          item.id === swipetTilbud.id
            ? {
                ...item,
                status: nyStatus,
              }
            : item
        )
      )

      try {
        await oppdaterTilbudStatus(swipetTilbud.id, nyStatus)

        visToast(
          nyStatus === 'godkjent'
            ? 'Tilbud markert som godkjent'
            : 'Tilbud markert som avslått'
        )
      } catch (err) {
        console.error(err)
        animateListChange()
        setTilbud(forrigeTilbud)
        visToast('Kunne ikke oppdatere status', 'feil')
      }
    },
    [tilbud, visToast]
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
    const aktivtFilter = filterStatuser[aktivFilter]

    if (!aktivtFilter) {
      return [...alleTilbud].sort(sorterTilbud)
    }

    if (Array.isArray(aktivtFilter)) {
      return alleTilbud.filter(item => aktivtFilter.includes(item.status)).sort(sorterTilbud)
    }

    return alleTilbud.filter(item => item.status === aktivtFilter).sort(sorterTilbud)
  }, [aktivFilter, skjulteTilbudIds, tilbud])

  const tilbudListe = useMemo(
    () => tilbud.filter(item => !skjulteTilbudIds.includes(item.id)).sort(sorterTilbud),
    [skjulteTilbudIds, tilbud]
  )

  const aktivVerdi = useMemo(
    () =>
      tilbudListe
        .filter(t => t.status !== 'godkjent' && t.status !== 'avslatt')
        .reduce((sum, t) => sum + t.prisEksMva, 0),
    [tilbudListe]
  )

  const aktivtAntall = useMemo(
    () => tilbudListe.filter(t => t.status !== 'godkjent' && t.status !== 'avslatt').length,
    [tilbudListe]
  )

  const oppsummering = `${aktivtAntall} aktive tilbud · kr ${aktivVerdi.toLocaleString('nb-NO')} totalt`

  const swipeData = useMemo<SwipeListItem[]>(
    () =>
      filtrert.map(item => {
        const erLøst = item.status === 'godkjent' || item.status === 'avslatt'

        return {
          ...item,
          rowKey: item.id,
          disableRightSwipe: erLøst,
          leftOpenValue: erLøst ? 0 : SWIPE_OPEN_VALUE,
          stopLeftSwipe: erLøst ? 0 : SWIPE_OPEN_VALUE,
          rightOpenValue: DELETE_OPEN_VALUE,
          stopRightSwipe: DELETE_OPEN_VALUE,
        }
      }),
    [filtrert]
  )

  useEffect(() => {
    if (previewSekvens === 0 || laster) {
      return
    }

    stoppPreview(false)

    const previewItem = swipeData[0] ?? null
    if (!previewItem) {
      return
    }

    if (brukerHarInteragertRef.current) {
      return
    }

    const kjørPreview = (forsøk = 0) => {
      if (brukerHarInteragertRef.current) {
        stoppPreview(true)
        return
      }

      const row = rowMapRef.current[previewItem.rowKey]
      if (!row?.manuallySwipeRow) {
        if (forsøk < PREVIEW_MAX_RETRIES) {
          previewTimersRef.current.push(setTimeout(() => kjørPreview(forsøk + 1), PREVIEW_RETRY_MS))
        }
        return
      }

      previewAktivRef.current = true
      previewRowKeyRef.current = previewItem.rowKey
      resetHaptikkForRad(hapticTriggetRef, previewItem.rowKey)

      const erLøst = previewItem.status === 'godkjent' || previewItem.status === 'avslatt'

      if (erLøst) {
        row.manuallySwipeRow(-PREVIEW_OPEN_VALUE, () => {
          previewTimersRef.current.push(
            setTimeout(() => {
              row.closeRow?.()
              resetHaptikkForRad(hapticTriggetRef, previewItem.rowKey)
              previewAktivRef.current = false
              previewRowKeyRef.current = null
            }, PREVIEW_RETURN_DELAY_MS)
          )
        })
        return
      }

      row.manuallySwipeRow(-PREVIEW_OPEN_VALUE, () => {
        previewTimersRef.current.push(
          setTimeout(() => {
            row.closeRow?.()
            resetHaptikkForRad(hapticTriggetRef, previewItem.rowKey)
          }, PREVIEW_RETURN_DELAY_MS)
        )

        previewTimersRef.current.push(
          setTimeout(() => {
            if (brukerHarInteragertRef.current) {
              stoppPreview(true)
              return
            }

            const sameRow = rowMapRef.current[previewItem.rowKey]
            if (!sameRow?.manuallySwipeRow) {
              previewAktivRef.current = false
              previewRowKeyRef.current = null
              return
            }

            sameRow.manuallySwipeRow(PREVIEW_OPEN_VALUE, () => {
              previewTimersRef.current.push(
                setTimeout(() => {
                  sameRow.closeRow?.()
                  resetHaptikkForRad(hapticTriggetRef, previewItem.rowKey)
                  previewAktivRef.current = false
                  previewRowKeyRef.current = null
                }, PREVIEW_RETURN_DELAY_MS)
              )
            })
          }, PREVIEW_SECOND_SWIPE_DELAY_MS)
        )
      })
    }

    previewTimersRef.current.push(setTimeout(() => kjørPreview(), PREVIEW_DELAY_MS))

    return () => {
      stoppPreview(false)
    }
  }, [laster, previewSekvens, stoppPreview])

  const renderHiddenItem = useCallback(({ item }: { item: SwipeListItem }) => {
    const erLøst = item.status === 'godkjent' || item.status === 'avslatt'

    if (erLøst) {
      return (
        <View style={styles.hiddenRow}>
          <View style={[styles.hiddenSide, styles.hiddenNeutral]} />

          <View style={[styles.hiddenSide, styles.hiddenDelete]}>
            <View style={styles.hiddenActionContent}>
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              <Text style={styles.hiddenActionText}>Slett</Text>
            </View>
          </View>
        </View>
      )
    }

    return (
      <View style={styles.hiddenRow}>
        <View style={[styles.hiddenSide, styles.hiddenLeft]}>
          <View style={styles.hiddenActionContent}>
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.hiddenActionText}>Godkjent</Text>
          </View>
        </View>

        <View style={[styles.hiddenSide, styles.hiddenRight]}>
          <View style={styles.hiddenActionContent}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
            <Text style={styles.hiddenActionText}>Avslått</Text>
          </View>
        </View>
      </View>
    )
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: SwipeListItem }, rowMap: RowMap) => {
      rowMapRef.current = rowMap

      return (
        <View style={styles.rowFront}>
          <TilbudKort tilbud={item} onPress={t => setValgtTilbud(t)} />
        </View>
      )
    },
    []
  )

  const håndterRowDidOpen = useCallback(
    async (
      rowKey: string,
      rowMap: Record<string, { closeRow?: () => void }>,
      toValue: number
    ) => {
      if (previewAktivRef.current && previewRowKeyRef.current === rowKey) {
        rowMap[rowKey]?.closeRow?.()
        return
      }

      const swipetTilbud = swipeData.find(item => item.rowKey === rowKey)
      if (!swipetTilbud) {
        return
      }

      rowMap[rowKey]?.closeRow?.()

      const erLøst = swipetTilbud.status === 'godkjent' || swipetTilbud.status === 'avslatt'

      if (erLøst) {
        await håndterSlettTilbud(swipetTilbud)
        return
      }

      const nyStatus: EndeligStatus = toValue > 0 ? 'godkjent' : 'avslatt'
      await håndterStatusOppdatering(swipetTilbud, nyStatus)
    },
    [håndterSlettTilbud, håndterStatusOppdatering, swipeData]
  )

  const håndterSwipeValueChange = useCallback(
    ({
      key,
      value,
    }: {
      key: string
      value: number
      direction: 'left' | 'right'
      isOpen: boolean
    }) => {
      const absValue = Math.abs(value)
      const erPreviewEvent = previewAktivRef.current && previewRowKeyRef.current === key

      if (!erPreviewEvent && absValue >= USER_INTERACTION_MIN_DISTANCE) {
        markerBrukerInteraksjon()
      }

      if (erPreviewEvent) {
        return
      }

      const swipetTilbud = swipeData.find(item => item.rowKey === key)
      if (!swipetTilbud) {
        return
      }

      const commitThreshold = getCommitThresholdForItem(swipetTilbud, value)
      const terskelNådd = absValue >= commitThreshold

      if (!terskelNådd) {
        if (absValue < HAPTIC_RESET_DISTANCE) {
          resetHaptikkForRad(hapticTriggetRef, key)
        }
        return
      }

      if (hapticTriggetRef.current[key]) {
        return
      }

      hapticTriggetRef.current[key] = true

      const erLøst = swipetTilbud.status === 'godkjent' || swipetTilbud.status === 'avslatt'

      if (erLøst) {
        void giSwipeHaptikk('slett')
        return
      }

      void giSwipeHaptikk(value > 0 ? 'godkjent' : 'avslatt')
    },
    [markerBrukerInteraksjon, swipeData]
  )

  const håndterRowClose = useCallback((rowKey: string) => {
    resetHaptikkForRad(hapticTriggetRef, rowKey)

    if (previewRowKeyRef.current === rowKey && !previewAktivRef.current) {
      previewRowKeyRef.current = null
    }
  }, [])

  const listHeader = (
    <View>
      <Text style={styles.title}>Sendte tilbud</Text>
      <Text style={styles.summary}>{oppsummering}</Text>

      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          {FILTRE.map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPill, aktivFilter === filter && styles.filterPillAktiv]}
              onPress={() => {
                markerBrukerInteraksjon()
                setAktivFilter(filter)
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterTekst, aktivFilter === filter && styles.filterTekstAktiv]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  )

  const listFooter =
    !laster && filtrert.length > 0 ? (
      <Text style={styles.footer}>
        Viser {filtrert.length} av {tilbud.length} tilbud
      </Text>
    ) : (
      <View style={styles.footerSpacer} />
    )

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <TopBar />
      <Toast melding={toast.melding} type={toast.type} synlig={toast.synlig} />

      {laster ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.title}>Sendte tilbud</Text>
          <Text style={styles.summary}>{oppsummering}</Text>
          <ActivityIndicator color={Colors.accent} style={styles.spinner} size="large" />
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
              paddingBottom: getFloatingTabBarPadding(insets.bottom),
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refresher}
              onRefresh={async () => {
                markerBrukerInteraksjon()
                setRefresher(true)
                await hentTilbud()
                setRefresher(false)
              }}
              tintColor="#4CAF82"
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
          disableRightSwipe={false}
          recalculateHiddenLayout
          onScrollBeginDrag={markerBrukerInteraksjon}
          onRowDidOpen={håndterRowDidOpen}
          onRowClose={håndterRowClose}
          onRowDidClose={håndterRowClose}
          onSwipeValueChange={håndterSwipeValueChange}
          showsVerticalScrollIndicator={false}
          useFlatList
          swipeRowStyle={styles.swipeRow}
        />
      )}

      <NyttTilbudModal
        visible={visNyttTilbud}
        onClose={() => setVisNyttTilbud(false)}
        firma={firma}
        onSendt={navn => {
          hentTilbud()
          visToast(`Tilbud sendt til ${navn}`)
        }}
      />

      <TilbudDetaljerModal
        tilbud={valgtTilbud}
        visible={valgtTilbud !== null}
        onClose={() => setValgtTilbud(null)}
        onOppdatert={() => {
          hentTilbud()
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  loadingWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },

  listContent: {
    paddingHorizontal: 16,
  },

  swipeRow: {
    marginBottom: 8,
    overflow: 'visible',
  },

  rowFront: {
    borderRadius: 14,
  },

  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: Colors.primary,
    marginTop: 16,
    marginBottom: 8,
  },

  summary: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#9CA3AF',
    marginBottom: 16,
  },

  filterSection: {
    marginBottom: 16,
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

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

  filterPillAktiv: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  filterTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },

  filterTekstAktiv: {
    color: '#fff',
  },

  hiddenRow: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
  },

  hiddenNeutral: {
    backgroundColor: Colors.surface,
  },

  hiddenSide: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  hiddenLeft: {
    backgroundColor: '#16A34A',
    alignItems: 'flex-start',
    paddingLeft: 12,
  },

  hiddenRight: {
    backgroundColor: '#DC2626',
    alignItems: 'flex-end',
    paddingRight: 12,
  },

  hiddenDelete: {
    backgroundColor: '#DC2626',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 12,
  },

  hiddenActionContent: {
    minWidth: 62,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  hiddenActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    textAlign: 'center',
  },

  spinner: {
    marginTop: 60,
  },

  footer: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },

  footerSpacer: {
    height: 8,
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
