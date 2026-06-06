import { seedProviders } from "./provider.seed.js";
import { seedRoles } from "./roles.seed.js"; // Note: sometimes TS requires .js extension in imports depending on your module resolution
import { seedUsers } from "./users.seed.js";
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