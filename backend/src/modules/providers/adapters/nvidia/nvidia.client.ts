import { ProviderHttpClient } from "../../shared/provider-http-client.js";
import type { ProviderRuntimeConfig } from "../base/provider.types.js";
import { OpenAIClient } from "../openai/openai.client.js";

export class NvidiaClient extends OpenAIClient {
  constructor(
    httpClient: ProviderHttpClient,
    config: ProviderRuntimeConfig
  ) {
    super(httpClient, config);
  }
}
