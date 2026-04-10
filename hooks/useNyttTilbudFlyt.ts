import { useCallback, useState } from 'react'
import type { Forespørsel } from '../types'

/**
 * FAB → tjenesteark → tilbudsmodal. Tjenesteark kan åpnes på nytt fra modal uten å lukke den.
 */
export function useNyttTilbudFlyt() {
  const [valgtTjeneste, setValgtTjeneste] = useState<string | null>(null)
  const [visTjenesteSheet, setVisTjenesteSheet] = useState(false)
  const [visNyttTilbudModal, setVisNyttTilbudModal] = useState(false)
  const [utkastKilde, setUtkastKilde] = useState<Forespørsel | null>(null)

  const fabTrykket = useCallback(() => {
    setVisTjenesteSheet(true)
  }, [])

  const lukkTjenesteSheet = useCallback(() => {
    setVisTjenesteSheet(false)
  }, [])

  const åpneTjenesteVelger = useCallback(() => {
    setVisTjenesteSheet(true)
  }, [])

  const onTjenesteValgt = useCallback((tjeneste: string) => {
    setUtkastKilde(null)
    setValgtTjeneste(tjeneste)
    setVisNyttTilbudModal(true)
  }, [])

  const åpneMedUtkast = useCallback((f: Forespørsel) => {
    setValgtTjeneste(f.jobbType?.trim() || 'annet')
    setUtkastKilde(f)
    setVisNyttTilbudModal(true)
  }, [])

  const konsumerUtkastKilde = useCallback(() => {
    setUtkastKilde(null)
  }, [])

  const lukkModal = useCallback(() => {
    setVisNyttTilbudModal(false)
    setValgtTjeneste(null)
    setUtkastKilde(null)
  }, [])

  return {
    valgtTjeneste,
    visTjenesteSheet,
    visNyttTilbudModal,
    utkastKilde,
    fabTrykket,
    lukkTjenesteSheet,
    åpneTjenesteVelger,
    onTjenesteValgt,
    åpneMedUtkast,
    konsumerUtkastKilde,
    lukkModal,
  }
}
