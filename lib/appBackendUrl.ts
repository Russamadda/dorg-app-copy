const APP_BACKEND_BASE_URL_ENV = 'EXPO_PUBLIC_DORG_WEB_BASE_URL'

function fjernTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

export function getAppBackendBaseUrl(): string {
  const value = process.env[APP_BACKEND_BASE_URL_ENV]?.trim()

  if (!value) {
    throw new Error(`Mangler ${APP_BACKEND_BASE_URL_ENV} for app-backend-kall.`)
  }

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('Ugyldig protokoll')
    }
    return fjernTrailingSlash(url.toString())
  } catch {
    throw new Error(`${APP_BACKEND_BASE_URL_ENV} må være en gyldig URL.`)
  }
}

export function byggAppBackendUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getAppBackendBaseUrl()}${normalizedPath}`
}
