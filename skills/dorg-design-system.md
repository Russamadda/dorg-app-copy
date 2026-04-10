# Dorg Design System

Du er en React Native-utvikler som jobber på Dorg — en norsk AI-tilbudsapp for håndverkere. Følg alltid dette designsystemet nøyaktig. Ikke finn opp nye farger, fonter eller komponentmønstre.

## Fargepalett

Primary (mørk grønn):     #1B4332
Accent (grønn):           #16A34A
Background:               #F0EFE9
Surface (kort):           #FFFFFF
Surface border:           #E5E7EB
Text primary:             #111827
Text secondary:           #374151
Text muted:               #9CA3AF
Danger (rød):             #DC2626
Warning (oransje):        #D97706

Statusfarger tilbud:
  Grønn outline:          #86EFAC  (0-2 dager)
  Oransje outline:        #FCD34D  (3-6 dager)
  Lys rød outline:        #FCA5A5  (7 dager)
  Sterk rød outline:      #EF4444  (over 1 uke)
  Blå (justering):        #BFDBFE  border / #2563EB tekst
  Godkjent checkmark:     #16A34A  fylt sirkel

## Typografi

Font stack: DMSerifDisplay_400Regular og DMSans-varianter

Skjermtittel:        DMSerifDisplay_400Regular, 28px, color: #1B4332
Seksjonstittel:      DMSans_700Bold, 18-20px, color: #111827
Korttittel:          DMSans_700Bold, 16px, color: #111827
Brødtekst:           DMSans_400Regular, 14-16px, color: #374151
Label caps:          DMSans_500Medium, 10-11px, letterSpacing 1-1.2, uppercase, color: #9CA3AF
Muted tekst:         DMSans_400Regular, 12-13px, color: #9CA3AF
Knapp primær:        DMSans_700Bold, 15-16px, color: #fff
Knapp sekundær:      DMSans_500Medium, 14-15px, color: #374151

## Spacing

Skjerm padding horisontalt:   16px
Kort padding:                 16-20px
Gap mellom kort:              10-12px
Gap mellom seksjoner:         24-32px
Gap mellom piller/chips:      8px

## Kort

Standard kort:
{
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 16,
}

Kort med border:
{
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  padding: 16,
}

## Knapper

Primærknapp (mørk grønn, full bredde):
{
  backgroundColor: '#1B4332',
  borderRadius: 14,
  height: 54,
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
}
Tekst: DMSans_700Bold, 16px, #fff

Sekundærknapp (outlined):
{
  backgroundColor: '#fff',
  borderRadius: 14,
  borderWidth: 1.5,
  borderColor: '#E5E7EB',
  height: 54,
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
}
Tekst: DMSans_500Medium, 15px, #374151

Farlig knapp (rød tekst, ingen bakgrunn):
Tekst: DMSans_400Regular, 13px, #DC2626

## Pills og chips

Aktiv pill:
{
  backgroundColor: '#1B4332',
  borderRadius: 999,
  paddingVertical: 8,
  paddingHorizontal: 16,
  minHeight: 44,
  alignItems: 'center',
  justifyContent: 'center',
}
Tekst: DMSans_600SemiBold eller DMSans_700Bold, 13px, #fff

Inaktiv pill:
{
  backgroundColor: '#fff',
  borderRadius: 999,
  borderWidth: 1.5,
  borderColor: '#E5E7EB',
  paddingVertical: 8,
  paddingHorizontal: 16,
  minHeight: 44,
  alignItems: 'center',
  justifyContent: 'center',
}
Tekst: DMSans_400Regular, 13px, #374151

## Input-felt

Standard input:
{
  height: 52,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#D1D5DB',
  borderRadius: 12,
  paddingHorizontal: 16,
  fontFamily: 'DMSans_400Regular',
  fontSize: 16,
  color: '#111827',
}

Stort tall-input (timepris osv):
{
  fontFamily: 'DMSans_700Bold',
  fontSize: 32,
  color: '#1B4332',
  textAlign: 'center',
  borderBottomWidth: 2,
  borderBottomColor: '#1B4332',
  paddingBottom: 8,
}

## Tap-targets

Minimum 44x44px på alle trykk-elementer.
Bruk padding for å øke tap-area uten å endre visuell størrelse.
Aldri to trykk-elementer nærmere enn 8px.

## iOS-patterns

Alltid SafeAreaView med edges={[]}
Modal: animationType="slide" presentationStyle="pageSheet"
Keyboard: KeyboardAvoidingView behavior="padding" på iOS
ScrollView: showsVerticalScrollIndicator={false}
Tab bar: alltid legg til getFloatingTabBarPadding(insets.bottom) i contentContainerStyle

## Progress-ring (tilbudskort)

SVG-basert ring med timeglass-ikon inni.
Størrelse: 30x30px
Stroke-width: 2.5
Spora: #E5E7EB
Aktiv: basert på statusfarge
Rotasjon: -90 grader (starter fra toppen)

## Animasjoner

Fade mellom steg/skjermer: opacity 0→1 over 200ms
Spring for modal: standard iOS slide-up
Ingen komplekse animasjoner — enkelhet prioriteres