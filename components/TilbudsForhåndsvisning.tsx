import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface Props {
  tekst: string
}

export function TilbudsForhåndsvisning({ tekst }: Props) {
  const linjer = tekst.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < linjer.length; i++) {
    const linje = linjer[i].trim()

    if (!linje) {
      elements.push(<View key={key++} style={styles.tomLinje} />)
      continue
    }

    if (linje === '---') {
      elements.push(<View key={key++} style={styles.divider} />)
      continue
    }

    if (i === 0) {
      elements.push(
        <Text key={key++} style={styles.tittel}>{linje}</Text>
      )
      continue
    }

    const erOverskrift = linje.endsWith(':') && linje.length < 30
    if (erOverskrift) {
      elements.push(
        <Text key={key++} style={styles.overskrift}>
          {linje.slice(0, -1)}
        </Text>
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
          <View key={key++} style={styles.bulletRad}>
            <Text style={styles.bulletPunkt}>·</Text>
            <Text style={styles.bulletLabel}>{label}: </Text>
            <Text style={styles.bulletVerdi}>{verdi}</Text>
          </View>
        )
      } else {
        elements.push(
          <View key={key++} style={styles.bulletRad}>
            <Text style={styles.bulletPunkt}>·</Text>
            <Text style={styles.bulletTekst}>{innhold}</Text>
          </View>
        )
      }
      continue
    }

    if (linje.includes('kr') && linje.includes(':')) {
      const deler = linje.split(':')
      const prisTekst = deler[0].trim()
      const prisVerdi = deler.slice(1).join(':').trim()
      const erTotal = prisTekst.toLowerCase().includes('totalt')

      elements.push(
        <View key={key++} style={styles.prisRad}>
          <Text style={[styles.prisLabel, erTotal && styles.prisTotalLabel]}>
            {prisTekst}
          </Text>
          <Text style={[styles.prisVerdi, erTotal && styles.prisTotalVerdi]}>
            {prisVerdi}
          </Text>
        </View>
      )
      continue
    }

    const erMetaInfo = ['Til:', 'Fra:', 'Dato:', 'Adresse:', 'Tlf:', 'E-post:']
      .some(prefix => linje.startsWith(prefix))

    if (erMetaInfo) {
      const kolonPos = linje.indexOf(':')
      const label = linje.slice(0, kolonPos)
      const verdi = linje.slice(kolonPos + 1).trim()
      elements.push(
        <View key={key++} style={styles.metaRad}>
          <Text style={styles.metaLabel}>{label}</Text>
          <Text style={styles.metaVerdi}>{verdi}</Text>
        </View>
      )
      continue
    }

    elements.push(
      <Text key={key++} style={styles.brodtekst}>{linje}</Text>
    )
  }

  return <View style={styles.container}>{elements}</View>
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
  },
  tomLinje: {
    height: 10,
  },
  tittel: {
    fontSize: 20,
    fontFamily: 'DMSerifDisplay_400Regular',
    color: '#1B4332',
    marginBottom: 16,
    lineHeight: 26,
  },
  overskrift: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: '#111827',
    marginTop: 16,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 14,
  },
  brodtekst: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#374151',
    lineHeight: 22,
    marginBottom: 4,
  },
  bulletRad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    paddingLeft: 4,
  },
  bulletPunkt: {
    fontSize: 14,
    color: '#4CAF82',
    marginRight: 8,
    marginTop: 1,
    lineHeight: 20,
  },
  bulletLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: '#111827',
    lineHeight: 20,
  },
  bulletVerdi: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#374151',
    lineHeight: 20,
    flex: 1,
  },
  bulletTekst: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#374151',
    lineHeight: 20,
    flex: 1,
  },
  metaRad: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  metaLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: '#374151',
    width: 72,
  },
  metaVerdi: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#374151',
    flex: 1,
  },
  prisRad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  prisLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#6B7280',
  },
  prisVerdi: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: '#111827',
  },
  prisTotalLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: '#111827',
  },
  prisTotalVerdi: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: '#1B4332',
  },
})
