export const AUTH_ENDPOINTS = {
  LOGIN: "/api/auth/login/",
  LOGOUT: "/api/auth/logout/",
  REFRESH: "/api/auth/refresh/",
} as const;

export const AUTH_STORAGE_KEY = "authState";

export const USER_ROLES = {
  MEMBER: "MEMBER",
  LIBRARIAN: "LIBRARIAN",
} as const;
