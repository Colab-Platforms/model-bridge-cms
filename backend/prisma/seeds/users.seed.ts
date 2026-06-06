import bcrypt from "bcryptjs";
import prisma from "@root/prisma.js";

const SYSTEM_SEEDER = "system_seed";

const DEFAULT_USERS = [
  {
    email: "admin@modelbridge.com",
    firstName: "Admin",
    lastName: "User",
    roleName: "Admin",
    rawPassword: "Admin@123!", 
  },
  {
    email: "superadmin@modelbridge.com",
    firstName: "Super",
    lastName: "Admin",
    roleName: "SuperAdmin",
    rawPassword: "SuperAdmin@123!", 
  },
  {
    email: "user@modelbridge.com",
    firstName: "Normal",
    lastName: "User",
    roleName: "User",
    rawPassword: "NormalUser@123!", 
  },
] as const;

export async function seedUsers(): Promise<void> {
  console.log("⏳ Seeding users and assigning roles...");

  try {
    const roles = await prisma.role.findMany({
      where: {
        name: { in: DEFAULT_USERS.map((u) => u.roleName) },
      },
    });

    const roleMap = new Map(roles.map((r) => [r.name, r.id]));

    await prisma.$transaction(async (tx) => {
      for (const userSeed of DEFAULT_USERS) {
        const roleId = roleMap.get(userSeed.roleName);

        if (!roleId) {
          throw new Error(`Missing role: '${userSeed.roleName}'. Please run seedRoles first.`);
        }

        // 3. Hash the unique password for this specific user BEFORE creation
        const passwordHash = await bcrypt.hash(userSeed.rawPassword, 12);

        // 4. Create or update the user (Relying on your Prisma @default values for status/isDeleted)
        const user = await tx.user.upsert({
          where: { email: userSeed.email },
          create: {
            email: userSeed.email,
            passwordHash: passwordHash,
            firstName: userSeed.firstName,
            lastName: userSeed.lastName,
            createdBy: SYSTEM_SEEDER,
            updatedBy: SYSTEM_SEEDER,
          },
          update: {
            passwordHash: passwordHash,
            firstName: userSeed.firstName,
            lastName: userSeed.lastName,
            updatedBy: SYSTEM_SEEDER,
          },
        });

        const existingUserRole = await tx.userRole.findFirst({
          where: {
            userId: user.id,
            roleId: roleId,
          },
        });

        if (existingUserRole) {
          
          await tx.userRole.update({
            where: { id: existingUserRole.id },
            data: { deletedAt: null },
          });
        } else {
          await tx.userRole.create({
            data: {
              userId: user.id,
              roleId: roleId,
            },
          });
        }
      }
    });

    console.log("✅ Users created and roles assigned successfully!");
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    throw error;
  }
}