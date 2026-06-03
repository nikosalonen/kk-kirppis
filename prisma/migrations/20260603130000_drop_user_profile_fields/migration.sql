-- Seller identity (name, @handle, avatar) is now fetched live from Slack
-- (users.info) and cached, so we no longer persist any profile data — only
-- the Slack user id remains. See src/lib/slack-profile.ts.
ALTER TABLE "User" DROP COLUMN "name";
ALTER TABLE "User" DROP COLUMN "handle";
ALTER TABLE "User" DROP COLUMN "image";
