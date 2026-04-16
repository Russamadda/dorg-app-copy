import * as Linking from 'expo-linking'

export type AuthCallbackParams = {
  accessToken?: string
  refreshToken?: string
  code?: string
  type?: string
  errorCode?: string
  errorDescription?: string
}

function finnParam(
  navn: string,
  queryParams: URLSearchParams,
  hashParams: URLSearchParams
) {
  return hashParams.get(navn) ?? queryParams.get(navn) ?? undefined
}

export function hentAuthCallbackParams(url: string): AuthCallbackParams {
  const [utenHash, hash = ''] = url.split('#')
  const query = utenHash.includes('?') ? utenHash.split('?')[1] ?? '' : ''
  const queryParams = new URLSearchParams(query)
  const hashParams = new URLSearchParams(hash)

  return {
    accessToken: finnParam('access_token', queryParams, hashParams),
    refreshToken: finnParam('refresh_token', queryParams, hashParams),
    code: finnParam('code', queryParams, hashParams),
    type: finnParam('type', queryParams, hashParams),
    errorCode: finnParam('error_code', queryParams, hashParams),
    errorDescription: finnParam('error_description', queryParams, hashParams),
  }
}

export function normaliserEpost(epost: string) {
  return epost.trim().toLowerCase()
}

export function erGyldigEpost(epost: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normaliserEpost(epost))
}

export function lagAuthRedirectUrl(path = '/auth/reset-password') {
  return Linking.createURL(path)
}

export function oversettAuthFeil(melding?: string | null) {
  if (!melding) {
    return 'Noe gikk galt. Prøv igjen.'
  }

  const normalisert = melding.toLowerCase()

  if (normalisert.includes('invalid login credentials')) {
    return 'E-post eller passord er feil. Hvis du ikke husker passordet, bruk "Glemt passord?".'
  }

  if (normalisert.includes('email not confirmed')) {
    return 'E-posten er ikke bekreftet ennå. Åpne lenken i e-posten og prøv igjen.'
  }

  if (normalisert.includes('user already registered')) {
    return 'Det finnes allerede en konto med denne e-posten.'
  }

  if (normalisert.includes('password should be at least')) {
    return 'Passordet må være minst 6 tegn.'
  }

  if (normalisert.includes('unable to validate email address')) {
    return 'E-postadressen ser ugyldig ut.'
  }

  if (normalisert.includes('invalid refresh token') || normalisert.includes('refresh token not found')) {
    return 'Økten din var utløpt. Logg inn på nytt.'
  }

  if (normalisert.includes('same password')) {
    return 'Velg et nytt passord som er forskjellig fra det gamle.'
  }

  if (normalisert.includes('network request failed')) {
    return 'Kunne ikke kontakte serveren. Sjekk nettet og prøv igjen.'
  }

  return melding
}
