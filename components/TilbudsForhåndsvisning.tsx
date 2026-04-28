import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { fjernMaterialMarkorerForVisning } from '../lib/materialSeksjon'
import { fjernKortLinje } from '../lib/tekstUtils'

interface Props {
  tekst: string
  isLoading?: boolean
  tone?: 'light' | 'dark'
  /** Løsere rytme og typografi for tilbudskort i mørk modus (kun layout/stil). */
  documentVariant?: boolean
}

const META_PREFIXES = ['Til:', 'Fra:', 'Dato:', 'Adresse:', 'Tlf:', 'E-post:']
const SEKSJONSTITLER = [
  'Oppstart:',
  'Gyldighet:',
  'Pris:',
  'Dette er inkludert:',
  'Dette er avtalt:',
  'Viktig å merke seg:',
]

function parseMetaLinje(linje: string) {
  const prefix = META_PREFIXES.find(item => linje.startsWith(item))
  if (!prefix) {
    return null
  }

  return {
    label: prefix.slice(0, -1),
    verdi: linje.slice(prefix.length).trim(),
  }
}

function erSeparatorLinje(linje: string) {
  return /^[─-]{5,}$/.test(linje)
}

function parseMaterialLinje(linje: string) {
  const match = /^-\s+(.+?)\s[.\-·]{4,}\s(.+)$/.exec(linje)
  if (!match) return null

  return {
    navn: match[1].trim(),
    verdi: match[2].trim(),
  }
}

export function TilbudsForhåndsvisning({
  tekst,
  isLoading = false,
  tone = 'light',
  documentVariant = false,
}: Props) {
  const erMork = tone === 'dark'
  const doc = documentVariant && erMork

  if (isLoading) {
    return (
      <View style={[styles.container, doc && styles.containerDoc]}>
        <View style={[styles.skeletonLinje, erMork && styles.skeletonLinjeMork, styles.skeletonTittel]} />
        <View style={[styles.skeletonLinje, erMork && styles.skeletonLinjeMork, styles.skeletonKort]} />
        <View style={[styles.tomLinje, doc && styles.tomLinjeDoc]} />
        <View style={[styles.skeletonLinje, erMork && styles.skeletonLinjeMork, styles.skeletonMeta]} />
        <View style={[styles.skeletonLinje, erMork && styles.skeletonLinjeMork, styles.skeletonMetaKort]} />
        <View style={[styles.skeletonLinje, erMork && styles.skeletonLinjeMork, styles.skeletonMetaKort]} />
        <View style={[styles.divider, erMork && styles.dividerMork, doc && styles.dividerMorkDoc]} />
        <View style={[styles.skeletonLinje, erMork && styles.skeletonLinjeMork, styles.skeletonBrod]} />
        <View style={[styles.skeletonLinje, erMork && styles.skeletonLinjeMork, styles.skeletonBrod]} />
        <View style={[styles.skeletonLinje, erMork && styles.skeletonLinjeMork, styles.skeletonBrodKort]} />
        <View style={[styles.tomLinje, doc && styles.tomLinjeDoc]} />
        <View style={[styles.skeletonLinje, erMork && styles.skeletonLinjeMork, styles.skeletonBrod]} />
        <View style={[styles.skeletonLinje, erMork && styles.skeletonLinjeMork, styles.skeletonBrodKort]} />
        <View style={[styles.divider, erMork && styles.dividerMork, doc && styles.dividerMorkDoc]} />
        <View style={[styles.skeletonLinje, erMork && styles.skeletonLinjeMork, styles.skeletonPris]} />
        <View style={[styles.skeletonLinje, erMork && styles.skeletonLinjeMork, styles.skeletonPris]} />
        <View style={[styles.skeletonLinje, erMork && styles.skeletonLinjeMork, styles.skeletonPrisTotal]} />
      </View>
    )
  }

  const linjer = fjernMaterialMarkorerForVisning(fjernKortLinje(tekst)).split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < linjer.length; i++) {
    const linje = linjer[i].trim()
    const nesteLinje = linjer[i + 1]?.trim() ?? ''
    const nesteIkkeTomLinje = linjer.slice(i + 1).find(item => item.trim())?.trim() ?? ''
    const forrigeLinje = linjer[i - 1]?.trim() ?? ''

    if (!linje) {
      const nesteErTotalPris =
        nesteLinje.includes('kr') &&
        nesteLinje.includes(':') &&
        nesteLinje.toLowerCase().includes('totalt')
      const nesteErAdresseEtterFra =
        !nesteLinje.includes(':') &&
        ['Tlf:', 'E-post:', 'Dato:'].some(prefix =>
          nesteIkkeTomLinje.startsWith(prefix)
        )

      if (nesteErTotalPris) {
        continue
      }

      elements.push(
        <View
          key={key++}
          style={nesteErAdresseEtterFra ? styles.metaMellomrom : [styles.tomLinje, doc && styles.tomLinjeDoc]}
        />
      )
      continue
    }

    if (linje === '---') {
      const nesteErPrisSeksjon = nesteIkkeTomLinje === 'Pris:'
      if (nesteErPrisSeksjon) {
        continue
      }

      elements.push(
        <View
          key={key++}
          style={[styles.divider, erMork && styles.dividerMork, doc && styles.dividerMorkDoc]}
        />
      )
      continue
    }

    if (erSeparatorLinje(linje)) {
      continue
    }

    if (i === 0) {
      elements.push(
        <Text
          key={key++}
          style={[styles.tittel, erMork && styles.tittelMork, doc && styles.tittelMorkDoc]}
        >
          {linje}
        </Text>
      )
      continue
    }

    if (SEKSJONSTITLER.includes(linje)) {
      elements.push(
        <Text
          key={key++}
          style={[styles.seksjonstittel, erMork && styles.seksjonstittelMork, doc && styles.seksjonstittelMorkDoc]}
        >
          {linje}
        </Text>
      )
      continue
    }

    const erOverskrift = linje.endsWith(':') && linje.length < 30
    if (erOverskrift) {
      elements.push(
        <Text
          key={key++}
          style={[styles.overskrift, erMork && styles.overskriftMork, doc && styles.overskriftMorkDoc]}
        >
          {linje.slice(0, -1)}
        </Text>
      )
      continue
    }

    const materialLinje = parseMaterialLinje(linje)
    if (materialLinje) {
      elements.push(
        <View key={key++} style={[styles.materialRad, doc && styles.materialRadDoc]}>
          <Text style={[styles.bulletPunkt, erMork && styles.bulletPunktMork]}>·</Text>
          <Text
            style={[styles.materialNavn, erMork && styles.materialNavnMork, doc && styles.materialNavnMorkDoc]}
            numberOfLines={2}
          >
            {materialLinje.navn}
          </Text>
          <View style={[styles.materialLeader, erMork && styles.materialLeaderMork]} />
          <Text style={[styles.materialVerdi, erMork && styles.materialVerdiMork]}>
            {materialLinje.verdi}
          </Text>
        </View>
      )
      continue
    }

    if (linje.startsWith('- ')) {
      const innhold = linje.slice(2)
      const kolonPos = innhold.indexOf(':')

      if (kolonPos > 0 && kolonPos < 20) {
        const label = innhold.slice(0, kolonPos)
        const verdi = innhold.slice(kolonPos + 1).trim()
        elements.push(
          <View key={key++} style={[styles.bulletRad, doc && styles.bulletRadDoc]}>
            <Text style={[styles.bulletPunkt, erMork && styles.bulletPunktMork]}>·</Text>
            <Text style={styles.bulletInnhold}>
              <Text style={[styles.bulletLabel, erMork && styles.bulletLabelMork]}>{label}: </Text>
              <Text
                style={[styles.bulletVerdi, erMork && styles.bulletVerdiMork, doc && styles.bulletVerdiMorkDoc]}
              >
                {verdi}
              </Text>
            </Text>
          </View>
        )
      } else {
        elements.push(
          <View key={key++} style={[styles.bulletRad, doc && styles.bulletRadDoc]}>
            <Text style={[styles.bulletPunkt, erMork && styles.bulletPunktMork]}>·</Text>
            <Text
              style={[styles.bulletTekst, erMork && styles.bulletTekstMork, doc && styles.bulletTekstMorkDoc]}
            >
              {innhold}
            </Text>
          </View>
        )
      }
      continue
    }

    const meta = parseMetaLinje(linje)
    if (meta) {
      elements.push(
        <View key={key++} style={styles.metaRad}>
          <Text style={[styles.metaLabel, erMork && styles.metaLabelMork]}>{meta.label}:</Text>
          <Text style={[styles.metaVerdi, erMork && styles.metaVerdiMork]}>{meta.verdi}</Text>
        </View>
      )
      continue
    }

    if (linje.includes('kr') && linje.includes(':')) {
      const deler = linje.split(':')
      const prisTekst = deler[0].trim()
      const prisVerdi = deler.slice(1).join(':').trim()
      const erTotal = prisTekst.toLowerCase().includes('totalt')

      if (erTotal) {
        elements.push(
          <View
            key={key++}
            style={[styles.divider, erMork && styles.dividerMork, doc && styles.dividerMorkDoc]}
          />
        )
      }

      elements.push(
        <View key={key++} style={[styles.prisRad, doc && styles.prisRadDoc]}>
          <Text style={[styles.prisLabel, erMork && styles.prisLabelMork, erTotal && styles.prisTotalLabel, erTotal && erMork && styles.prisTotalLabelMork]}>
            {prisTekst}
          </Text>
          <Text style={[styles.prisVerdi, erMork && styles.prisVerdiMork, erTotal && styles.prisTotalVerdi, erTotal && erMork && styles.prisTotalVerdiMork]}>
            {prisVerdi}
          </Text>
        </View>
      )
      continue
    }

    const erAdresseLinje =
      !linje.includes(':') &&
      (forrigeLinje.startsWith('Fra:') ||
        (forrigeLinje === '' &&
          ['Tlf:', 'E-post:', 'Dato:'].some(prefix =>
            nesteIkkeTomLinje.startsWith(prefix)
          )))

    if (erAdresseLinje) {
      elements.push(
        <View key={key++} style={styles.metaRad}>
          <Text style={[styles.metaAdresseVerdi, erMork && styles.metaVerdiMork]}>{linje}</Text>
        </View>
      )
      continue
    }

    elements.push(
      <Text
        key={key++}
        style={[styles.brodtekst, erMork && styles.brodtekstMork, doc && styles.brodtekstMorkDoc]}
      >
        {linje}
      </Text>
    )
  }

  return <View style={[styles.container, doc && styles.containerDoc]}>{elements}</View>
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
  },
  containerDoc: {
    paddingHorizontal: 6,
  },
  skeletonLinje: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  skeletonLinjeMork: {
    backgroundColor: '#2B2B31',
  },
  skeletonTittel: {
    height: 24,
    width: '72%',
  },
  skeletonKort: {
    width: '40%',
  },
  skeletonMeta: {
    width: '55%',
  },
  skeletonMetaKort: {
    width: '35%',
  },
  skeletonBrod: {
    width: '100%',
  },
  skeletonBrodKort: {
    width: '78%',
  },
  skeletonPris: {
    width: '88%',
  },
  skeletonPrisTotal: {
    height: 14,
    width: '92%',
  },
  tomLinje: {
    height: 10,
  },
  tomLinjeDoc: {
    height: 12,
  },
  metaMellomrom: {
    height: 8,
  },
  tittel: {
    fontSize: 20,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: '#1B4332',
    marginBottom: 8,
    lineHeight: 26,
  },
  tittelMork: {
    color: '#8CC7A5',
  },
  tittelMorkDoc: {
    marginBottom: 12,
    lineHeight: 28,
  },
  overskrift: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: '#111827',
    marginTop: 16,
    marginBottom: 6,
  },
  overskriftMork: {
    color: '#F5F7FA',
  },
  overskriftMorkDoc: {
    marginTop: 18,
    marginBottom: 8,
  },
  seksjonstittel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: '#111827',
    marginTop: 16,
    marginBottom: 4,
  },
  seksjonstittelMork: {
    color: '#F5F7FA',
  },
  seksjonstittelMorkDoc: {
    marginTop: 20,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  dividerMork: {
    backgroundColor: '#3A3B42',
  },
  dividerMorkDoc: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 10,
  },
  brodtekst: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#374151',
    lineHeight: 22,
    marginBottom: 4,
  },
  brodtekstMork: {
    color: '#D6DBE3',
  },
  brodtekstMorkDoc: {
    lineHeight: 24,
    marginBottom: 5,
  },
  bulletRad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    paddingLeft: 4,
    paddingRight: 4,
  },
  bulletRadDoc: {
    marginBottom: 6,
  },
  bulletPunkt: {
    fontSize: 14,
    color: '#4CAF82',
    marginRight: 8,
    marginTop: 1,
    lineHeight: 20,
  },
  bulletPunktMork: {
    color: '#59D18C',
  },
  bulletInnhold: {
    flex: 1,
    flexShrink: 1,
    lineHeight: 20,
  },
  bulletLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: '#111827',
    lineHeight: 20,
  },
  bulletLabelMork: {
    color: '#F5F7FA',
  },
  bulletVerdi: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#374151',
    lineHeight: 20,
    flex: 1,
  },
  bulletVerdiMork: {
    color: '#D6DBE3',
  },
  bulletVerdiMorkDoc: {
    color: '#E2E8F0',
  },
  bulletTekst: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#374151',
    lineHeight: 20,
    flex: 1,
  },
  bulletTekstMork: {
    color: '#D6DBE3',
  },
  bulletTekstMorkDoc: {
    color: '#E8EDF4',
    lineHeight: 22,
  },
  materialRad: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
    paddingLeft: 4,
    paddingRight: 4,
    gap: 8,
  },
  materialRadDoc: {
    marginBottom: 8,
  },
  materialNavn: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#374151',
    lineHeight: 20,
    flexShrink: 1,
  },
  materialNavnMork: {
    color: '#D6DBE3',
  },
  materialNavnMorkDoc: {
    color: '#E8EDF4',
  },
  materialLeader: {
    flex: 1,
    minWidth: 18,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderBottomColor: 'rgba(17,24,39,0.24)',
    marginTop: 1,
  },
  materialLeaderMork: {
    borderBottomColor: 'rgba(226,232,240,0.24)',
  },
  materialVerdi: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: '#111827',
    lineHeight: 20,
    minWidth: 56,
    textAlign: 'right',
  },
  materialVerdiMork: {
    color: '#F5F7FA',
  },
  metaRad: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  metaLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: '#374151',
    marginRight: 6,
  },
  metaLabelMork: {
    color: '#E5E7EB',
  },
  metaVerdi: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#374151',
    flex: 1,
    flexShrink: 1,
  },
  metaVerdiMork: {
    color: '#D6DBE3',
  },
  metaAdresseVerdi: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#374151',
    flex: 1,
    flexShrink: 1,
  },
  prisRad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    gap: 8,
  },
  prisRadDoc: {
    paddingVertical: 5,
  },
  prisLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#6B7280',
    flex: 1,
    flexShrink: 1,
    paddingRight: 8,
  },
  prisLabelMork: {
    color: '#AEB6C2',
  },
  prisVerdi: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: '#111827',
    textAlign: 'right',
  },
  prisVerdiMork: {
    color: '#F5F7FA',
  },
  prisTotalLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: '#111827',
  },
  prisTotalLabelMork: {
    color: '#F5F7FA',
  },
  prisTotalVerdi: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: '#1B4332',
  },
  prisTotalVerdiMork: {
    color: '#8CC7A5',
  },
})
