import type { ProviderAdapter } from "../adapters/base/provider.interface.js";
import type {
  ProviderFactoryDependencies,
  ProviderName,
} from "../adapters/base/provider.types.js";
import { ProviderRegistry } from "./provider.registry.js";
import { normalizeProviderName, resolveProviderRuntimeConfig } from "../shared/provider-utils.js";

export class ProviderFactory {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly dependencies: ProviderFactoryDependencies = {}
  ) {}

  get(providerName: ProviderName | string): ProviderAdapter {
    const normalizedProviderName = normalizeProviderName(providerName);
    const metadata = this.registry.getMetadata(normalizedProviderName);
    const config = resolveProviderRuntimeConfig(normalizedProviderName, metadata);

    return this.registry.create(normalizedProviderName, config, this.dependencies);
  }
}

export const createProviderFactory = (dependencies?: ProviderFactoryDependencies) =>
  new ProviderFactory(new ProviderRegistry(), dependencies);

