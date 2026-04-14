import AsyncStorage from '@react-native-async-storage/async-storage'

const lagNøkkel = (firmaId: string) => `tilbud_pill_ack_v1_${firmaId}`

export type TilbudPillAck = { justeringAckAt: number; godkjentAckAt: number }

const standard: TilbudPillAck = { justeringAckAt: 0, godkjentAckAt: 0 }

export async function hentTilbudPillAck(firmaId: string): Promise<TilbudPillAck> {
  try {
    const raw = await AsyncStorage.getItem(lagNøkkel(firmaId))
    if (!raw) return { ...standard }
    const o = JSON.parse(raw) as Partial<TilbudPillAck>
    return {
      justeringAckAt: typeof o.justeringAckAt === 'number' ? o.justeringAckAt : 0,
      godkjentAckAt: typeof o.godkjentAckAt === 'number' ? o.godkjentAckAt : 0,
    }
  } catch {
    return { ...standard }
  }
}

export async function lagreTilbudPillAck(firmaId: string, ack: TilbudPillAck): Promise<void> {
  await AsyncStorage.setItem(lagNøkkel(firmaId), JSON.stringify(ack))
}

export async function lagreTilbudPillAckDel(
  firmaId: string,
  del: 'justering' | 'godkjent',
  ts: number
): Promise<void> {
  const cur = await hentTilbudPillAck(firmaId)
  const next: TilbudPillAck =
    del === 'justering'
      ? { ...cur, justeringAckAt: ts }
      : { ...cur, godkjentAckAt: ts }
  await lagreTilbudPillAck(firmaId, next)
}
