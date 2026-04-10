import type { Ionicons } from '@expo/vector-icons'

export type TjenesteIkonNavn = keyof typeof Ionicons.glyphMap

/**
 * Kartlegger tjenestenavn (fritekst fra firma) til Ionicons *-outline for konsistent familie.
 * Mer spesifikke treff først.
 */
export function ikonForTjeneste(navn: string): TjenesteIkonNavn {
  const n = navn.toLowerCase()

  if (n.includes('baderom') || n.includes('baderoms') || n.includes('våtrom') || n.includes('vatro'))
    return 'water-outline'
  if (n.includes('flis') || n.includes('flising')) return 'grid-outline'
  if (n.includes('kjøkken')) return 'restaurant-outline'
  if (n.includes('garderobe') || n.includes('innredning') || n.includes('skap')) return 'file-tray-stacked-outline'
  if (n.includes('dør') || n.includes('dor') || n.includes('vindu')) return 'enter-outline'
  if (n.includes('gulvbytte') || n.includes('parkett') || n.includes('gulvlegg') || n.includes('gulv'))
    return 'layers-outline'
  if (n.includes('taktek') || n.includes('tekking') || (n.includes('tak') && !n.includes('undertak')))
    return 'home-outline'
  if (n.includes('muring') || n.includes('mur') || n.includes('betong') || n.includes('støp'))
    return 'cube-outline'
  if (n.includes('terrasse') || n.includes('platting') || n.includes('dekk')) return 'leaf-outline'
  if (n.includes('fasade') || n.includes('utvendig') || n.includes('kledning')) return 'business-outline'
  if (n.includes('riving') || n.includes('rive')) return 'trash-outline'
  if (n.includes('rør') || n.includes('vvs') || n.includes('rorlegg') || n.includes('sanitær'))
    return 'water-outline'
  if (n.includes('elektro') || n.includes('elektr')) return 'flash-outline'
  if (n.includes('snekker') || n.includes('tømrer') || n.includes('tomrer')) return 'hammer-outline'
  if (n.includes('maling') || n.includes('male')) return 'color-filter-outline'
  if (n.includes('taklegg')) return 'home-outline'
  if (n.includes('entrepen') || n.includes('graving') || n.includes('anlegg')) return 'trail-sign-outline'
  if (n.includes('montering')) return 'build-outline'
  if (n.includes('renover') || n.includes('oppussing')) return 'construct-outline'

  return 'briefcase-outline'
}
