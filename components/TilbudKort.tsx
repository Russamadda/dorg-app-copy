import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Forespørsel } from '../types'

type TilbudStatus = 'sendt' | 'avventer' | 'paminnelse' | 'siste' | 'godkjent' | 'avslatt'

const statusConfig: Record<
  TilbudStatus,
  {
    tekst: string
    bg: string
    farge: string
    border: string
  }
> = {
  sendt: {
    tekst: 'Sendt',
    bg: '#F9FAFB',
    farge: '#6B7280',
    border: '#E5E7EB',
  },
  avventer: {
    tekst: 'Sendt',
    bg: '#F9FAFB',
    farge: '#6B7280',
    border: '#E5E7EB',
  },
  paminnelse: {
    tekst: 'Sendt',
    bg: '#F9FAFB',
    farge: '#6B7280',
    border: '#E5E7EB',
  },
  siste: {
    tekst: 'Ring kunden',
    bg: '#FFF7ED',
    farge: '#9A3412',
    border: '#FED7AA',
  },
  godkjent: {
    tekst: '✓ Godkjent',
    bg: '#F0FDF4',
    farge: '#166534',
    border: '#BBF7D0',
  },
  avslatt: {
    tekst: '✕ Avslått',
    bg: '#FEF2F2',
    farge: '#991B1B',
    border: '#FECACA',
  },
}

const formaterDato = (dato: string) => {
  return new Date(dato).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
  })
}

const dagerSiden = (dato: string): string => {
  const sendt = new Date(dato)
  const iDag = new Date()
  const diff = Math.floor((iDag.getTime() - sendt.getTime()) / (1000 * 60 * 60 * 24))

  if (diff === 0) return 'I dag'
  if (diff === 1) return 'I går'
  if (diff < 7) return `${diff} dager siden`
  if (diff < 14) return '1 uke siden'
  return `${Math.floor(diff / 7)} uker siden`
}

interface TilbudKortProps {
  tilbud: Forespørsel
  onPress: (tilbud: Forespørsel) => void
}

export default function TilbudKort({ tilbud, onPress }: TilbudKortProps) {
  const config = statusConfig[tilbud.status as TilbudStatus] ?? statusConfig.sendt
  const erFolgOpp = tilbud.status === 'siste'
  const visSendtIkon =
    tilbud.status === 'sendt' || tilbud.status === 'avventer' || tilbud.status === 'paminnelse'

  const datoTekst = formaterDato(tilbud.opprettetDato)
  const elapsed = dagerSiden(tilbud.opprettetDato)
  const datoOgTid = `${datoTekst} · ${elapsed}`
  const belopFormatert = `kr ${tilbud.prisEksMva.toLocaleString('nb-NO')}`

  return (
    <Pressable onPress={() => onPress(tilbud)} style={styles.pressableCard}>
      <View style={styles.card}>
        {erFolgOpp ? <View style={styles.topBar} /> : null}

        <View style={styles.body}>
          <View style={styles.header}>
            <Text style={styles.navn}>{tilbud.kundeNavn}</Text>

            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: config.bg,
                  borderColor: config.border,
                },
              ]}
            >
              <View style={styles.statusInnhold}>
                {visSendtIkon ? (
                  <Ionicons name="arrow-redo-outline" size={12} color={config.farge} />
                ) : null}
                <Text style={[styles.statusTekst, { color: config.farge }]}>{config.tekst}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.jobb} numberOfLines={1}>
            {tilbud.jobbBeskrivelse}
          </Text>

          <View style={styles.bunn}>
            <Text style={styles.datoTekst}>{datoOgTid}</Text>
            <Text style={styles.belop}>{belopFormatert}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressableCard: {
    flex: 1,
    alignSelf: 'stretch',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDE9',
    overflow: 'hidden',
  },
  topBar: {
    height: 4,
    width: '100%',
    backgroundColor: '#D97706',
  },
  body: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  navn: {
    fontSize: 16,
    fontFamily: 'DMSans_500Medium',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  jobb: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#6B7280',
    marginBottom: 14,
  },
  bunn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datoTekst: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: '#9CA3AF',
    flex: 1,
    marginRight: 12,
  },
  belop: {
    fontSize: 16,
    fontFamily: 'DMSans_500Medium',
    color: '#1B4332',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusInnhold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusTekst: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.2,
  },
})
