import { seedProviders } from "./provider.seed.js";
import prisma from "@root/prisma.js";

async function main() {
  console.log("🌱 Starting database seeding pipeline...");
  
  // await seedRoles();
  
  // await seedUsers();

  await seedProviders();
  
  console.log("🌲 All seed files executed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
