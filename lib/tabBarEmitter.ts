type Listener = (visible: boolean) => void
const subscribers = new Set<Listener>()
let currentVisible = true

export const tabBarEmitter = {
  setVisible(visible: boolean): void {
    currentVisible = visible
    subscribers.forEach(fn => fn(visible))
  },
  getVisible(): boolean {
    return currentVisible
  },
  on(fn: Listener): () => void {
    subscribers.add(fn)
    fn(currentVisible)
    return () => subscribers.delete(fn)
  },
}
