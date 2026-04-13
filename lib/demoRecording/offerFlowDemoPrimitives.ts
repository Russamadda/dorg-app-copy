import type { RefObject } from 'react'
import { Animated, Easing, type ScrollView } from 'react-native'

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export async function typeTextIncremental(
  setText: (s: string) => void,
  full: string,
  opts?: { msPerChar?: number }
): Promise<void> {
  const step = opts?.msPerChar ?? 11
  let acc = ''
  for (const ch of full) {
    acc += ch
    setText(acc)
    await sleep(step)
  }
}

export async function stepThroughPickerValues(
  values: readonly number[],
  start: number,
  target: number,
  apply: (v: number) => void,
  stepMs: number
): Promise<void> {
  const fromIdx = values.indexOf(start)
  const toIdx = values.indexOf(target)
  if (fromIdx < 0 || toIdx < 0) {
    apply(target)
    return
  }
  const dir = fromIdx < toIdx ? 1 : -1
  for (let i = fromIdx; i !== toIdx; i += dir) {
    await sleep(stepMs)
    apply(values[i + dir])
  }
}

/** Trinnvis vertikal scroll (e-postklient-lignende rolig bevegelse). */
export async function stagedScrollToY(
  ref: RefObject<ScrollView | null>,
  targetY: number,
  opts?: { steps?: number; stepDelayMs?: number }
): Promise<void> {
  const steps = Math.max(4, opts?.steps ?? 10)
  const stepDelayMs = opts?.stepDelayMs ?? 200
  for (let s = 1; s <= steps; s++) {
    const y = Math.round((targetY * s) / steps)
    ref.current?.scrollTo({ y, animated: true })
    await sleep(stepDelayMs)
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Én sammenhengende vertikal scroll (requestAnimationFrame + easing).
 * Bruker `animated: false` på hvert steg for forutsigbar jevnhet i opptak.
 */
export async function smoothScrollY(
  ref: RefObject<ScrollView | null>,
  fromY: number,
  toY: number,
  durationMs: number
): Promise<void> {
  const start = globalThis.performance?.now?.() ?? Date.now()
  const dy = toY - fromY
  return new Promise(resolve => {
    const step = () => {
      const now = globalThis.performance?.now?.() ?? Date.now()
      const t = Math.min(1, (now - start) / durationMs)
      const y = Math.round(fromY + dy * easeInOutCubic(t))
      ref.current?.scrollTo({ y, animated: false })
      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        resolve()
      }
    }
    requestAnimationFrame(step)
  })
}

export function runButtonPressAnimation(
  scale: Animated.Value,
  durationIn = 110,
  durationOut = 140
): Promise<void> {
  return new Promise(resolve => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.97,
        duration: durationIn,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: durationOut,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => resolve())
  })
}
