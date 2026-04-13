import { Image, type ImageSourcePropType } from 'react-native'

/**
 * Produksjonsbakgrunn for Forespørsler, Tilbud og Bedrift (via AppBackground i tab-/bedrift-layout).
 * Én statisk require — Metro bundler den; ingen runtime-byttelogikk.
 */
export const BRAND_BACKGROUND_IMAGE: ImageSourcePropType = require('../assets/backgrounds/test6.png')

/**
 * Synlig underlag under dekke-til-fyll (kantflimmer / før første frame).
 * Valgt for å ligge nær test6 (lys grå tone).
 */
export const BRAND_BACKGROUND_BASE_COLOR = '#E6E8EC'

export const BACKGROUND_FALLBACK_COLOR = BRAND_BACKGROUND_BASE_COLOR

/** Varmer opp JPEG/PNG i bildbuffer før faner vises — reduserer pop-in ved første navigasjon. */
export function prefetchBrandBackground(): Promise<boolean> | void {
  try {
    const resolved = Image.resolveAssetSource(BRAND_BACKGROUND_IMAGE)
    if (resolved?.uri) {
      return Image.prefetch(resolved.uri)
    }
  } catch {
    // resolveAssetSource skal normalt ikke feile for bundlet require
  }
}
