export function fjernKortLinje(tekst: string): string {
  return tekst
    .split('\n')
    .filter(linje => !linje.startsWith('KORT:'))
    .join('\n')
    .trim()
}

/** Enkel stripping av # og ** for redigerbar forhåndsvisning (ikke full markdown-parser). */
export function rensEnkelMarkdownForRedigering(tekst: string): string {
  return tekst
    .replace(/^#{1,6}\s/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
}
