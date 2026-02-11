export function setAuthCookies(token: string, role: string) {
  document.cookie = `auth_token=${token}; path=/; max-age=86400; samesite=strict`;
  document.cookie = `auth_role=${role}; path=/; max-age=86400; samesite=strict`;
}

export function clearAuthCookies() {
  document.cookie = "auth_token=; path=/; max-age=0";
  document.cookie = "auth_role=; path=/; max-age=0";
}
