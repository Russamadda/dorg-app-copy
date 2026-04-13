/** Tab route name from bottom tab state (f.eks. «index», «tilbud»). */
export type FabAktivRute = string | undefined

type Listener = (aktivRute: FabAktivRute) => void
const subscribers = new Set<Listener>()

export const fabEmitter = {
  emit(aktivRute: FabAktivRute): void {
    subscribers.forEach(fn => fn(aktivRute))
  },
  on(fn: Listener): () => void {
    subscribers.add(fn)
    return () => subscribers.delete(fn)
  },
}
