import prisma from "@root/prisma.js";

interface OpenRouterModelPayload {
  id: string;
  canonical_slug?: string;
  name: string;
  description?: string;
  context_length?: number;
  architecture?: {
    tokenizer?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  pricing?: {
    prompt: string | number;
    completion: string | number;
    input_cache_write?: string | number;
    input_cache_read?: string | number;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
  supported_parameters?: string[];
}

const OPENROUTER_PROVIDER_HINTS: Record<string, string> = {
  groq: 'OpenRouter Grok models use the "x-ai" namespace (for example: "x-ai/grok-build-0.1"), not "groq".',
};

function isOpenRouterFreeModel(model: Pick<OpenRouterModelPayload, "id" | "name" | "canonical_slug">): boolean {
  const candidateValues = [model.id, model.name, model.canonical_slug].filter(
    (value): value is string => Boolean(value),
  );

  return candidateValues.some((value) => {
    const normalizedTokens = value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    return normalizedTokens.includes("free");
  });
}

export async function syncModelsForProvider(providerSlug: string): Promise<void> {
  console.log(`⏳ Starting model synchronization sequence for provider: [${providerSlug}]...`);

  try {
    // 1. Fetch the parent provider from your database to ensure we have a valid providerId
    const provider = await prisma.provider.findUnique({
      where: { slug: providerSlug },
    });

    if (!provider) {
      console.error(`❌ Provider with slug "${providerSlug}" not found in database. Please run your provider seeds first.`);
      return;
    }

    // 2. Fetch all models from OpenRouter public API
    const response = await fetch("https://openrouter.ai/api/v1/models");
    if (!response.ok) {
      throw new Error(`OpenRouter API responded with status code: ${response.status}`);
    }
    
    // Typecast explicitly to resolve the 'unknown' object property compilation error
    const json = (await response.json()) as { data: OpenRouterModelPayload[] };
    const allModels = json.data;

    // 3. Filter down to only the models belonging to the passed provider
    const relevantModels = allModels.filter((model) => {
      const [modelProvider] = model.id.split("/");
      return modelProvider === providerSlug;
    });

    console.log(`🔍 Found ${relevantModels.length} matching models for provider "${providerSlug}" on OpenRouter.`);

    if (relevantModels.length === 0) {
      console.log(`⚠️ No models found matching provider slug "${providerSlug}". Skipping database writes.`);

      const providerHint = OPENROUTER_PROVIDER_HINTS[providerSlug];
      if (providerHint) {
        console.log(`💡 ${providerHint}`);
      }

      return;
    }

    // 4. Batch update or insert all records via an isolated database transaction
    await prisma.$transaction(async (tx) => {
      for (const model of relevantModels) {
        // Strip the provider prefix to create a clean local model slug (e.g., "gpt-4o" instead of "openai/gpt-4o")
        const cleanModelSlug = model.id.split("/").slice(1).join("/");
        const isFreeModel = isOpenRouterFreeModel(model);

        const inputPrice = model.pricing ? parseFloat(model.pricing.prompt.toString()) : 0;
        const outputPrice = model.pricing ? parseFloat(model.pricing.completion.toString()) : 0;
        const cacheWritePrice = model.pricing?.input_cache_write ? parseFloat(model.pricing.input_cache_write.toString()) : 0;
        const cacheReadPrice = model.pricing?.input_cache_read ? parseFloat(model.pricing.input_cache_read.toString()) : 0;

        // Structured defaults for array parameters
        const inputModalities = model.architecture?.input_modalities || ["text"];
        const outputModalities = model.architecture?.output_modalities || ["text"];
        const supportedParams = model.supported_parameters || [];

        // Execute atomic upsert
        await tx.model.upsert({
          where: { slug: cleanModelSlug },
          update: {
            providerModelId: model.id,
            // canonicalSlug: model.canonical_slug || null,
            displayName: model.name,
            description: model.description || null,
            contextLength: model.context_length || null,
            maxOutputTokens: model.top_provider?.max_completion_tokens || null,
            tokenizer: model.architecture?.tokenizer || null,
            inputPricePerToken: inputPrice,
            outputPricePerToken: outputPrice,
            cacheWritePricePerToken: cacheWritePrice,
            cacheReadPricePerToken: cacheReadPrice,
            inputModalities: inputModalities,
            outputModalities: outputModalities,
            supportedParameters: supportedParams,
            isFreeModel,
            isActive: true,
            isDeleted: false,
          },
          create: {
            providerId: provider.id, // Links dynamically to the target provider row
            providerModelId: model.id,
            slug: cleanModelSlug,
            // canonicalSlug: model.canonical_slug || null,
            displayName: model.name,
            description: model.description || null,
            contextLength: model.context_length || null,
            maxOutputTokens: model.top_provider?.max_completion_tokens || null,
            tokenizer: model.architecture?.tokenizer || null,
            inputPricePerToken: inputPrice,
            outputPricePerToken: outputPrice,
            cacheWritePricePerToken: cacheWritePrice,
            cacheReadPricePerToken: cacheReadPrice,
            inputModalities: inputModalities,
            outputModalities: outputModalities,
            supportedParameters: supportedParams,
            defaultForCapabilities: [],
            isFreeModel,
            isActive: true,
            isDeleted: false,
          },
        });
      }
    });

    console.log(`✅ Successfully updated database tables for provider: [${providerSlug}]`);
  } catch (error) {
    console.error(`❌ Failed tracking sequence loop for provider "${providerSlug}":`, error);
    throw error;
  }
}
