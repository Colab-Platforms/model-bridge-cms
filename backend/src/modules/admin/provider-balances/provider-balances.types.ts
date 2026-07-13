export interface ProviderBalanceIdParams {
  providerId: string;
}

export interface ProviderBalancesListQuery {
  slug?: string;
  isActive?: boolean;
  lowBalanceOnly?: boolean;
}

export interface ProviderBalanceLedgerQuery {
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface ProviderBalanceRechargeInput {
  amount: number | string;
  description?: string;
  referenceId?: string;
}

export interface ProviderBalanceAdjustInput {
  amount: number | string;
  description?: string;
  referenceId?: string;
}

export interface ProviderBalanceSettingsInput {
  lowBalanceThreshold?: number | string;
  alertsEnabled?: boolean;
  currency?: string;
}
