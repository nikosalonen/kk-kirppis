import type { DefaultSession } from "next-auth";

// Augment the session/JWT so `session.user.id` (our DB User.id) and `slackId`
// are typed everywhere. `session.user.id` is the anchor for ownership checks.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      slackId: string;
      handle: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    slackId?: string;
    handle?: string;
  }
}
