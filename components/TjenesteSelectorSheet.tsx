import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { ikonForTjeneste } from '../lib/tjenesteIkon'

const SHEET_OPEN_MS = 280
const SHEET_CLOSE_MS = 220
const EASE_OPEN = Easing.bezier(0.25, 0.1, 0.25, 1)
const EASE_CLOSE = Easing.bezier(0.4, 0, 0.2, 1)

/** Valgfrie korte undertekster per eksakt tjenestenavn (tom = ingen undertekst). */
const KORTE_HINT: Partial<Record<string, string>> = {
  Rørlegging: 'Våtrom, rør og sanitær',
  Elektro: 'Anlegg og installasjon',
  Snekker: 'Trearbeid og montering',
  Maling: 'Overflater innendørs/utendørs',
  Taklegging: 'Tekking og beslag',
  Parkettlegging: 'Gulv og listverk',
  Annet: 'Tilpasset oppdrag',
}

const TJENESTE_RAD_HØYDE_APPROKS = 82

export interface Props {
  visible: boolean
  onClose: () => void
  jobbtyper: string[]
  valgtTjeneste: string | null
  onSelect: (tjeneste: string) => void
  tjenesteBeskrivelser?: Partial<Record<string, string>>
  /**
   * Opptaksdemo: etter `utsettMs` rulles listen til rad og `håndterVelg` kjøres (samme som trykk).
   */
  opptaksDemoAutoVelg?: {
    tjeneste: string
    utsettMs: number
    pauseEtterScrollMs?: number
    /** Synlig markering på rad før lukk (ms). */
    highlightFørLukkMs?: number
  } | null
  onOpptaksDemoAutoVelgFerdig?: () => void
}

type RadProps = {
  item: string
  erValgt: boolean
  undertekst?: string
  onVelg: (item: string) => void
  opptaksHighlight?: boolean
}

const TjenesteListeRad = memo(function TjenesteListeRad({
  item,
  erValgt,
  undertekst,
  onVelg,
  opptaksHighlight = false,
}: RadProps) {
  return (
    <Pressable
      onPress={() => onVelg(item)}
      style={({ pressed }) => [
        styles.sheetRad,
        erValgt && styles.sheetRadValgt,
        opptaksHighlight && styles.sheetRadOpptaksHighlight,
        pressed && styles.sheetRadPressed,
      ]}
    >
      <View style={styles.sheetRadVenstre}>
        <View style={styles.sheetIkonBoks}>
          <Ionicons
            name={ikonForTjeneste(item)}
            size={22}
            color="rgba(74,222,128,0.92)"
          />
        </View>
        <View style={styles.sheetTekstKolonne}>
          <Text style={styles.sheetRadTittel} numberOfLines={2}>
            {item}
          </Text>
          {undertekst ? (
            <Text style={styles.sheetRadUndertekst} numberOfLines={2}>
              {undertekst}
            </Text>
          ) : null}
        </View>
      </View>
      {erValgt ? (
        <Ionicons name="checkmark-circle" size={22} color="#4ADE80" />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.28)" />
      )}
    </Pressable>
  )
})

export function TjenesteSelectorSheet({
  visible,
  onClose,
  jobbtyper,
  valgtTjeneste,
  onSelect,
  tjenesteBeskrivelser,
  opptaksDemoAutoVelg = null,
  onOpptaksDemoAutoVelgFerdig,
}: Props) {
  const listeScrollRef = useRef<ScrollView>(null)
  const [opptaksRadHighlight, setOpptaksRadHighlight] = useState<string | null>(null)
  const { height: windowHeight } = useWindowDimensions()
  const sheetSlidePixels = Math.min(
    560,
    Math.max(300, Math.round(windowHeight * 0.52)),
  )

  const progress = useSharedValue(0)
  const slideDistance = useSharedValue(sheetSlidePixels)
  /** 0 = idle, 1 = close animation running — useSharedValue so worklets never see a React ref. */
  const lukkerPågår = useSharedValue(0)

  useEffect(() => {
    slideDistance.value = sheetSlidePixels
  }, [sheetSlidePixels, slideDistance])

  useEffect(() => {
    if (visible) {
      lukkerPågår.value = 0
      cancelAnimation(progress)
      progress.value = 0
      progress.value = withTiming(1, {
        duration: SHEET_OPEN_MS,
        easing: EASE_OPEN,
      })
    } else {
      cancelAnimation(progress)
      progress.value = 0
    }
  }, [visible, lukkerPågår, progress])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }))

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * slideDistance.value }],
  }))

  const fullførLukk = useCallback(
    (valgtItem?: string) => {
      lukkerPågår.value = 0
      if (valgtItem !== undefined) {
        onSelect(valgtItem)
      }
      onClose()
    },
    [lukkerPågår, onClose, onSelect],
  )

  const nullstillLukkerFlag = useCallback(() => {
    lukkerPågår.value = 0
  }, [lukkerPågår])

  const startLukkAnimasjon = useCallback(
    (valgtItem?: string) => {
      if (!visible || lukkerPågår.value === 1) return
      lukkerPågår.value = 1
      cancelAnimation(progress)
      progress.value = withTiming(
        0,
        {
          duration: SHEET_CLOSE_MS,
          easing: EASE_CLOSE,
        },
        (finished) => {
          if (finished) {
            runOnJS(fullførLukk)(valgtItem)
          } else {
            runOnJS(nullstillLukkerFlag)()
          }
        },
      )
    },
    [visible, lukkerPågår, progress, fullførLukk, nullstillLukkerFlag],
  )

  const lukkSheet = useCallback(() => {
    startLukkAnimasjon(undefined)
  }, [startLukkAnimasjon])

  const håndterVelg = useCallback(
    (item: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      startLukkAnimasjon(item)
    },
    [startLukkAnimasjon],
  )

  useEffect(() => {
    if (!visible) {
      setOpptaksRadHighlight(null)
    }
  }, [visible])

  useEffect(() => {
    if (!visible || !opptaksDemoAutoVelg) return
    const {
      tjeneste,
      utsettMs,
      pauseEtterScrollMs = 700,
      highlightFørLukkMs = 400,
    } = opptaksDemoAutoVelg
    const idx = jobbtyper.indexOf(tjeneste)
    let avbrutt = false
    let innerId: ReturnType<typeof setTimeout> | undefined
    let highlightId: ReturnType<typeof setTimeout> | undefined
    const outerId = setTimeout(() => {
      if (avbrutt) return
      if (idx >= 0) {
        const y = Math.max(0, idx * TJENESTE_RAD_HØYDE_APPROKS - 48)
        listeScrollRef.current?.scrollTo({ y, animated: true })
      }
      innerId = setTimeout(() => {
        if (avbrutt) return
        setOpptaksRadHighlight(tjeneste)
        highlightId = setTimeout(() => {
          if (avbrutt) return
          setOpptaksRadHighlight(null)
          onOpptaksDemoAutoVelgFerdig?.()
          håndterVelg(tjeneste)
        }, highlightFørLukkMs)
      }, pauseEtterScrollMs)
    }, utsettMs)
    return () => {
      avbrutt = true
      clearTimeout(outerId)
      if (innerId !== undefined) clearTimeout(innerId)
      if (highlightId !== undefined) clearTimeout(highlightId)
    }
  }, [visible, opptaksDemoAutoVelg, jobbtyper, håndterVelg, onOpptaksDemoAutoVelgFerdig])

  const undertekster = useMemo(() => {
    const m: Record<string, string | undefined> = {}
    for (const j of jobbtyper) {
      const e = tjenesteBeskrivelser?.[j]?.trim()
      m[j] = e || KORTE_HINT[j]
    }
    return m
  }, [jobbtyper, tjenesteBeskrivelser])

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      hardwareAccelerated
      onRequestClose={lukkSheet}
    >
      <View style={styles.sheetRoot}>
        <Pressable
          style={styles.sheetBackdropTouchable}
          onPress={lukkSheet}
          accessibilityRole="button"
          accessibilityLabel="Lukk"
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.sheetBackdropDim, backdropStyle]}
          />
        </Pressable>
        <Animated.View style={[styles.sheetPanel, panelStyle]} collapsable={false}>
          <View style={styles.sheetGrab}>
            <View style={styles.sheetGrabBar} />
          </View>
          <Text style={styles.sheetTittel}>Velg tjeneste</Text>
          <ScrollView
            ref={listeScrollRef}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={jobbtyper.length > 8}
            bounces={jobbtyper.length > 8}
            removeClippedSubviews={jobbtyper.length > 10}
          >
            {jobbtyper.map((item, index) => (
              <TjenesteListeRad
                key={`${item}-${index}`}
                item={item}
                erValgt={valgtTjeneste !== null && item === valgtTjeneste}
                undertekst={undertekster[item]}
                onVelg={håndterVelg}
                opptaksHighlight={opptaksRadHighlight === item}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetBackdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetPanel: {
    backgroundColor: '#121214',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 28,
    maxHeight: '72%',
  },
  sheetGrab: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetGrabBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  sheetTittel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 12,
    letterSpacing: -0.2,
  },
  sheetRad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingRight: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sheetRadValgt: {
    backgroundColor: 'rgba(74,222,128,0.08)',
  },
  sheetRadPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sheetRadOpptaksHighlight: {
    backgroundColor: 'rgba(74,222,128,0.2)',
    borderLeftWidth: 4,
    borderLeftColor: '#4ADE80',
    paddingLeft: 12,
  },
  sheetRadVenstre: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 10,
  },
  sheetIkonBoks: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTekstKolonne: {
    flex: 1,
    minWidth: 0,
  },
  sheetRadTittel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    lineHeight: 21,
    color: '#F3F4F6',
  },
  sheetRadUndertekst: {
    marginTop: 3,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.45)',
  },
})
