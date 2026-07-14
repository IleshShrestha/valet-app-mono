export type UserRole = "employee" | "manager" | string;

export interface User {
  id: number;
  organization_id?: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
  platform: "ios" | "android" | "web";
  device_name: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
