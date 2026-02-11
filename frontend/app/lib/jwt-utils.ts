interface JWTPayload {
  exp: number;
  iat: number;
  user_id: number;
}

export function decodeJWT(token: string): JWTPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

export function getTokenExpirationTime(token: string): number | null {
  const payload = decodeJWT(token);
  if (!payload) return null;

  return payload.exp * 1000;
}

export function willTokenExpireSoon(token: string, thresholdMinutes: number = 2): boolean {
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) return true;

  const now = Date.now();
  const thresholdMs = thresholdMinutes * 60 * 1000;

  return (expirationTime - now) <= thresholdMs;
}
