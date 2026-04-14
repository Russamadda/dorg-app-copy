import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { beregnTilbudTotalInklMva } from '../lib/tilbudPris'
import type { Forespørsel } from '../types'
import { getTilbudStatusPresentasjon, type TilbudStatusMeta } from '../utils/tilbudStatus'

/** Én statuslinje uten å gjenta badge-prefiks som allerede ligger i subline (f.eks. «Sendt» + «Sendt i dag»). */
function enLinjeStatusTekst(p: TilbudStatusMeta): string {
  if (!p.subline?.trim()) return p.badge
  const b = p.badge.trim()
  const s = p.subline.trim()
  if (s.toLowerCase().startsWith(b.toLowerCase())) {
    return s
  }
  return `${b} · ${s}`
}
import { tilbudTrengerHandlingGlow } from '../lib/tilbudNotifLogikk'

interface TilbudKortProps {
  tilbud: Forespørsel
  onPress: (tilbud: Forespørsel) => void
  /** Opptaksdemo: kort «trykkes» visuelt før detaljer åpnes. */
  opptaksDemoTrykkPulse?: boolean
}

function formaterKortDato(tilbud: Forespørsel) {
  const dato =
    tilbud.sistSendtDato ??
    tilbud.sendtDato ??
    tilbud.opprettetDato

  return new Date(dato).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
  })
}

function TilbudKortInner({ tilbud, onPress, opptaksDemoTrykkPulse = false }: TilbudKortProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current
  const demoTrykkScale = useRef(new Animated.Value(1)).current
  const totalInklMva = beregnTilbudTotalInklMva(tilbud)
  const tjenestetittel = tilbud.kortBeskrivelse ?? tilbud.jobbType ?? 'Tilbud'
  const statusMeta = getTilbudStatusPresentasjon(tilbud)
  const datoTekst = formaterKortDato(tilbud)
  const visUlestIndikator = tilbudTrengerHandlingGlow(tilbud)
  const ulestFarge = tilbud.status === 'godkjent' ? '#16A34A' : '#2563EB'
  const outlineOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.24, 0.7],
  })

  useEffect(() => {
    if (!visUlestIndikator) {
      pulseAnim.stopAnimation()
      pulseAnim.setValue(0)
      return
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1050,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1050,
          useNativeDriver: true,
        }),
      ])
    )

    loop.start()

    return () => {
      loop.stop()
      pulseAnim.setValue(0)
    }
  }, [pulseAnim, visUlestIndikator])

  useEffect(() => {
    if (!opptaksDemoTrykkPulse) return
    demoTrykkScale.setValue(1)
    Animated.sequence([
      Animated.timing(demoTrykkScale, {
        toValue: 0.94,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.spring(demoTrykkScale, {
        toValue: 1,
        friction: 7,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start()
  }, [opptaksDemoTrykkPulse, demoTrykkScale])

  return (
    <Animated.View style={[styles.pressableCard, { transform: [{ scale: demoTrykkScale }] }]}>
    <Pressable
      onPress={() => onPress(tilbud)}
      style={styles.pressableCardInner}
    >
      <View style={styles.card}>
        {visUlestIndikator ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.unreadOutline,
              {
                borderColor: ulestFarge,
                opacity: outlineOpacity,
              },
            ]}
          />
        ) : null}

        <View style={styles.cardChevron}>
          <Ionicons name="chevron-forward" size={18} color="#888888" />
        </View>

        <View style={styles.topRow}>
          <View style={styles.topMetaText}>
            <Text style={styles.navn} numberOfLines={1}>
              {tilbud.kundeNavn}
            </Text>
            {tilbud.adresse ? (
              <Text style={styles.adresse} numberOfLines={1}>
                {tilbud.adresse}
              </Text>
            ) : null}
          </View>

          <View style={styles.dateGroup}>
            <Text style={styles.dateText}>{datoTekst}</Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.mainContent}>
            <View style={styles.descriptionWrap}>
              <Text
                style={styles.tjeneste}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.62}
              >
                {tjenestetittel}
              </Text>
            </View>

            <View style={styles.footerRow}>
              <View style={styles.metaRow}>
                {statusMeta.dotCheckmark ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={statusMeta.dotColor}
                    style={styles.statusIcon}
                  />
                ) : (
                  <View style={[styles.dot, { backgroundColor: statusMeta.dotColor }]} />
                )}

                <Text style={[styles.metaText, { color: statusMeta.color }]} numberOfLines={2}>
                  {enLinjeStatusTekst(statusMeta)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sideColumn}>
            <View style={styles.priceRow}>
              <Text style={styles.pris} numberOfLines={1}>
                kr {totalInklMva.toLocaleString('nb-NO')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
    </Animated.View>
  )
}

function erLikeTilbudKortProps(prev: TilbudKortProps, next: TilbudKortProps): boolean {
  if (prev.onPress !== next.onPress) {
    return false
  }
  if (prev.opptaksDemoTrykkPulse !== next.opptaksDemoTrykkPulse) {
    return false
  }
  const a = prev.tilbud
  const b = next.tilbud
  return (
    a.id === b.id &&
    a.status === b.status &&
    a.kundeNavn === b.kundeNavn &&
    a.adresse === b.adresse &&
    a.sistSendtDato === b.sistSendtDato &&
    a.sendtDato === b.sendtDato &&
    a.forsteSendtDato === b.forsteSendtDato &&
    a.opprettetDato === b.opprettetDato &&
    a.kortBeskrivelse === b.kortBeskrivelse &&
    a.jobbType === b.jobbType &&
    a.timer === b.timer &&
    a.materialkostnad === b.materialkostnad &&
    a.prisEksMva === b.prisEksMva &&
    a.versjon === b.versjon &&
    a.godkjentDato === b.godkjentDato &&
    a.avslattDato === b.avslattDato &&
    a.justeringOnsketDato === b.justeringOnsketDato &&
    a.antallPaminnelser === b.antallPaminnelser &&
    a.forstePaminnelseSendtDato === b.forstePaminnelseSendtDato &&
    a.sistePaminnelseSendtDato === b.sistePaminnelseSendtDato &&
    a.forstePaminnelseDato === b.forstePaminnelseDato &&
    a.sistePaminnelseDato === b.sistePaminnelseDato &&
    a.sistOppdatertDato === b.sistOppdatertDato
  )
}

const TilbudKort = React.memo(TilbudKortInner, erLikeTilbudKortProps)
export default TilbudKort

const styles = StyleSheet.create({
  pressableCard: {
    flex: 1,
    alignSelf: 'stretch',
  },
  pressableCardInner: {
    flex: 1,
    alignSelf: 'stretch',
  },
  card: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    minHeight: 126,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  unreadOutline: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  cardChevron: {
    position: 'absolute',
    top: '56%',
    right: 16,
    transform: [{ translateY: -7 }],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 34,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flex: 1,
    gap: 12,
    minHeight: 52,
    paddingTop: 6,
  },
  mainContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },
  topMetaText: {
    flex: 1,
    minWidth: 0,
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  dateText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
    textAlign: 'right',
  },
  descriptionWrap: {
    minWidth: 0,
    flex: 1,
    paddingRight: 8,
  },
  navn: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'DMSans_700Bold',
    color: '#111111',
  },
  adresse: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
    marginTop: 2,
  },
  tjeneste: {
    width: '100%',
    minWidth: 0,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'DMSans_600SemiBold',
    color: '#2A4D42',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metaRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusIcon: {
    marginTop: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_500Medium',
  },
  sideColumn: {
    width: 136,
    position: 'relative',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  priceRow: {
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
  },
  pris: {
    width: '100%',
    fontSize: 17,
    lineHeight: 21,
    fontFamily: 'DMSans_700Bold',
    color: '#1F5A3D',
    flexShrink: 1,
    textAlign: 'right',
  },
})
