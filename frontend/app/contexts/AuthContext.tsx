"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { apiClient } from "@/app/lib/api-client";
import API_ENDPOINTS from "@/app/lib/api/endpoints";
import { setAuthCookies, clearAuthCookies } from "@/app/lib/auth-cookies";
import { getTokenExpirationTime } from "@/app/lib/jwt-utils";
import type {
  AuthState,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  LogoutResponse,
  UserRole,
} from "@/app/types/auth";

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "authState";
const REFRESH_BUFFER_MS = 10 * 1000;

const initialAuthState: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  role: null,
  user: null,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [isInitialized, setIsInitialized] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const saveAuthState = useCallback((state: AuthState) => {
    setAuthState(state);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (state.isAuthenticated && state.accessToken && state.role) {
        setAuthCookies(state.accessToken, state.role);
      }
    }
  }, []);

  const clearAuthState = useCallback(() => {
    setAuthState(initialAuthState);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      clearAuthCookies();
    }
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const currentAuthState = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "null"
    ) as AuthState | null;

    if (!currentAuthState?.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await apiClient.post<RefreshTokenResponse>(
        API_ENDPOINTS.AUTH.REFRESH,
        { refresh: currentAuthState.refreshToken },
        { requiresAuth: false }
      );

      const newState: AuthState = {
        ...currentAuthState,
        accessToken: response.access,
        refreshToken: response.refresh,
      };

      saveAuthState(newState);
    } catch (error) {
      console.error("Token refresh failed:", error);
      clearAuthState();
      throw error;
    }
  }, [saveAuthState, clearAuthState]);

  const logout = useCallback(async () => {
    const currentRefreshToken = authState.refreshToken;

    clearAuthState();

    if (currentRefreshToken) {
      try {
        await apiClient.post<LogoutResponse>(
          API_ENDPOINTS.AUTH.LOGOUT,
          { refresh: currentRefreshToken },
          { requiresAuth: true }
        );
      } catch (error) {
        console.error("Logout request failed:", error);
      }
    }
  }, [authState.refreshToken, clearAuthState]);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      try {
        const response = await apiClient.post<LoginResponse>(
          API_ENDPOINTS.AUTH.LOGIN,
          credentials,
          { requiresAuth: false }
        );

        const newState: AuthState = {
          isAuthenticated: true,
          accessToken: response.access,
          refreshToken: response.refresh,
          role: response.user.role.toUpperCase() as UserRole,
          user: response.user,
        };

        saveAuthState(newState);
      } catch (error) {
        clearAuthState();
        throw error;
      }
    },
    [saveAuthState, clearAuthState]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed: AuthState = JSON.parse(stored);
          setAuthState(parsed);
          if (parsed.isAuthenticated && parsed.accessToken && parsed.role) {
            setAuthCookies(parsed.accessToken, parsed.role);
          }
        } catch (error) {
          console.error("Failed to parse stored auth state:", error);
          localStorage.removeItem(STORAGE_KEY);
          clearAuthCookies();
        }
      }
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    apiClient.setLogoutCallback(logout);
  }, [logout]);

  useEffect(() => {
    apiClient.setRefreshCallback(refreshAccessToken);
  }, [refreshAccessToken]);

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!authState.isAuthenticated || !authState.accessToken) {
      return;
    }

    const token = authState.accessToken;
    const expirationTime = getTokenExpirationTime(token);

    if (!expirationTime) {
      console.error("Failed to get token expiration time");
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = expirationTime - now;

    if (timeUntilExpiry <= 0) {
      console.log("Token already expired, API interceptor will handle refresh");
      return;
    }

    const timeUntilRefresh = timeUntilExpiry - REFRESH_BUFFER_MS;
    const refreshDelay = timeUntilRefresh > 0 ? timeUntilRefresh : Math.min(timeUntilExpiry / 2, 30000);

    console.log(`Scheduling token refresh in ${Math.floor(refreshDelay / 1000)} seconds`);
    refreshTimerRef.current = setTimeout(async () => {
      console.log("Refreshing token...");
      try {
        await refreshAccessToken();
      } catch (error) {
        console.error("Failed to refresh token:", error);
      }
    }, refreshDelay);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [authState.isAuthenticated, authState.accessToken, refreshAccessToken]);

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshAccessToken,
  };

  if (!isInitialized) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
