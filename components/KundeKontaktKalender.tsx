import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

const UKEDAGER_KORT = ['ma', 'ti', 'on', 'to', 'fr', 'lør', 'søn']

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function sammeDag(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function dagerIMåned(år: number, måned: number): number {
  return new Date(år, måned + 1, 0).getDate()
}

/** Mandag = 0 … søndag = 6 for første dag i måneden */
function førsteDagMandagBasis(år: number, måned: number): number {
  const js = new Date(år, måned, 1).getDay()
  return (js + 6) % 7
}

type Props = {
  /** Styrer hvilket år/måned rutenettet viser (f.eks. i dag når ingen dato er valgt). */
  visningAnchorDato: Date
  /** Når satt, får denne dagen «valgt»-stil. `null` = ingen dag ser valgt ut (i dag vises kun som «i dag»). */
  markertValgtDato: Date | null
  onSelectDate: (d: Date) => void
}

export function KundeKontaktKalender({
  visningAnchorDato,
  markertValgtDato,
  onSelectDate,
}: Props) {
  const iDag = useMemo(() => startOfLocalDay(new Date()), [])
  const valgtNormalisert = useMemo(
    () => (markertValgtDato ? startOfLocalDay(markertValgtDato) : null),
    [markertValgtDato],
  )
  const cursorKilde = useMemo(
    () => startOfLocalDay(visningAnchorDato),
    [visningAnchorDato],
  )

  const [cursorÅr, setCursorÅr] = useState(cursorKilde.getFullYear())
  const [cursorMåned, setCursorMåned] = useState(cursorKilde.getMonth())

  useEffect(() => {
    setCursorÅr(cursorKilde.getFullYear())
    setCursorMåned(cursorKilde.getMonth())
  }, [cursorKilde])

  const månedTittel = useMemo(() => {
    const d = new Date(cursorÅr, cursorMåned, 1)
    const raw = d.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }, [cursorÅr, cursorMåned])

  const rutenett = useMemo(() => {
    const antall = dagerIMåned(cursorÅr, cursorMåned)
    const offset = førsteDagMandagBasis(cursorÅr, cursorMåned)
    const celler: Array<{ dag: number; iMåned: boolean; dato: Date }> = []

    const forrige = new Date(cursorÅr, cursorMåned, 0)
    const dagerForrige = forrige.getDate()

    for (let i = 0; i < offset; i++) {
      const dag = dagerForrige - offset + i + 1
      const dato = new Date(cursorÅr, cursorMåned - 1, dag)
      celler.push({ dag, iMåned: false, dato: startOfLocalDay(dato) })
    }

    for (let dag = 1; dag <= antall; dag++) {
      const dato = startOfLocalDay(new Date(cursorÅr, cursorMåned, dag))
      celler.push({ dag, iMåned: true, dato })
    }

    const rest = 42 - celler.length
    for (let i = 1; i <= rest; i++) {
      const dato = startOfLocalDay(new Date(cursorÅr, cursorMåned + 1, i))
      celler.push({ dag: i, iMåned: false, dato })
    }

    return celler
  }, [cursorÅr, cursorMåned])

  const forrigeMåned = useCallback(() => {
    void Haptics.selectionAsync()
    if (cursorMåned === 0) {
      setCursorMåned(11)
      setCursorÅr(y => y - 1)
    } else {
      setCursorMåned(m => m - 1)
    }
  }, [cursorMåned])

  const nesteMåned = useCallback(() => {
    void Haptics.selectionAsync()
    if (cursorMåned === 11) {
      setCursorMåned(0)
      setCursorÅr(y => y + 1)
    } else {
      setCursorMåned(m => m + 1)
    }
  }, [cursorMåned])

  const velgDag = useCallback(
    (dato: Date) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      onSelectDate(dato)
    },
    [onSelectDate]
  )

  return (
    <View style={styles.wrap}>
      <View style={styles.månedRad}>
        <Pressable
          onPress={forrigeMåned}
          style={({ pressed }) => [styles.månedKnapp, pressed && styles.månedKnappPressed]}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.85)" />
        </Pressable>
        <Text style={styles.månedTittel} numberOfLines={1}>
          {månedTittel}
        </Text>
        <Pressable
          onPress={nesteMåned}
          style={({ pressed }) => [styles.månedKnapp, pressed && styles.månedKnappPressed]}
          hitSlop={12}
        >
          <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.85)" />
        </Pressable>
      </View>

      <View style={styles.ukerad}>
        {UKEDAGER_KORT.map(d => (
          <View key={d} style={styles.ukeCelle}>
            <Text style={styles.ukelabel}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: 6 }, (_, rad) => (
          <View key={rad} style={styles.gridRad}>
            {rutenett.slice(rad * 7, rad * 7 + 7).map((c, kol) => {
              const idx = rad * 7 + kol
              const erMedUtvalg =
                valgtNormalisert !== null && sammeDag(c.dato, valgtNormalisert)
              const erIDag = sammeDag(c.dato, iDag)
              const celleStyle: ViewStyle[] = [styles.dagCelle]
              if (!c.iMåned) celleStyle.push(styles.dagUtenfor)
              if (erMedUtvalg) celleStyle.push(styles.dagValgt)

              return (
                <Pressable
                  key={`${c.dato.getTime()}-${idx}`}
                  onPress={() => velgDag(c.dato)}
                  style={({ pressed }) => [
                    ...celleStyle,
                    pressed && !erMedUtvalg && styles.dagPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.dagTekst,
                      !c.iMåned && styles.dagTekstUtenfor,
                      erMedUtvalg && styles.dagTekstValgt,
                      erIDag && !erMedUtvalg && styles.dagTekstIDag,
                    ]}
                  >
                    {c.dag}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 10,
  },
  månedRad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  månedKnapp: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  månedKnappPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  månedTittel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: '#F3F4F6',
    paddingHorizontal: 8,
  },
  ukerad: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 6,
  },
  ukeCelle: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  ukelabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.38)',
    textTransform: 'lowercase',
  },
  grid: {
    width: '100%',
  },
  gridRad: {
    flexDirection: 'row',
    width: '100%',
  },
  dagCelle: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: 2,
  },
  dagUtenfor: {
    opacity: 0.38,
  },
  dagValgt: {
    backgroundColor: 'rgba(74,222,128,0.22)',
    borderWidth: 1.5,
    borderColor: '#4ADE80',
  },
  dagPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dagTekst: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: '#F3F4F6',
  },
  dagTekstUtenfor: {
    color: 'rgba(255,255,255,0.45)',
  },
  dagTekstValgt: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
  },
  dagTekstIDag: {
    color: '#4ADE80',
    fontFamily: 'DMSans_600SemiBold',
  },
})

export { startOfLocalDay }
