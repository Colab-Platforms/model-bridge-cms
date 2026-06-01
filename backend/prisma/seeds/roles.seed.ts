import prisma from "@root/prisma.js";

/** Default roles many apps start from — edit or add rows for your domain. */
const DEFAULT_ROLES = [
  {
    name: "Administrator",
    slug: "admin",
    description: "Full access to manage users, roles, and settings.",
  },
  {
    name: "User",
    slug: "user",
    description: "Standard end-user access.",
  }
] as const;

export async function seedRoles(): Promise<void> {
  console.log("   → roles");
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: { name: role.name, description: role.description },
      create: {
        name: role.name,
        slug: role.slug,
        description: role.description,
      },
    });
  }
}
