import type { AuthState } from "@/app/types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface RequestConfig extends RequestInit {
  requiresAuth?: boolean;
  _isRetry?: boolean;
}

class ApiClient {
  private static instance: ApiClient;
  private logoutCallback: (() => void) | null = null;
  private refreshCallback: (() => Promise<void>) | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  setLogoutCallback(callback: () => void) {
    this.logoutCallback = callback;
  }

  setRefreshCallback(callback: () => Promise<void>) {
    this.refreshCallback = callback;
  }

  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;

    const authState = localStorage.getItem("authState");
    if (!authState) return null;

    try {
      const parsed: AuthState = JSON.parse(authState);
      return parsed.accessToken;
    } catch {
      return null;
    }
  }

  private async handleUnauthorized() {
    if (this.logoutCallback) {
      this.logoutCallback();
    }
  }

  private async refreshTokenAndRetry<T>(
    endpoint: string,
    config: RequestConfig
  ): Promise<T> {
    if (this.isRefreshing) {
      await this.refreshPromise;
    } else {
      this.isRefreshing = true;
      this.refreshPromise = (async () => {
        try {
          if (this.refreshCallback) {
            await this.refreshCallback();
          } else {
            throw new Error("No refresh callback available");
          }
        } finally {
          this.isRefreshing = false;
          this.refreshPromise = null;
        }
      })();
      await this.refreshPromise;
    }

    return this.request<T>(endpoint, { ...config, _isRetry: true });
  }

  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { requiresAuth = true, headers = {}, _isRetry = false, ...restConfig } = config;

    const url = `${API_BASE_URL}${endpoint}`;
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(headers as Record<string, string>),
    };

    if (requiresAuth) {
      const token = this.getAccessToken();
      if (token) {
        requestHeaders["Authorization"] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, {
        ...restConfig,
        headers: requestHeaders,
      });

      if (response.status === 401) {
        if (!_isRetry && this.refreshCallback && requiresAuth) {
          try {
            return await this.refreshTokenAndRetry<T>(endpoint, config);
          } catch {
            await this.handleUnauthorized();
            throw new Error("Session expired - please login again");
          }
        } else {
          await this.handleUnauthorized();
          throw new Error("Unauthorized - please login again");
        }
      }

      if (response.status === 403) {
        throw new Error("You don't have permission to perform this action");
      }

      if (response.status === 404) {
        throw new Error("The requested resource was not found");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 400 && (errorData.error || errorData.message || errorData.detail)) {
          throw new Error(errorData.error || errorData.message || errorData.detail);
        }

        throw new Error(
          errorData.message ||
          errorData.detail ||
          errorData.error ||
          `HTTP error! status: ${response.status}`
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error("Connection error. Please check your internet connection and try again");
      }

      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred");
    }
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" });
  }
}

export const apiClient = ApiClient.getInstance();
