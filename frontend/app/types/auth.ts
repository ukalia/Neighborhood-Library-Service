export type UserRole = "MEMBER" | "LIBRARIAN";

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  phone_number: string | null;
  address: string | null;
  is_active: boolean;
  date_joined: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  refresh: string;
  access: string;
  user: User;
}

export interface RefreshTokenRequest {
  refresh: string;
}

export interface RefreshTokenResponse {
  access: string;
  refresh: string;
}

export interface LogoutRequest {
  refresh: string;
}

export interface LogoutResponse {
  message: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  role: UserRole | null;
  user: User | null;
}
