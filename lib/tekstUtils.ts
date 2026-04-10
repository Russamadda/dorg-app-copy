export function fjernKortLinje(tekst: string): string {
  return tekst
    .split('\n')
    .filter(linje => !linje.startsWith('KORT:'))
    .join('\n')
    .trim()
}
