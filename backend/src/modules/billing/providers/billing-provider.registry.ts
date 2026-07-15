import { PaddleAdapter } from "./paddle/paddle.adapter.js";
import { PaddleClient } from "./paddle/paddle.client.js";
import type { BillingProviderName } from "../billing.constants.js";
import type { BillingFactoryDependencies } from "../billing.types.js";
import type { BillingProviderAdapter } from "./billing-provider.interface.js";

type BillingAdapterBuilder = (
  dependencies: BillingFactoryDependencies
) => BillingProviderAdapter;

export class BillingProviderRegistry {
  private readonly adapterBuilders = new Map<BillingProviderName, BillingAdapterBuilder>();

  constructor() {
    this.register("PADDLE", (dependencies) => {
      const client = new PaddleClient(dependencies.logger);
      return new PaddleAdapter(client);
    });
  }

  register(providerName: BillingProviderName, builder: BillingAdapterBuilder) {
    this.adapterBuilders.set(providerName, builder);
  }

  create(providerName: BillingProviderName, dependencies: BillingFactoryDependencies) {
    const builder = this.adapterBuilders.get(providerName);

    if (!builder) {
      throw new Error(`No billing provider adapter registered for ${providerName}`);
    }

    return builder(dependencies);
  }
}
