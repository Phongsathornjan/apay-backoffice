import type {
  LoginData,
  LoginRequest,
  RegisterBusinessData,
  RegisterBusinessRequest,
  TokenBundle,
} from "@/types/api";
import { apiRequest } from "@/services/api";

export function login(payload: LoginRequest): Promise<LoginData> {
  return apiRequest<LoginData>("/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function exchangeApiKey(apiKey: string): Promise<TokenBundle> {
  return apiRequest<TokenBundle>("/auth/token", {
    method: "POST",
    body: { api_key: apiKey },
    auth: false,
  });
}

export function registerBusiness(
  payload: RegisterBusinessRequest,
): Promise<RegisterBusinessData> {
  return apiRequest<RegisterBusinessData>("/auth/register-business", {
    method: "POST",
    body: payload,
  });
}
