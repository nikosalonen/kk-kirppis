-- Add Slack @handle to User
ALTER TABLE "User" ADD COLUMN "handle" TEXT;

-- Drop the condition column and its enum (issues go in the description now)
ALTER TABLE "Listing" DROP COLUMN "condition";
DROP TYPE "Condition";
