type Listener = () => void
const subscribers = new Set<Listener>()

export const fabEmitter = {
  emit(): void {
    subscribers.forEach(fn => fn())
  },
  on(fn: Listener): () => void {
    subscribers.add(fn)
    return () => subscribers.delete(fn)
  },
}
