import { useState } from 'react'
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
import { Colors } from '../constants/colors'
import type { Forespørsel, Firma } from '../types'
import StatusBadge from './StatusBadge'
import { genererTilbud } from '../lib/openai'
import { sendTilbudEpost } from '../lib/resend'
import { oppdaterForespørsel } from '../lib/supabase'

interface Props {
  forespørsel: Forespørsel
  firma: Firma | null
  onOppdater: () => void
}

export default function ForespørselKort({ forespørsel, firma, onOppdater }: Props) {
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
    year: 'numeric',
  })

  const prisFormatert = `kr ${forespørsel.prisEksMva.toLocaleString('nb-NO')}`

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
      await sendTilbudEpost({
        tilEpost: forespørsel.kundeEpost,
        kundeNavn: forespørsel.kundeNavn,
        firmanavn: firma.firmanavn,
        generertTekst,
        prisEksMva: prisEksMva,
      })
      await oppdaterForespørsel(forespørsel.id, { status: 'sendt' })
      onOppdater()
    } catch {
      setFeil('Feil ved sending. Sjekk tilkoblingen.')
    } finally {
      setSender(false)
    }
  }

  const prisEksMva = Number(justertPris) || forespørsel.prisEksMva
  const mva = prisEksMva * 0.25
  const total = prisEksMva + mva

  return (
    <View style={styles.container}>
      {/* Header — alltid synlig */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setEkspandert(e => !e)}
        activeOpacity={0.8}
      >
        <View style={styles.rad1}>
          <Text style={styles.kundeNavn}>{forespørsel.kundeNavn}</Text>
          <View style={styles.rad1Høyre}>
            <Text style={styles.pris}>{prisFormatert}</Text>
            {ekspandert && (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); setEkspandert(false) }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.lukkTekst}>Lukk ↑</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.jobbBeskrivelse} numberOfLines={ekspandert ? undefined : 2}>
          {forespørsel.jobbBeskrivelse}
        </Text>

        <View style={styles.rad3}>
          <Text style={styles.dato}>{dato}</Text>
          <View style={styles.rad3Høyre}>
            <StatusBadge status={forespørsel.status} />
            {!ekspandert && (
              <Ionicons name="chevron-down" size={16} color={Colors.textMuted} style={{ marginLeft: 8 }} />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Ekspandert innhold */}
      {ekspandert && (
        <View style={styles.ekspandert}>
          <View style={styles.divider} />

          {generertTekst ? (
            <View style={styles.forhåndsvisningWrapper}>
              <TilbudsForhåndsvisning
                tekst={generertTekst}
                kundeNavn={forespørsel.kundeNavn}
                firmanavn={firma?.firmanavn ?? ''}
                adresse={firma?.adresse}
                prisEksMva={prisEksMva}
              />

              {/* Handlingsknapper */}
              <View style={styles.knappeRad}>
                <TouchableOpacity
                  style={styles.justerKnapp}
                  onPress={() => setVisJusteringsPanel(v => !v)}
                >
                  <Text style={styles.justerKnappTekst}>Juster tilbud</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendKnapp, sender && styles.knappDisabled]}
                  onPress={sendOgOppdater}
                  disabled={sender}
                >
                  {sender ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.sendKnappTekst}>Send tilbud</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Justeringspanel */}
              {visJusteringsPanel && (
                <View style={styles.justeringsPanel}>
                  <Text style={styles.feltLabel}>PRIS EKS. MVA</Text>
                  <TextInput
                    style={styles.justerInput}
                    value={justertPris}
                    onChangeText={setJustertPris}
                    keyboardType="number-pad"
                    placeholderTextColor={Colors.textMuted}
                  />

                  <Text style={[styles.feltLabel, { marginTop: 12 }]}>JUSTERINGER TIL AI</Text>
                  <TextInput
                    style={[styles.justerInput, styles.justerInputMultiline]}
                    value={justeringer}
                    onChangeText={setJusteringer}
                    multiline
                    numberOfLines={3}
                    placeholder="F.eks: øk timepris, legg til rigg..."
                    placeholderTextColor={Colors.textMuted}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={[styles.oppdaterKnapp, isGenerating && styles.knappDisabled]}
                    onPress={() => generer(justeringer)}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <ActivityIndicator color={Colors.primary} size="small" />
                    ) : (
                      <Text style={styles.oppdaterKnappTekst}>Oppdater tilbud</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.sendingsSeksjon}>
                    <View style={styles.switchRad}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.switchLabel}>Automatiske påminnelser</Text>
                        <Text style={styles.switchSubLabel}>Dag 3 og dag 7</Text>
                      </View>
                      <Switch
                        value={automatiskePaminnelser}
                        onValueChange={setAutomatiskePaminnelser}
                        trackColor={{ false: Colors.surfaceBorder, true: Colors.accent }}
                        thumbColor="#fff"
                      />
                    </View>

                    {feil ? <Text style={styles.feilTekst}>{feil}</Text> : null}

                    <TouchableOpacity style={styles.lagreUtkastKnapp}>
                      <Text style={styles.lagreUtkastTekst}>Lagre utkast</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.bekreftKnapp, sender && styles.knappDisabled]}
                      onPress={sendOgOppdater}
                      disabled={sender}
                    >
                      {sender ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.bekreftKnappTekst}>Bekreft og send</Text>
                      )}
                    </TouchableOpacity>

                    <Text style={styles.infoTekst}>Kunden mottar tilbudet på e-post</Text>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.genererWrapper}>
              <TouchableOpacity
                style={[styles.genererKnapp, isGenerating && styles.knappDisabled]}
                onPress={() => generer()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <View style={styles.generererRad}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.genererKnappTekst}>Genererer tilbud...</Text>
                  </View>
                ) : (
                  <Text style={styles.genererKnappTekst}>Generer tilbud med AI</Text>
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

// ─── Forhåndsvisning ─────────────────────────────────────────────────────────

function TilbudsForhåndsvisning({
  tekst,
  kundeNavn,
  firmanavn,
  adresse,
  prisEksMva,
}: {
  tekst: string
  kundeNavn: string
  firmanavn: string
  adresse?: string
  prisEksMva: number
}) {
  const mva = prisEksMva * 0.25
  const total = prisEksMva + mva
  const dagensdato = new Date().toLocaleDateString('nb-NO')
  const linjer = tekst.split('\n').filter(l => l.trim())

  return (
    <View style={styles.tilbudBoks}>
      <View style={styles.tilbudHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tilbudMetaLabel}>FRA</Text>
          <Text style={styles.tilbudMetaTekst}>{firmanavn}</Text>
          {adresse ? <Text style={styles.tilbudMetaTekst}>{adresse}</Text> : null}
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.tilbudMetaLabel}>TIL</Text>
          <Text style={styles.tilbudMetaTekst}>{kundeNavn}</Text>
          <Text style={styles.tilbudMetaTekst}>{dagensdato}</Text>
        </View>
      </View>

      <View style={styles.tilbudDivider} />

      <View style={{ gap: 3 }}>
        {linjer.map((linje, i) => {
          if (linje.startsWith('## ') || linje.startsWith('# ')) {
            return <Text key={i} style={styles.tilbudOverskrift}>{linje.replace(/^#+\s/, '')}</Text>
          }
          if (linje.startsWith('- ') || linje.startsWith('* ')) {
            return <Text key={i} style={styles.tilbudBullet}>{'• '}{linje.replace(/^[-*]\s/, '')}</Text>
          }
          return <Text key={i} style={styles.tilbudTekst}>{linje.replace(/\*\*(.*?)\*\*/g, '$1')}</Text>
        })}
      </View>

      <View style={styles.tilbudDivider} />

      <View style={{ gap: 6 }}>
        <PrisRad label="Arbeid/materialer" verdi={`kr ${prisEksMva.toLocaleString('nb-NO')}`} />
        <PrisRad label="MVA (25%)" verdi={`kr ${Math.round(mva).toLocaleString('nb-NO')}`} />
        <View style={styles.tilbudDivider} />
        <PrisRad label="TOTALT inkl. MVA" verdi={`kr ${Math.round(total).toLocaleString('nb-NO')}`} bold />
      </View>
    </View>
  )
}

function PrisRad({ label, verdi, bold }: { label: string; verdi: string; bold?: boolean }) {
  return (
    <View style={styles.prisRad}>
      <Text style={[styles.prisLabel, bold && styles.prisBold]}>{label}</Text>
      <Text style={[styles.prisVerdi, bold && styles.prisBold]}>{verdi}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  header: { padding: 16, gap: 8 },
  rad1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rad1Høyre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kundeNavn: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  pris: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.primary,
  },
  lukkTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  jobbBeskrivelse: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  rad3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rad3Høyre: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dato: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  divider: { height: 1, backgroundColor: Colors.surfaceBorder },
  ekspandert: {},
  forhåndsvisningWrapper: { padding: 12, gap: 12 },
  genererWrapper: { padding: 16, alignItems: 'center', gap: 12 },
  tilbudBoks: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    padding: 16,
  },
  tilbudHeader: { flexDirection: 'row', marginBottom: 12 },
  tilbudMetaLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tilbudMetaTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tilbudDivider: { height: 1, backgroundColor: Colors.surfaceBorder, marginVertical: 10 },
  tilbudOverskrift: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
    marginTop: 6,
  },
  tilbudBullet: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 20,
    paddingLeft: 4,
  },
  tilbudTekst: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  prisRad: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prisLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },
  prisVerdi: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textPrimary },
  prisBold: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary },
  knappeRad: { flexDirection: 'row', gap: 8 },
  justerKnapp: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  justerKnappTekst: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.primary },
  sendKnapp: {
    flex: 1.5,
    height: 36,
    backgroundColor: Colors.primary,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendKnappTekst: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#fff' },
  justeringsPanel: {
    backgroundColor: '#F9FAF9',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    padding: 16,
  },
  feltLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  justerInput: {
    height: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  justerInputMultiline: { height: 80, paddingTop: 10 },
  oppdaterKnapp: {
    height: 36,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  oppdaterKnappTekst: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.primary },
  sendingsSeksjon: { marginTop: 12, gap: 8 },
  switchRad: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  switchLabel: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  switchSubLabel: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textMuted },
  lagreUtkastKnapp: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lagreUtkastTekst: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.primary },
  bekreftKnapp: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knappDisabled: { opacity: 0.7 },
  bekreftKnappTekst: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#fff' },
  infoTekst: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  genererKnapp: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  genererKnappTekst: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#fff' },
  generererRad: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  feilTekst: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.danger, textAlign: 'center' },
})
