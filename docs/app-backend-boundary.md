# App Backend Boundary (dorg-app)

## Backend-owned responsibilities (dorg-web-priv)

- Offer generation prompt and business logic.
- Adjustment-summary prompt and generation.
- Email HTML rendering for offer and reminders.
- Server-side authz checks for app routes and route payload validation.

## App-owned responsibilities

- UI/input orchestration only.
- Send authenticated API requests with `Bearer <session.access_token>`.
- Render returned text/status and show errors to the user.

## Required env vars (this project)

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_DORG_WEB_BASE_URL`

No runtime dependency remains on:

- `EXPO_PUBLIC_OPENAI_API_KEY`
- `EXPO_PUBLIC_RESEND_API_KEY`

## Routes called by app

- `POST /api/app/generer-tilbud`
- `POST /api/app/send-tilbud-epost`
- `POST /api/app/send-paminnelse-epost`
- `POST /api/app/oppsummer-justering`

Payload contracts are mirrored in `lib/appBackendContract.ts`.

## Cleanup note

- `dorg-oppsummering.md` still contains historical architecture notes and may be stale versus current centralized backend behavior.
