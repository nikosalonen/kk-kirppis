import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 configuration. Migration / introspection commands use DIRECT_URL
// (the non-pooled connection). Runtime connections are configured via the
// driver adapter in src/lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
