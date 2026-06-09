import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";

import {
  ProviderAuthError,
  ProviderError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from "../adapters/base/provider.errors.js";
import type {
  ProviderHttpRequestOptions,
  ProviderLogger,
  ProviderName,
  ProviderRuntimeConfig,
} from "../adapters/base/provider.types.js";

const defaultLogger: ProviderLogger = {
  info: (message, meta) => console.info(message, meta),
  warn: (message, meta) => console.warn(message, meta),
  error: (message, meta) => console.error(message, meta),
};

export class ProviderHttpClient {
  private readonly client: AxiosInstance;
  private readonly logger: ProviderLogger;

  constructor(
    private readonly providerName: ProviderName,
    private readonly config: ProviderRuntimeConfig,
    logger?: ProviderLogger
  ) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
      headers: config.headers,
    });
    this.logger = logger ?? defaultLogger;
  }

  async request<TResponse>(
    requestConfig: AxiosRequestConfig,
    options?: ProviderHttpRequestOptions
  ): Promise<TResponse> {
    const retries = options?.retries ?? this.config.maxRetries;
    const timeoutMs = options?.timeoutMs ?? this.config.timeoutMs;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const startedAt = Date.now();

      try {
        this.logger.info("Provider HTTP request started", {
          provider: this.providerName,
          method: requestConfig.method ?? "GET",
          url: requestConfig.url,
          attempt: attempt + 1,
        });

        const response = await this.client.request<TResponse>({
          ...requestConfig,
          timeout: timeoutMs,
        });

        this.logger.info("Provider HTTP request completed", {
          provider: this.providerName,
          method: requestConfig.method ?? "GET",
          url: requestConfig.url,
          attempt: attempt + 1,
          latencyMs: Date.now() - startedAt,
          statusCode: response.status,
        });

        return response.data;
      } catch (error: unknown) {
        const normalizedError = this.normalizeError(error);

        this.logger.warn("Provider HTTP request failed", {
          provider: this.providerName,
          method: requestConfig.method ?? "GET",
          url: requestConfig.url,
          attempt: attempt + 1,
          retryable: normalizedError.retryable,
          statusCode: normalizedError.statusCode,
          message: normalizedError.message,
        });

        if (attempt >= retries || !normalizedError.retryable) {
          throw normalizedError;
        }
      }
    }

    throw new ProviderUnavailableError(this.providerName, "Retries exhausted");
  }

  async requestRaw<TResponse>(
    requestConfig: AxiosRequestConfig,
    options?: ProviderHttpRequestOptions
  ): Promise<TResponse> {
    return this.request<TResponse>(requestConfig, options);
  }

  private normalizeError(error: unknown) {
    if (error instanceof ProviderError) {
      return error;
    }

    if (!axios.isAxiosError(error)) {
      return new ProviderError(this.providerName, "Unknown provider error", {
        details: error,
      });
    }

    const axiosError = error as AxiosError<unknown>;
    const statusCode = axiosError.response?.status;
    const responseData = axiosError.response?.data;

    if (axiosError.code === "ECONNABORTED") {
      return new ProviderTimeoutError(this.providerName, "Provider request timed out", responseData);
    }

    if (statusCode === 401 || statusCode === 403) {
      return new ProviderAuthError(this.providerName, "Provider authentication failed", responseData);
    }

    if (statusCode === 429) {
      return new ProviderRateLimitError(this.providerName, "Provider rate limit exceeded", responseData);
    }

    if (statusCode !== undefined && statusCode >= 500) {
      return new ProviderUnavailableError(this.providerName, "Provider service unavailable", responseData);
    }

    return new ProviderError(
      this.providerName,
      axiosError.message || "Provider request failed",
      {
        statusCode,
        retryable: false,
        details: responseData,
      }
    );
  }
}
