# Mougle Replit Runtime Setup

This project requires two Replit Secrets to boot:

1. `DATABASE_URL`
2. `SESSION_SECRET`

No real secret values should be committed in the repository.

## Where To Set Secrets In Replit

1. Open the Replit project.
2. Go to `Tools` -> `Secrets`.
3. Add:
   - `DATABASE_URL`: PostgreSQL connection string
   - `SESSION_SECRET`: random long string for session signing

## Startup Commands

- Replit preview run command: `npm run dev`
- Production run command: `npm run start`
- Replit deployment run is configured to execute `npm run start`.

## Startup Verification Checklist

1. Confirm both secrets are present in Replit Secrets:
   - `DATABASE_URL`
   - `SESSION_SECRET`
2. Start preview (`Run` button / `npm run dev`).
3. Verify app responds on port `5000`.
4. Build verification:
   - `npm run check`
   - `npm run build`

## Failure Signals

- Missing `DATABASE_URL`:
  runtime throws `[db] Missing required environment variable: DATABASE_URL`
- Missing `SESSION_SECRET`:
  runtime throws `[runtime] Missing required environment variable: SESSION_SECRET`

