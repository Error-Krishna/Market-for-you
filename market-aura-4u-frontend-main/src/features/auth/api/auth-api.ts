import { apiClient } from "@/lib/api/client";

import type {
  AuthResponse,
  LoginRequest,
  ProfileResponse,
  SignupRequest,
} from "../types/auth.types";

const AUTH_BASE_PATH = "/v1/auth";

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(`${AUTH_BASE_PATH}/login`, request);

  return response.data;
}

export async function signup(request: SignupRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(`${AUTH_BASE_PATH}/signup`, request);

  return response.data;
}

export async function logout(): Promise<void> {
  await apiClient.post(`${AUTH_BASE_PATH}/logout`);
}

export async function getProfile(): Promise<ProfileResponse> {
  const response = await apiClient.get<ProfileResponse>(`${AUTH_BASE_PATH}/profile`);

  return response.data;
}
