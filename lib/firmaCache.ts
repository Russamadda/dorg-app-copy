import type { Firma } from '../types'

let cachedFirma: Firma | null = null

export function getCachedFirma() {
  return cachedFirma
}

export function setCachedFirma(firma: Firma | null) {
  cachedFirma = firma
}
