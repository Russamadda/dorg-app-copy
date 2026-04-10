/**
 * DESIGN LAB — Sentral theme-fil
 * Dette er den ENESTE filen som endres mellom design-overhaul-forsøk.
 * Importer fra denne filen i stedet for constants/colors når du redesigner.
 */

export const theme = {
  colors: {
    rootBg: '#EEF1F6',
    surface: '#FFFFFF',
    surfaceMuted: '#F4F5F8',
    surfaceTint: '#F0F2F6',
    title: '#111111',
    body: '#333333',
    muted: '#888888',
    mutedSoft: '#AAAAAA',
    icon: '#444444',
    divider: '#F0F0F0',
    chipText: '#666666',
    chipActiveBg: '#111111',
    chipActiveText: '#FFFFFF',
    destructive: '#CC3333',
    statusNy: '#111111',
    statusAvventer: '#B8860B',
    statusGodkjent: '#2D7A4F',
    statusAvslatt: '#888888',
  },

  fonts: {
    body: 'DMSans_400Regular',
    medium: 'DMSans_500Medium',
    bold: 'DMSans_700Bold',
  },

  typography: {
    screenTitle: {
      fontSize: 28,
      lineHeight: 32,
      fontFamily: 'DMSans_700Bold',
      color: '#111111',
    },
    cardTitle: {
      fontSize: 16,
      lineHeight: 21,
      fontFamily: 'DMSans_700Bold',
      color: '#111111',
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'DMSans_400Regular',
      color: '#333333',
    },
    metadata: {
      fontSize: 13,
      lineHeight: 18,
      fontFamily: 'DMSans_400Regular',
      color: '#888888',
    },
    section: {
      fontSize: 12,
      lineHeight: 16,
      fontFamily: 'DMSans_700Bold',
      color: '#888888',
      letterSpacing: 1,
      textTransform: 'uppercase' as const,
    },
    price: {
      fontSize: 22,
      lineHeight: 26,
      fontFamily: 'DMSans_700Bold',
      color: '#111111',
    },
    topBarBrand: {
      fontSize: 15,
      lineHeight: 18,
      fontFamily: 'DMSans_700Bold',
      color: '#111111',
      letterSpacing: 2,
    },
  },

  radius: {
    input: 12,
    md: 16,
    card: 20,
    modal: 24,
    full: 999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    screenPadding: 16,
  },

  shadows: {
    card: {
      shadowColor: '#B0BAC8',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 6,
    },
    soft: {
      shadowColor: '#B0BAC8',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    tabBar: {
      shadowColor: '#B0BAC8',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 10,
    },
  },

  status: {
    avventer: { label: 'Avventer', color: '#B8860B' },
    sendt: { label: 'Ny', color: '#111111' },
    godkjent: { label: 'Godkjent', color: '#2D7A4F' },
    justering: { label: 'Justering', color: '#B8860B' },
    paminnelse: { label: 'Avventer', color: '#B8860B' },
    siste: { label: 'Avventer', color: '#B8860B' },
    avslatt: { label: 'Avslått', color: '#888888' },
  },

  topBar: {
    iconButtonSize: 38,
    iconCircle: {
      backgroundColor: '#FFFFFF',
      borderRadius: 999,
    },
  },

  tabBar: {
    height: 76,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  chip: {
    horizontalPadding: 18,
    verticalPadding: 9,
    borderRadius: 999,
    fontSize: 14,
  },

  card: {
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },

  input: {
    height: 46,
    backgroundColor: '#F4F5F8',
    borderRadius: 12,
    paddingHorizontal: 14,
  },

  chevron: {
    size: 34,
    backgroundColor: '#F0F2F6',
    color: '#888888',
  },
} as const

export type ThemeStatusKey = keyof typeof theme.status

export function getStatusMeta(status?: string) {
  const key = (status?.toLowerCase?.() ?? 'avventer') as ThemeStatusKey
  return theme.status[key] ?? theme.status.avventer
}

export const neoSurfaceShadow = {
  backgroundColor: theme.colors.surface,
  borderRadius: theme.radius.card,
  ...theme.shadows.card,
} as const

export const neoSoftShadow = {
  ...theme.shadows.soft,
} as const
