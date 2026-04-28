interface TilbudPrisGrunnlag {
  generertTekst?: string | null
  prisEksMva?: number
  timer?: number
  materialkostnad?: number
  timepris?: number
  materialPaslag?: number
}

export function rundOppTilNarmeste100(pris: number): number {
  return Math.ceil(pris / 100) * 100
}

export function beregnMaterialPrisDetaljer({
  materialkostnad = 0,
  materialPaslag = 15,
}: {
  materialkostnad?: number
  materialPaslag?: number
}): {
  registrertEksMva: number
  paslagBelop: number
  materialerEksMva: number
  materialerInklMva: number
} {
  const registrertEksMva = Math.round(materialkostnad)
  const paslagBelop = Math.round(registrertEksMva * (materialPaslag / 100))
  const materialerEksMva = registrertEksMva + paslagBelop
  const materialerInklMva = rundOppTilNarmeste100(materialerEksMva * 1.25)

  return {
    registrertEksMva,
    paslagBelop,
    materialerEksMva,
    materialerInklMva,
  }
}

export function beregnTilbudPrisLinjer({
  timer = 0,
  materialkostnad = 0,
  timepris = 950,
  materialPaslag = 15,
}: {
  timer?: number
  materialkostnad?: number
  timepris?: number
  materialPaslag?: number
}): {
  arbeidEksMva: number
  materialerEksMva: number
  totalEksMva: number
  arbeidInklMva: number
  materialerInklMva: number
  totalInklMva: number
} {
  const arbeidEksMva = Math.round(timer * timepris)
  const { materialerEksMva, materialerInklMva } = beregnMaterialPrisDetaljer({
    materialkostnad,
    materialPaslag,
  })
  const totalEksMva = arbeidEksMva + materialerEksMva

  const arbeidInklMva = rundOppTilNarmeste100(arbeidEksMva * 1.25)
  const totalInklMva = rundOppTilNarmeste100(totalEksMva * 1.25)

  return {
    arbeidEksMva,
    materialerEksMva,
    totalEksMva,
    arbeidInklMva,
    materialerInklMva,
    totalInklMva,
  }
}

export function hentTotalInklMvaFraTekst(tekst?: string | null): number | null {
  if (!tekst) return null

  const treff = tekst.match(/Totalt inkl\. mva:\s*kr\s*([0-9\s.,]+)/i)
  if (!treff?.[1]) return null

  const tall = Number(treff[1].replace(/[^\d]/g, ''))
  return Number.isFinite(tall) ? tall : null
}

export function beregnTilbudTotalInklMva({
  generertTekst,
  prisEksMva = 0,
  timer,
  materialkostnad,
  timepris = 950,
  materialPaslag = 15,
}: TilbudPrisGrunnlag): number {
  const totalFraTekst = hentTotalInklMvaFraTekst(generertTekst)
  if (totalFraTekst !== null) {
    return totalFraTekst
  }

  const harPrisgrunnlag = (timer ?? 0) > 0 || (materialkostnad ?? 0) > 0
  if (harPrisgrunnlag) {
    return beregnTilbudPrisLinjer({
      timer: timer ?? 0,
      materialkostnad: materialkostnad ?? 0,
      timepris,
      materialPaslag,
    }).totalInklMva
  }

  return rundOppTilNarmeste100(prisEksMva * 1.25)
}
