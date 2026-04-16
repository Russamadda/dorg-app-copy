import type { Firma } from '../types'

let cachedFirma: Firma | null = null

export function getCachedFirma() {
  return cachedFirma
}

export function getCachedFirmaForUser(userId: string | null | undefined) {
  if (!userId) return null
  if (!cachedFirma) return null
  return cachedFirma.userId === userId ? cachedFirma : null
}

export function setCachedFirma(firma: Firma | null) {
  cachedFirma = firma
}

export function clearCachedFirma() {
  cachedFirma = null
}
