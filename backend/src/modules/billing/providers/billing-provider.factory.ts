import type { BillingProviderName } from "../billing.constants.js";
import type { BillingFactoryDependencies } from "../billing.types.js";
import type { BillingProviderAdapter } from "./billing-provider.interface.js";
import { BillingProviderRegistry } from "./billing-provider.registry.js";

export class BillingProviderFactory {
  constructor(
    private readonly registry: BillingProviderRegistry,
    private readonly dependencies: BillingFactoryDependencies = {}
  ) {}

  get(providerName: BillingProviderName): BillingProviderAdapter {
    return this.registry.create(providerName, this.dependencies);
  }
}

export const createBillingProviderFactory = (dependencies?: BillingFactoryDependencies) =>
  new BillingProviderFactory(new BillingProviderRegistry(), dependencies);
