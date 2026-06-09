export class ProviderError extends Error {
  public readonly provider: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly details?: unknown;

  constructor(
    provider: string,
    message: string,
    options?: {
      statusCode?: number;
      retryable?: boolean;
      details?: unknown;
    }
  ) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.statusCode = options?.statusCode;
    this.retryable = options?.retryable ?? false;
    this.details = options?.details;
  }
}

export class ProviderAuthError extends ProviderError {
  constructor(provider: string, message = "Provider authentication failed", details?: unknown) {
    super(provider, message, {
      statusCode: 401,
      retryable: false,
      details,
    });
    this.name = "ProviderAuthError";
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(provider: string, message = "Provider rate limit exceeded", details?: unknown) {
    super(provider, message, {
      statusCode: 429,
      retryable: true,
      details,
    });
    this.name = "ProviderRateLimitError";
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(provider: string, message = "Provider request timed out", details?: unknown) {
    super(provider, message, {
      statusCode: 504,
      retryable: true,
      details,
    });
    this.name = "ProviderTimeoutError";
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, message = "Provider is unavailable", details?: unknown) {
    super(provider, message, {
      statusCode: 503,
      retryable: true,
      details,
    });
    this.name = "ProviderUnavailableError";
  }
}
