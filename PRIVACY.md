# Privacy Policy

_Last updated: 2026-06-04_

KK-Kirppis is a members-only flea market for the Koodiklinikka Slack community.
It is built to collect as little personal data as possible. This page explains
exactly what is stored, why, and who it is shared with.

## What we store

- **Your Slack user ID** — the single personal identifier we keep. It is the
  `sub` claim from Slack sign-in, plus the date your account record was created.
- **Listings you post** — title, description, price, category/platform, and
  status. This is content you choose to publish.
- **Photos you upload** — stored in our image storage; the database keeps only
  the file path, linked to your listing.

That is the complete list. We do **not** store your name, email, password,
payment details, or any Slack profile data.

## What we deliberately do _not_ store

- **Your name, @handle, and avatar.** These are fetched live from Slack each
  time a page renders and cached briefly (up to an hour). They are never written
  to our database, so your displayed identity is always current and never
  retained by us.
- **Passwords.** Sign-in is handled entirely by Slack (OAuth/OIDC).
- **Payment information.** Deals are arranged directly between members over
  Slack; no money moves through this app.
- **Advertising or cross-site tracking.** None. Our only analytics is the
  privacy-friendly, cookieless setup described under "Usage analytics" below.

## Why we store it

- **Slack user ID** — to (1) verify you are a member of the Koodiklinikka
  workspace before granting access, (2) link each listing to its owner, (3)
  ensure only you can edit or delete your own listings, and (4) build the
  "Contact seller" link that opens a Slack DM with you.
- **Listings and photos** — to display them in the marketplace for other
  members to browse.

## Cookies

A single essential session cookie (a signed JWT from the auth layer) keeps you
logged in. It stores your internal account id and Slack user id. There are no
tracking or advertising cookies.

## Usage analytics

We use **Vercel Web Analytics** to understand aggregate usage (such as how many
people visit a page). It is **cookieless**, does **not** track you across other
sites, and does **not** collect personal data or fingerprint your device. We
minimise it further: query strings are stripped and listing/seller IDs are
redacted from page paths before anything is recorded, so analytics sees only the
route shape (e.g. `/listings/[id]`) — never which specific item you viewed.

## Who your data is shared with

These service providers process data only to run the app:

- **Slack** — sign-in, live lookup of your display name/handle/avatar, and
  posting a "new listing" announcement to a workspace channel.
- **Supabase** — hosts the database and the uploaded listing images.
- **Vercel** — hosts and serves the application, and provides the cookieless
  Web Analytics described above.
- **IGDB** — when you use "Find game info", only the search text you type is
  sent to look up game metadata. No personal data is shared with IGDB.

We do not sell your data or share it with anyone for advertising.

## Retention and deletion

- You can delete any listing you own at any time; its photos are deleted along
  with it.
- To remove your account record (your stored Slack user ID), contact the
  maintainer. Removing your user record also deletes all of your listings and
  their images.

## Changes to this policy

We may update this policy over time. The "last updated" date above reflects the
most recent version.

## Contact

For privacy questions, reach the maintainer on the Koodiklinikka Slack, or open
an issue at <https://github.com/nikosalonen/kk-kirppis>.
