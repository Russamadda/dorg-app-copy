import type { TilbudHendelse } from '../types'
import { hentTilbudHendelser } from './supabase'

const cache = new Map<string, TilbudHendelse[]>()
const inflight = new Map<string, Promise<TilbudHendelse[]>>()

export function getCachedTilbudHendelser(tilbudId: string): TilbudHendelse[] | undefined {
  return cache.get(tilbudId)
}

export function setCachedTilbudHendelser(tilbudId: string, hendelser: TilbudHendelse[]) {
  cache.set(tilbudId, hendelser)
}

export async function prefetchTilbudHendelser(tilbudId: string): Promise<TilbudHendelse[]> {
  const cached = cache.get(tilbudId)
  if (cached) return cached

  const existing = inflight.get(tilbudId)
  if (existing) return existing

  const promise = hentTilbudHendelser(tilbudId)
    .then(result => {
      cache.set(tilbudId, result)
      return result
    })
    .finally(() => {
      inflight.delete(tilbudId)
    })

  inflight.set(tilbudId, promise)
  return promise
}

