import { ComplexityTier } from "@prisma/client";

import prisma from "@root/prisma.js";

// Mirrors the old hardcoded TIER_MODEL_MAP in routing.service.ts. priority: 1 means
// "try this model first" for the tier — add a second row with priority: 2 to give a
// tier a fallback model without touching any code.
const DEFAULT_TIER_ROUTING = [
  { tier: ComplexityTier.SIMPLE, slug: "nemotron-nano-9b-v2:free", priority: 1 },
  { tier: ComplexityTier.MEDIUM, slug: "nemotron-3-nano-30b-a3b:free", priority: 1 },
  { tier: ComplexityTier.COMPLEX, slug: "gpt-4o-mini", priority: 1 },
  { tier: ComplexityTier.REASONING, slug: "o4-mini", priority: 1 },
] as const;

export async function seedTierRouting(): Promise<void> {
  console.log("⏳ Seeding tier routing models...");

  try {
    for (const entry of DEFAULT_TIER_ROUTING) {
      const model = await prisma.model.findUnique({
        where: { slug: entry.slug },
        select: { id: true },
      });

      if (!model) {
        console.warn(`  ⚠️  Skipping ${entry.tier}: model "${entry.slug}" not found`);
        continue;
      }

      await prisma.tierRoutingModel.upsert({
        where: { tier_modelId: { tier: entry.tier, modelId: model.id } },
        update: { priority: entry.priority, isActive: true },
        create: {
          tier: entry.tier,
          modelId: model.id,
          priority: entry.priority,
          isActive: true,
        },
      });
    }

    console.log("✅ Tier routing models seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding tier routing models:", error);
    throw error;
  }
}
