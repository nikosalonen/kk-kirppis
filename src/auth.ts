import NextAuth from "next-auth";
import Slack from "next-auth/providers/slack";
import { prisma } from "@/lib/prisma";

// Fail closed: if the allowed team id is not configured, no one can sign in.
const ALLOWED_TEAM_ID = process.env.KOODIKLINIKKA_SLACK_TEAM_ID;
if (!ALLOWED_TEAM_ID) {
  throw new Error("KOODIKLINIKKA_SLACK_TEAM_ID is not set");
}

/** Read a Slack OIDC claim as a non-empty string, else undefined. */
function claim(profile: unknown, key: string): string | undefined {
  if (profile && typeof profile === "object") {
    const value = (profile as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [Slack],
  callbacks: {
    // Runs only at login. Reject anyone not in the Koodiklinikka workspace.
    async signIn({ profile }) {
      const teamId = claim(profile, "https://slack.com/team_id");
      return teamId !== undefined && teamId === ALLOWED_TEAM_ID;
    },
    // `account` is present only on the initial sign-in, so the upsert runs once
    // per login, not on every request that resolves the session.
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const slackId =
          claim(profile, "https://slack.com/user_id") ??
          claim(profile, "sub");
        if (slackId) {
          const name = claim(profile, "name") ?? "Koodiklinikka member";
          const image = claim(profile, "picture") ?? null;
          const user = await prisma.user.upsert({
            where: { slackId },
            create: { slackId, name, image },
            update: { name, image },
          });
          token.uid = user.id;
          token.slackId = slackId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = String(token.uid);
      if (token.slackId) session.user.slackId = String(token.slackId);
      return session;
    },
  },
});
