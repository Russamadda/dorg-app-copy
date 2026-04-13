import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Forespørsel, Firma } from '../types'
import { TilbudsForhåndsvisning } from './TilbudsForhåndsvisning'
import { genererTilbud } from '../lib/openai'
import { sendTilbudEpost } from '../lib/resend'
import { oppdaterForespørsel, registrerForsteTilbudSendt } from '../lib/supabase'
import { getTilbudKortStatus } from '../utils/tilbudStatus'

interface Props {
  forespørsel: Forespørsel
  firma: Firma | null
  onOppdater: () => void
  onÅpneUtkast?: (f: Forespørsel) => void
}

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
  const statusMeta = getTilbudKortStatus(forespørsel)
  const beskrivelseUtenTag = forespørsel.jobbBeskrivelse.replace(/^\[[^\]]+\]\s*/, '')

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onÅpneUtkast(forespørsel)}
      activeOpacity={0.86}
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
            {statusMeta.label}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaTekst}>{dato}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function ForespørselKortInner({ forespørsel, firma, onOppdater }: Props) {
  const [ekspandert, setEkspandert] = useState(false)
  const [generertTekst, setGenerertTekst] = useState(forespørsel.generertTekst ?? '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [justertPris, setJustertPris] = useState(forespørsel.prisEksMva.toString())
  const [justeringer, setJusteringer] = useState('')
  const [visJusteringsPanel, setVisJusteringsPanel] = useState(false)
  const [automatiskePaminnelser, setAutomatiskePaminnelser] = useState(false)
  const [sender, setSender] = useState(false)
  const [feil, setFeil] = useState('')

  const dato = new Date(forespørsel.opprettetDato).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
  })
  const statusMeta = getTilbudKortStatus(forespørsel)

  async function generer(medJusteringer?: string) {
    if (!firma) return
    setIsGenerating(true)
    setFeil('')
    try {
      const tekst = await genererTilbud({
        kundeNavn: forespørsel.kundeNavn,
        jobbBeskrivelse: forespørsel.jobbBeskrivelse,
        prisEksMva: Number(justertPris) || forespørsel.prisEksMva,
        firmanavn: firma.firmanavn,
        adresse: firma.adresse,
        timepris: firma.timepris,
        justeringer: medJusteringer,
        behandleSomUtkastUtenTekstanalyse: !medJusteringer,
      })
      setGenerertTekst(tekst)
      setVisJusteringsPanel(false)
      await oppdaterForespørsel(forespørsel.id, { generertTekst: tekst })
    } catch {
      setFeil('Feil ved generering. Prøv igjen.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function sendOgOppdater() {
    if (!generertTekst || !firma) return
    setSender(true)
    setFeil('')
    try {
      const sendtDato = new Date().toISOString()

      await sendTilbudEpost({
        tilEpost: forespørsel.kundeEpost,
        kundeNavn: forespørsel.kundeNavn,
        firmanavn: firma.firmanavn,
        generertTekst,
        prisEksMva: prisEksMva,
        tilbudId: forespørsel.id,
        firmaTelefon: firma.telefon,
        firmaEpost: firma.epost,
      })
      await registrerForsteTilbudSendt({
        tilbudId: forespørsel.id,
        firmaId: forespørsel.firmaId,
        opprettetDato: sendtDato,
        versjon: forespørsel.versjon ?? 1,
      })
      onOppdater()
    } catch {
      setFeil('Feil ved sending. Sjekk tilkoblingen.')
    } finally {
      setSender(false)
    }
  }

  const prisEksMva = Number(justertPris) || forespørsel.prisEksMva
  const harAdresse = Boolean(forespørsel.adresse)
  const estimatLabel = prisEksMva.toLocaleString('nb-NO')
  const firmanavn = firma?.firmanavn

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setEkspandert(e => !e)}
        activeOpacity={0.86}
      >
        <View style={styles.headerRow}>
          <Text style={styles.kundeNavn} numberOfLines={1}>
            {forespørsel.kundeNavn}
          </Text>

          <View style={styles.chevronButton}>
            <Ionicons
              name={ekspandert ? 'chevron-down' : 'chevron-forward'}
              size={16}
              color="#888888"
            />
          </View>
        </View>

        {harAdresse ? (
          <Text style={styles.adresse} numberOfLines={1}>
            {forespørsel.adresse}
          </Text>
        ) : null}

        <Text style={styles.beskrivelse} numberOfLines={ekspandert ? undefined : 2}>
          {forespørsel.jobbBeskrivelse}
        </Text>

        <View style={styles.metaRow}>
          <Text style={[styles.statusTekst, { color: statusMeta.color }]}>
            {statusMeta.label}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaTekst}>{dato}</Text>
        </View>
      </TouchableOpacity>

      {ekspandert && (
        <View style={styles.ekspandert}>
          <View style={styles.divider} />

          {generertTekst ? (
            <View style={styles.forhåndsvisningWrapper}>
              <View style={styles.previewMeta}>
                <Text style={styles.previewLabel}>Pris eks. mva</Text>
                <Text style={styles.previewPrice}>kr {estimatLabel}</Text>
                {firmanavn ? (
                  <Text style={styles.previewSubtext}>{firmanavn}</Text>
                ) : null}
              </View>

              <TilbudsForhåndsvisning tekst={generertTekst} />

              <View style={styles.knappeRad}>
                <TouchableOpacity
                  style={styles.sekundærKnapp}
                  onPress={() => setVisJusteringsPanel(v => !v)}
                  activeOpacity={0.86}
                >
                  <Text style={styles.sekundærKnappTekst}>Juster tilbud</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primærKnapp, sender && styles.knappDisabled]}
                  onPress={sendOgOppdater}
                  disabled={sender}
                  activeOpacity={0.86}
                >
                  {sender ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primærKnappTekst}>Send tilbud</Text>
                  )}
                </TouchableOpacity>
              </View>

              {visJusteringsPanel && (
                <View style={styles.justeringsPanel}>
                  <Text style={styles.feltLabel}>Pris eks. mva</Text>
                  <TextInput
                    style={styles.justerInput}
                    value={justertPris}
                    onChangeText={setJustertPris}
                    keyboardType="number-pad"
                    placeholderTextColor="#888888"
                  />

                  <Text style={[styles.feltLabel, styles.fieldSpacing]}>Justeringer til AI</Text>
                  <TextInput
                    style={[styles.justerInput, styles.justerInputMultiline]}
                    value={justeringer}
                    onChangeText={setJusteringer}
                    multiline
                    numberOfLines={3}
                    placeholder="F.eks: øk timepris, legg til rigg..."
                    placeholderTextColor="#888888"
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={[styles.sekundærKnapp, styles.panelButton, isGenerating && styles.knappDisabled]}
                    onPress={() => generer(justeringer)}
                    disabled={isGenerating}
                    activeOpacity={0.86}
                  >
                    {isGenerating ? (
                      <ActivityIndicator color="#111111" size="small" />
                    ) : (
                      <Text style={styles.sekundærKnappTekst}>Oppdater tilbud</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.sendingsSeksjon}>
                    <View style={styles.switchRad}>
                      <View style={styles.switchText}>
                        <Text style={styles.switchLabel}>Automatiske påminnelser</Text>
                        <Text style={styles.switchSubLabel}>Dag 3 og dag 7</Text>
                      </View>
                      <Switch
                        value={automatiskePaminnelser}
                        onValueChange={setAutomatiskePaminnelser}
                        trackColor={{ false: '#CCCCCC', true: '#111111' }}
                        thumbColor="#FFFFFF"
                      />
                    </View>

                    {feil ? <Text style={styles.feilTekst}>{feil}</Text> : null}

                    <TouchableOpacity style={styles.sekundærKnapp} activeOpacity={0.86}>
                      <Text style={styles.sekundærKnappTekst}>Lagre utkast</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primærKnapp, sender && styles.knappDisabled]}
                      onPress={sendOgOppdater}
                      disabled={sender}
                      activeOpacity={0.86}
                    >
                      {sender ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.primærKnappTekst}>Bekreft og send</Text>
                      )}
                    </TouchableOpacity>

                    <Text style={styles.infoTekst}>Kunden mottar tilbudet på e-post</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.lukkKnapp}
                onPress={() => setEkspandert(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.lukkKnappTekst}>Lukk</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.genererWrapper}>
              <View style={styles.previewMeta}>
                <Text style={styles.previewLabel}>Prisestimat eks. mva</Text>
                <Text style={styles.previewPrice}>kr {estimatLabel}</Text>
              </View>

              <TouchableOpacity
                style={[styles.primærKnapp, styles.primærKnappFull, isGenerating && styles.knappDisabled]}
                onPress={() => generer()}
                disabled={isGenerating}
                activeOpacity={0.86}
              >
                {isGenerating ? (
                  <View style={styles.generererRad}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.primærKnappTekst}>Genererer tilbud...</Text>
                  </View>
                ) : (
                  <Text style={styles.primærKnappTekst}>Generer tilbud</Text>
                )}
              </TouchableOpacity>
              {feil ? <Text style={styles.feilTekst}>{feil}</Text> : null}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

function erLikeForespørselKortProps(prev: Props, next: Props): boolean {
  if (prev.onOppdater !== next.onOppdater) {
    return false
  }
  if (prev.onÅpneUtkast !== next.onÅpneUtkast) {
    return false
  }
  if (prev.firma?.id !== next.firma?.id) {
    return false
  }
  if (prev.firma?.firmanavn !== next.firma?.firmanavn) {
    return false
  }
  if (prev.firma?.adresse !== next.firma?.adresse) {
    return false
  }
  if (prev.firma?.timepris !== next.firma?.timepris) {
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
    a.draftStage === b.draftStage
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
  return <ForespørselKortInner {...props} />
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
    paddingVertical: 16,
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
  chevronButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F2F6',
    alignItems: 'center',
    justifyContent: 'center',
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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  ekspandert: {},
  forhåndsvisningWrapper: {
    padding: 16,
    gap: 12,
  },
  genererWrapper: {
    padding: 16,
    gap: 12,
  },
  previewMeta: {
    backgroundColor: '#F4F5F8',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  previewLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#888888',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  previewPrice: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: 'DMSans_700Bold',
    color: '#111111',
  },
  previewSubtext: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
  },
  knappeRad: {
    flexDirection: 'row',
    gap: 10,
  },
  primærKnapp: {
    flex: 1,
    height: 46,
    backgroundColor: '#111111',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primærKnappFull: {
    flex: 0,
    width: '100%',
    height: 50,
  },
  primærKnappTekst: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  sekundærKnapp: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#F4F5F8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  sekundærKnappTekst: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: '#111111',
  },
  panelButton: {
    marginTop: 8,
  },
  knappDisabled: {
    opacity: 0.6,
  },
  justeringsPanel: {
    backgroundColor: '#EEF1F6',
    borderRadius: 18,
    padding: 16,
  },
  feltLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#888888',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  fieldSpacing: {
    marginTop: 12,
  },
  justerInput: {
    height: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: '#111111',
    shadowColor: '#B0BAC8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  justerInputMultiline: {
    height: 80,
    paddingTop: 12,
  },
  sendingsSeksjon: {
    marginTop: 12,
    gap: 10,
  },
  switchRad: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 16,
  },
  switchText: {
    flex: 1,
  },
  switchLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: '#111111',
  },
  switchSubLabel: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
  },
  lukkKnapp: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  lukkKnappTekst: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
  },
  feilTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#CC3333',
    textAlign: 'center',
  },
  infoTekst: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#888888',
    textAlign: 'center',
  },
  generererRad: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
})
