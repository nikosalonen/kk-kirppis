# KK-Kirppis

A simple, members-only flea market for used video games in the **Koodiklinikka**
Slack community. Sign in with Slack (workspace membership *is* the access gate),
post a listing, browse, and arrange deals over Slack DM. No passwords, no
payments, no middlemen.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript, Turbopack)
- **Auth.js v5** — "Sign in with Slack" (OIDC), restricted to one workspace
- **Prisma 7** + **PostgreSQL** (Supabase) via the `pg` driver adapter
- **Supabase Storage** for listing images (signed direct uploads)
- **Tailwind v4** — "arcade cartridge" dark theme
- **Vitest** for the security-critical ownership test
- Seller identity (name, **@handle**, avatar) fetched **live from Slack** and
  cached — no profile data is stored, only the Slack user id
- Optional: **IGDB** game-metadata autofill, **Slack channel announcements**

## Prerequisites

1. **Slack app** in the Koodiklinikka workspace (you need permission to install
   it). Create one at <https://api.slack.com/apps>:
   - Enable **Sign in with Slack** (OpenID Connect) — required for login.
   - Redirect URL: `https://YOUR_DOMAIN/api/auth/callback/slack`
     (and `http://localhost:3000/api/auth/callback/slack` for local dev).
   - Copy the **Client ID** and **Client Secret**.
   - Note the workspace **team id** (`T…`) — used to lock sign-in to this
     workspace.
   - **App icon:** upload `public/slack-app-icon.png` under
     *Basic Information → Display Information*.
2. **Supabase project** — gives you Postgres + Storage.
   - Create a **public** storage bucket named `listing-images`.
   - In the bucket settings, set a **file size limit (5 MB)** and restrict
     **allowed MIME types** to `image/jpeg, image/png, image/webp, image/avif`.
     This matters: images upload directly to Supabase via signed URLs, so the
     bucket config is the real server-side enforcement.
   - RLS + storage policies are captured in `supabase/security.sql`.

### Optional integrations

- **Game-metadata autofill (IGDB):** register an app at
  <https://dev.twitch.tv/console/apps> (IGDB auth runs on Twitch OAuth) to enable
  the "Find game info" button on the sell form (fills title + cover/screenshots).
  Set `IGDB_CLIENT_ID` and `IGDB_SECRET`.
- **Seller identity + channel announcements (Slack bot):** add **Bot Token
  Scopes** `users:read` (seller name / @handle / avatar) and `chat:write`
  (announcements), **reinstall** the app, and copy the **Bot User OAuth Token**
  (`xoxb-…`). Set `SLACK_BOT_TOKEN`, and `SLACK_ANNOUNCE_CHANNEL_ID` (a `C…`
  channel id) for announcements. Seller identity is read live from Slack
  (`users.info`) and cached for an hour (`src/lib/slack-profile.ts`), so it's
  always current and no profile data is persisted. **Important:** the bot must
  be installed in the *same* workspace that sign-in is gated to
  (`KOODIKLINIKKA_SLACK_TEAM_ID`), or `users.info` can't resolve members.
  Without a valid token, sellers render as "Koodiklinikka member" and
  announcements are skipped — contact links and ownership still work (they use
  the stored Slack id).

## Setup

```bash
npm install
cp .env.example .env        # then fill in real values (see below)
npm run db:migrate          # create the schema in your database
npm run db:seed             # optional: a few sample listings
npm run dev                 # http://localhost:3000
```

Fill `.env` (see `.env.example` for the full list):

- `DATABASE_URL` — Supabase **pooled** connection (`…:6543/…?pgbouncer=true`)
- `DIRECT_URL` — Supabase **direct** connection (`…:5432/…`), for migrations
- `AUTH_SECRET` — `npx auth secret`
- `AUTH_SLACK_ID` / `AUTH_SLACK_SECRET` — from the Slack app
- `KOODIKLINIKKA_SLACK_TEAM_ID` — the workspace team id (`T…`)
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_STORAGE_BUCKET`
- Optional: `IGDB_CLIENT_ID` / `IGDB_SECRET` (metadata autofill), `SLACK_BOT_TOKEN` (seller
  identity via `users.info`), `SLACK_ANNOUNCE_CHANNEL_ID` (channel announcements)

## Security model

- **Membership = access.** Sign-in is rejected unless the Slack `team_id` claim
  equals `KOODIKLINIKKA_SLACK_TEAM_ID`. Fails **closed** if the env var is unset.
- **Authorization, not just authentication.** Every mutating server action
  (`createListing`, `updateListing`, `setListingStatus`, `deleteListing`) calls
  `requireUser()` and re-checks ownership via `getOwnedListingOrThrow()`. The
  redirect in the `(app)` layout is UX only — server actions are public POST
  endpoints and enforce their own checks.
- All input is validated with **Zod**; money is stored as **integer cents**;
  queries go through **Prisma** (no raw SQL); user content is never rendered as
  raw HTML. The service-role key is server-only (never `NEXT_PUBLIC_`).

## Verification

```bash
npm run test     # ownership/IDOR guard (no DB needed — mocked Prisma)
npm run lint     # eslint, 0 problems
npm run build    # next build + tsc, full typecheck
```

**Full end-to-end (needs a database):** point `.env` at a local Postgres
(`docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`) or your
Supabase project, then `npm run db:migrate && npm run db:seed && npm run dev` and
check:

1. Sign in with a Koodiklinikka Slack account → succeeds; a non-member account →
   rejected.
2. Create a listing with photos → appears on `/` and its detail page.
3. Edit / mark-sold / delete your own listing works; sold items leave the active
   grid.
4. **IDOR:** as user A, try to edit/delete user B's listing (e.g. POST to the
   action or open `/listings/<B's id>/edit`) → denied.

## Deploy (Vercel)

1. Push to GitHub, import into Vercel.
2. Add all `.env` values as Vercel environment variables (`AUTH_URL` =
   your production URL).
3. Add the production callback URL to the Slack app.
4. Deploy. The build runs `prisma generate` automatically; run
   `npm run db:deploy` against the production database for migrations.

## Deploy on tag

A GitHub Actions workflow (`.github/workflows/release-deploy.yml`) deploys to
Vercel production when a `v*` tag is pushed or a Release is published. Requires
the `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repo secrets.

```bash
git tag v0.1.0 && git push origin v0.1.0
```

## Roadmap (post-MVP)

- Image editing on existing listings; in-app messaging; categories beyond
  video games (the data model already supports it via `Listing.category`).
