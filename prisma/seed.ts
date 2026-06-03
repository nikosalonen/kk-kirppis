import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SAMPLE: Array<{
  title: string;
  description: string;
  priceCents: number;
  platform: string;
}> = [
  {
    title: "The Legend of Zelda: Tears of the Kingdom",
    description: "Played through once, cartridge and case in great shape.",
    priceCents: 4500,
    platform: "Switch",
  },
  {
    title: "Elden Ring",
    description: "Disc only, no scratches. Finished it, time to pass it on.",
    priceCents: 3000,
    platform: "PS5",
  },
  {
    title: "Hollow Knight (physical)",
    description: "Collector's edition, complete with pin and manual.",
    priceCents: 6000,
    platform: "Switch",
  },
  {
    title: "Half-Life 2 (orange box)",
    description: "Classic. Some shelf wear on the box, disc works perfectly.",
    priceCents: 1500,
    platform: "PC",
  },
];

async function main() {
  const seller = await prisma.user.upsert({
    where: { slackId: "U_SEED_DEMO" },
    update: {},
    create: { slackId: "U_SEED_DEMO", name: "Demo Seller", image: null },
  });

  for (const game of SAMPLE) {
    await prisma.listing.create({
      data: { ...game, sellerId: seller.id },
    });
  }

  console.log(`Seeded ${SAMPLE.length} listings for ${seller.name}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
