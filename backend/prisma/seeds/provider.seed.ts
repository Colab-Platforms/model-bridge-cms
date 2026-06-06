import prisma from "@root/prisma.js";

const DEFAULT_PROVIDERS = [
  {
    slug: "openai",
    displayName: "OpenAI",
    description: "Creator of the GPT-4 and GPT-3.5 family of large language models.",
    baseUrl: "https://api.openai.com/v1",
  },
  {
    slug: "anthropic",
    displayName: "Anthropic",
    description: "Creator of the Claude 3 family of AI models, known for large context windows and advanced reasoning.",
    baseUrl: "https://api.anthropic.com",
  },
  {
    slug: "google",
    displayName: "Google Gemini",
    description: "Creator of the Gemini family of highly capable multimodal AI models.",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta", 
  },
  {
    slug: "mistral",
    displayName: "Mistral AI",
    description: "European AI startup known for powerful, efficient open-weight and commercial models like Mixtral.",
    baseUrl: "https://api.mistral.ai/v1",
  },
  {
    slug: "groq",
    displayName: "Groq",
    description: "LPU inference engine providing ultra-fast, low-latency execution for open-source models.",
    baseUrl: "https://api.groq.com/openai/v1",
  }
] as const;

export async function seedProviders(): Promise<void> {
  console.log("⏳ Seeding AI providers...");

  try {
    await prisma.$transaction(async (tx) => {
      for (const provider of DEFAULT_PROVIDERS) {
        
        // We use 'slug' as the unique identifier for the upsert
        await tx.provider.upsert({
          where: { slug: provider.slug },
          update: {
            displayName: provider.displayName,
            description: provider.description,
            baseUrl: provider.baseUrl,
            isActive: true,
            isDeleted: false,
            deletedAt: null,
          },
          create: {
            slug: provider.slug,
            displayName: provider.displayName,
            description: provider.description,
            baseUrl: provider.baseUrl,
            isActive: true,
            isDeleted: false,
          },
        });
      }
    });

    console.log("✅ Providers seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding providers:", error);
    throw error;
  }
}