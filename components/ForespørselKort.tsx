import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Forespørsel } from '../types'
import { getTilbudStatusPresentasjon } from '../utils/tilbudStatus'

interface Props {
  forespørsel: Forespørsel
  onÅpneUtkast?: (f: Forespørsel) => void
  /** Naviger til Tilbud-fanen og åpne detaljer for denne raden (avventer m.m.). */
  onGåTilTilbud?: (tilbudId: string) => void
}

/**
 * Lett kort på Forespørsler-fanen: oversikt + snarvei inn i hovedflyten.
 * Utkast → fortsett i NyttTilbudModal. Avventer → Tilbud-fanen + TilbudDetaljerModal.
 */
function UtkastForespørselKort({
  forespørsel,
  onÅpneUtkast,
}: {
  forespørsel: Forespørsel
  onÅpneUtkast: (f: Forespørsel) => void
}) {
  const tittel =
    forespørsel.jobbType?.trim() ||
    forespørsel.kortBeskrivelse?.trim() ||
    'Utkast'
  const datoKilde = forespørsel.sistOppdatertDato ?? forespørsel.opprettetDato
  const dato = new Date(datoKilde).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
  })
  const statusMeta = getTilbudStatusPresentasjon(forespørsel)
  const beskrivelseUtenTag = forespørsel.jobbBeskrivelse.replace(/^\[[^\]]+\]\s*/, '')

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onÅpneUtkast(forespørsel)}
      activeOpacity={0.86}
      accessibilityRole="button"
      accessibilityLabel={`Utkast ${tittel}. Fortsett i tilbud.`}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text
            style={styles.kundeNavn}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.62}
          >
            {tittel}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#888888" />
        </View>
        <Text style={styles.beskrivelse} numberOfLines={2}>
          {beskrivelseUtenTag.trim() || 'Trykk for å fortsette'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.statusTekst, { color: statusMeta.color }]}>
            {statusMeta.badge}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaTekst}>{statusMeta.subline ?? dato}</Text>
        </View>
      </View>
      <View style={styles.ctaFooter}>
        <Text style={styles.ctaFooterText}>Fortsett i tilbud</Text>
        <Ionicons name="arrow-forward" size={16} color="#111111" />
      </View>
    </TouchableOpacity>
  )
}

function AvventerForespørselKort({
  forespørsel,
  onGåTilTilbud,
}: {
  forespørsel: Forespørsel
  onGåTilTilbud: (tilbudId: string) => void
}) {
  const dato = new Date(forespørsel.opprettetDato).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
  })
  const statusMeta = getTilbudStatusPresentasjon(forespørsel)
  const harAdresse = Boolean(forespørsel.adresse)

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onGåTilTilbud(forespørsel.id)}
      activeOpacity={0.86}
      accessibilityRole="button"
      accessibilityLabel={`${forespørsel.kundeNavn}. Se i Tilbud.`}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.kundeNavn} numberOfLines={1}>
            {forespørsel.kundeNavn}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#888888" />
        </View>

        {harAdresse ? (
          <Text style={styles.adresse} numberOfLines={1}>
            {forespørsel.adresse}
          </Text>
        ) : null}

        <Text style={styles.beskrivelse} numberOfLines={3}>
          {forespørsel.jobbBeskrivelse}
        </Text>

        <View style={styles.metaRow}>
          <Text style={[styles.statusTekst, { color: statusMeta.color }]}>
            {statusMeta.badge}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaTekst}>{statusMeta.subline ?? dato}</Text>
        </View>
      </View>

      <View style={styles.hintBox}>
        <Text style={styles.hintText}>
          Lag og send tilbud i Tilbud-fanen — samme sted som øvrige tilbud.
        </Text>
      </View>

      <View style={styles.ctaFooter}>
        <Text style={styles.ctaFooterText}>Se i Tilbud</Text>
        <Ionicons name="arrow-forward" size={16} color="#111111" />
      </View>
    </TouchableOpacity>
  )
}

function erLikeForespørselKortProps(prev: Props, next: Props): boolean {
  if (prev.onÅpneUtkast !== next.onÅpneUtkast) {
    return false
  }
  if (prev.onGåTilTilbud !== next.onGåTilTilbud) {
    return false
  }
  const a = prev.forespørsel
  const b = next.forespørsel
  return (
    a.id === b.id &&
    a.status === b.status &&
    a.generertTekst === b.generertTekst &&
    a.prisEksMva === b.prisEksMva &&
    a.kundeNavn === b.kundeNavn &&
    a.jobbBeskrivelse === b.jobbBeskrivelse &&
    a.kundeEpost === b.kundeEpost &&
    a.opprettetDato === b.opprettetDato &&
    a.kortBeskrivelse === b.kortBeskrivelse &&
    a.jobbType === b.jobbType &&
    a.adresse === b.adresse &&
    a.firmaId === b.firmaId &&
    a.versjon === b.versjon &&
    a.draftStage === b.draftStage &&
    a.sistOppdatertDato === b.sistOppdatertDato
  )
}

function ForespørselKortVelger(props: Props) {
  if (props.forespørsel.status === 'utkast') {
    if (!props.onÅpneUtkast) return null
    return (
      <UtkastForespørselKort
        forespørsel={props.forespørsel}
        onÅpneUtkast={props.onÅpneUtkast}
      />
    )
  }
  if (!props.onGåTilTilbud) return null
  return (
    <AvventerForespørselKort
      forespørsel={props.forespørsel}
      onGåTilTilbud={props.onGåTilTilbud}
    />
  )
}

const ForespørselKort = React.memo(ForespørselKortVelger, erLikeForespørselKortProps)
export default ForespørselKort

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  kundeNavn: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'DMSans_700Bold',
    color: '#111111',
    flex: 1,
    minWidth: 0,
  },
  adresse: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
  },
  beskrivelse: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'DMSans_400Regular',
    color: '#333333',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  metaDot: {
    marginHorizontal: 5,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#888888',
  },
  metaTekst: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
  },
  hintBox: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
  },
  ctaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FAFBFC',
  },
  ctaFooterText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#111111',
  },
})
