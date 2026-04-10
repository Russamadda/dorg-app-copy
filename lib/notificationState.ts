import { useEffect, useState } from 'react'

type BadgeListener = (count: number) => void

const subscribers = new Set<BadgeListener>()
let currentBadgeCount = 0

export function oppdaterBadge(count: number) {
  currentBadgeCount = count
  subscribers.forEach(listener => listener(count))
}

export function useBadgeCount() {
  const [count, setCount] = useState(currentBadgeCount)

  useEffect(() => {
    subscribers.add(setCount)
    setCount(currentBadgeCount)

    return () => {
      subscribers.delete(setCount)
    }
  }, [])

  return count
}
