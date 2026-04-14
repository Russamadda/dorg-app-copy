type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeFirmaOppsettEndret(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifyFirmaOppsettEndret(): void {
  for (const cb of listeners) {
    try {
      cb()
    } catch (e) {
      console.warn('[firmaSetupEvents] listener feilet:', e)
    }
  }
}
