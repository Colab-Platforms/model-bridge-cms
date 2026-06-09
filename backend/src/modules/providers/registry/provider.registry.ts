import { AnthropicAdapter } from "../adapters/anthropic/anthropic.adapter.js";
import { AnthropicClient } from "../adapters/anthropic/anthropic.client.js";
import {
  PROVIDER_BASE_URL_ENV_KEYS,
  PROVIDER_DEFAULT_BASE_URLS,
  PROVIDER_ENV_KEYS,
} from "../adapters/base/provider.constants.js";
import { ProviderUnavailableError } from "../adapters/base/provider.errors.js";
import type {
  ProviderFactoryDependencies,
  ProviderMetadata,
  ProviderName,
  ProviderRuntimeConfig,
} from "../adapters/base/provider.types.js";
import { GeminiAdapter } from "../adapters/gemini/gemini.adapter.js";
import { GeminiClient } from "../adapters/gemini/gemini.client.js";
import { GroqAdapter } from "../adapters/groq/groq.adapter.js";
import { GroqClient } from "../adapters/groq/groq.client.js";
import { OpenAIAdapter } from "../adapters/openai/openai.adapter.js";
import { OpenAIClient } from "../adapters/openai/openai.client.js";
import { ProviderHttpClient } from "../shared/provider-http-client.js";

import type { ProviderAdapter } from "../adapters/base/provider.interface.js";

type AdapterBuilder = (
  config: ProviderRuntimeConfig,
  dependencies: ProviderFactoryDependencies
) => ProviderAdapter;

const providerMetadataRecords: Record<ProviderName, ProviderMetadata> = {
  OPENAI: {
    name: "OPENAI",
    displayName: "OpenAI",
    apiKeyEnvVar: PROVIDER_ENV_KEYS.OPENAI,
    baseUrlEnvVar: PROVIDER_BASE_URL_ENV_KEYS.OPENAI,
    defaultBaseUrl: PROVIDER_DEFAULT_BASE_URLS.OPENAI,
    supportsStreaming: true,
    supportsEmbeddings: true,
  },
  ANTHROPIC: {
    name: "ANTHROPIC",
    displayName: "Anthropic",
    apiKeyEnvVar: PROVIDER_ENV_KEYS.ANTHROPIC,
    baseUrlEnvVar: PROVIDER_BASE_URL_ENV_KEYS.ANTHROPIC,
    defaultBaseUrl: PROVIDER_DEFAULT_BASE_URLS.ANTHROPIC,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  GEMINI: {
    name: "GEMINI",
    displayName: "Gemini",
    apiKeyEnvVar: PROVIDER_ENV_KEYS.GEMINI,
    baseUrlEnvVar: PROVIDER_BASE_URL_ENV_KEYS.GEMINI,
    defaultBaseUrl: PROVIDER_DEFAULT_BASE_URLS.GEMINI,
    supportsStreaming: true,
    supportsEmbeddings: true,
  },
  GROQ: {
    name: "GROQ",
    displayName: "Groq",
    apiKeyEnvVar: PROVIDER_ENV_KEYS.GROQ,
    baseUrlEnvVar: PROVIDER_BASE_URL_ENV_KEYS.GROQ,
    defaultBaseUrl: PROVIDER_DEFAULT_BASE_URLS.GROQ,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  DEEPSEEK: {
    name: "DEEPSEEK",
    displayName: "DeepSeek",
    apiKeyEnvVar: PROVIDER_ENV_KEYS.DEEPSEEK,
    baseUrlEnvVar: PROVIDER_BASE_URL_ENV_KEYS.DEEPSEEK,
    defaultBaseUrl: PROVIDER_DEFAULT_BASE_URLS.DEEPSEEK,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  MISTRAL: {
    name: "MISTRAL",
    displayName: "Mistral",
    apiKeyEnvVar: PROVIDER_ENV_KEYS.MISTRAL,
    baseUrlEnvVar: PROVIDER_BASE_URL_ENV_KEYS.MISTRAL,
    defaultBaseUrl: PROVIDER_DEFAULT_BASE_URLS.MISTRAL,
    supportsStreaming: true,
    supportsEmbeddings: true,
  },
};

export class ProviderRegistry {
  private readonly metadata = new Map<ProviderName, ProviderMetadata>();
  private readonly adapterBuilders = new Map<ProviderName, AdapterBuilder>();

  constructor() {
    for (const metadata of Object.values(providerMetadataRecords)) {
      this.metadata.set(metadata.name, metadata);
    }

    this.register("OPENAI", (config, dependencies) => {
      const httpClient = new ProviderHttpClient("OPENAI", config, dependencies.logger);
      return new OpenAIAdapter(new OpenAIClient(httpClient, config));
    });

    this.register("ANTHROPIC", (config, dependencies) => {
      const httpClient = new ProviderHttpClient("ANTHROPIC", config, dependencies.logger);
      return new AnthropicAdapter(new AnthropicClient(httpClient, config));
    });

    this.register("GEMINI", (config, dependencies) => {
      const httpClient = new ProviderHttpClient("GEMINI", config, dependencies.logger);
      return new GeminiAdapter(new GeminiClient(httpClient, config));
    });

    this.register("GROQ", (config, dependencies) => {
      const httpClient = new ProviderHttpClient("GROQ", config, dependencies.logger);
      return new GroqAdapter(new GroqClient(httpClient, config));
    });
  }

  register(providerName: ProviderName, builder: AdapterBuilder) {
    this.adapterBuilders.set(providerName, builder);
  }

  getMetadata(providerName: ProviderName) {
    const metadata = this.metadata.get(providerName);

    if (!metadata) {
      throw new ProviderUnavailableError(providerName, `Provider metadata not found for ${providerName}`);
    }

    return metadata;
  }

  create(
    providerName: ProviderName,
    config: ProviderRuntimeConfig,
    dependencies: ProviderFactoryDependencies
  ) {
    const builder = this.adapterBuilders.get(providerName);

    if (!builder) {
      throw new ProviderUnavailableError(
        providerName,
        `No adapter registered for provider ${providerName}`
      );
    }

    return builder(config, dependencies);
  }

  listProviders() {
    return Array.from(this.metadata.values());
  }
}
