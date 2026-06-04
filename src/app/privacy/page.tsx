import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — KK-Kirppis",
  description:
    "What KK-Kirppis stores, why, and who it is shared with. Built to collect as little personal data as possible.",
};

const LAST_UPDATED = "2026-06-04";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-accent"
        >
          ← Back to KK-Kirppis
        </Link>

        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: {LAST_UPDATED}
        </p>

        <p className="mt-6 text-ink/90">
          KK-Kirppis is a members-only flea market for the Koodiklinikka Slack
          community. It is built to collect as little personal data as possible.
          This page explains exactly what is stored, why, and who it is shared
          with.
        </p>

        <Section title="What we store">
          <List>
            <li>
              <Term>Your Slack user ID</Term> — the single personal identifier
              we keep. It is the <Code>sub</Code> claim from Slack sign-in, plus
              the date your account record was created.
            </li>
            <li>
              <Term>Listings you post</Term> — title, description, price,
              category/platform, and status. This is content you choose to
              publish.
            </li>
            <li>
              <Term>Photos you upload</Term> — stored in our image storage; the
              database keeps only the file path, linked to your listing.
            </li>
          </List>
          <p className="mt-4 text-ink/90">
            That is the complete list. We do <Term>not</Term> store your name,
            email, password, payment details, or any Slack profile data.
          </p>
        </Section>

        <Section title="What we deliberately do not store">
          <List>
            <li>
              <Term>Your name, @handle, and avatar.</Term> These are fetched live
              from Slack each time a page renders and cached briefly (up to an
              hour). They are never written to our database, so your displayed
              identity is always current and never retained by us.
            </li>
            <li>
              <Term>Passwords.</Term> Sign-in is handled entirely by Slack
              (OAuth/OIDC).
            </li>
            <li>
              <Term>Payment information.</Term> Deals are arranged directly
              between members over Slack; no money moves through this app.
            </li>
            <li>
              <Term>Advertising or cross-site tracking.</Term> None. Our only
              analytics is the privacy-friendly, cookieless setup described under
              “Usage analytics” below.
            </li>
          </List>
        </Section>

        <Section title="Why we store it">
          <List>
            <li>
              <Term>Slack user ID</Term> — to (1) verify you are a member of the
              Koodiklinikka workspace before granting access, (2) link each
              listing to its owner, (3) ensure only you can edit or delete your
              own listings, and (4) build the “Contact seller” link that opens a
              Slack DM with you.
            </li>
            <li>
              <Term>Listings and photos</Term> — to display them in the
              marketplace for other members to browse.
            </li>
          </List>
        </Section>

        <Section title="Cookies">
          <p className="text-ink/90">
            A single essential session cookie (a signed JWT from the auth layer)
            keeps you logged in. It stores your internal account id and Slack
            user id. There are no tracking or advertising cookies.
          </p>
        </Section>

        <Section title="Usage analytics">
          <p className="text-ink/90">
            We use <Term>Vercel Web Analytics</Term> to understand aggregate
            usage (such as how many people visit a page). It is{" "}
            <Term>cookieless</Term>, does <Term>not</Term> track you across other
            sites, and does <Term>not</Term> collect personal data or fingerprint
            your device. We minimise it further: query strings are stripped and
            listing/seller IDs are redacted from page paths before anything is
            recorded, so analytics sees only the route shape (e.g.{" "}
            <Code>/listings/[id]</Code>) — never which specific item you viewed.
          </p>
        </Section>

        <Section title="Who your data is shared with">
          <p className="text-ink/90">
            These service providers process data only to run the app:
          </p>
          <List>
            <li>
              <Term>Slack</Term> — sign-in, live lookup of your display
              name/handle/avatar, and posting a “new listing” announcement to a
              workspace channel.
            </li>
            <li>
              <Term>Supabase</Term> — hosts the database and the uploaded listing
              images.
            </li>
            <li>
              <Term>Vercel</Term> — hosts and serves the application, and provides
              the cookieless Web Analytics described above.
            </li>
            <li>
              <Term>IGDB</Term> — when you use “Find game info”, only the search
              text you type is sent to look up game metadata. No personal data is
              shared with IGDB.
            </li>
          </List>
          <p className="mt-4 text-ink/90">
            We do not sell your data or share it with anyone for advertising.
          </p>
        </Section>

        <Section title="Retention and deletion">
          <List>
            <li>
              You can delete any listing you own at any time; its photos are
              deleted along with it.
            </li>
            <li>
              To remove your account record (your stored Slack user ID), contact
              the maintainer. Removing your user record also deletes all of your
              listings and their images.
            </li>
          </List>
        </Section>

        <Section title="Changes to this policy">
          <p className="text-ink/90">
            We may update this policy over time. The “last updated” date above
            reflects the most recent version.
          </p>
        </Section>

        <Section title="Contact">
          <p className="text-ink/90">
            For privacy questions, reach the maintainer on the Koodiklinikka
            Slack, or open an issue at{" "}
            <a
              href="https://github.com/nikosalonen/kk-kirppis"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline-offset-4 hover:underline"
            >
              github.com/nikosalonen/kk-kirppis
            </a>
            .
          </p>
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold tracking-tight text-ink">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 text-ink/90 marker:text-accent">
      {children}
    </ul>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
      {children}
    </code>
  );
}
