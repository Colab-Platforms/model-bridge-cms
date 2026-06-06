import prisma from "@root/prisma.js";

const DEFAULT_ROLES = [
  { name: "Admin" },
  { name: "SuperAdmin" },
  { name: "User" },
] as const;

export async function seedRoles(): Promise<void> {
  console.log("⏳ Seeding roles...");

  try {
    await prisma.$transaction(async (tx) => {
      for (const role of DEFAULT_ROLES) {
        await tx.role.upsert({
          where: { name: role.name }, 
          update: {
            isActive: true,
            isDeleted: false,
            deletedAt: null,
          },
          create: {
            name: role.name,
            isActive: true,
            isDeleted: false,
          },
        });
      }
    });

    console.log(" Roles seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding roles:", error);
    throw error; 
  }
}