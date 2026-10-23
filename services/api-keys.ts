import type {
  ApiKeySummary,
  ApiKeyUsageData,
  BusinessUsageData,
  CreateApiKeyData,
  CreateApiKeyRequest,
  RevokeApiKeyData,
  UpdateApiKeyRequest,
} from "@/types/api";
import { apiRequest } from "@/services/api";

function businessQuery(businessId?: string) {
  return businessId ? { business_id: businessId } : undefined;
}

export function listApiKeys(businessId?: string): Promise<ApiKeySummary[]> {
  return apiRequest<ApiKeySummary[]>("/api-keys", { query: businessQuery(businessId) });
}

export function createApiKey(payload: CreateApiKeyRequest): Promise<CreateApiKeyData> {
  return apiRequest<CreateApiKeyData>("/api-keys", {
    method: "POST",
    body: payload,
  });
}

export function updateApiKey(
  id: string,
  payload: UpdateApiKeyRequest,
): Promise<ApiKeySummary> {
  return apiRequest<ApiKeySummary>(`/api-keys/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export function revokeApiKey(id: string): Promise<RevokeApiKeyData> {
  return apiRequest<RevokeApiKeyData>(`/api-keys/${id}`, { method: "DELETE" });
}

export function getApiKeyUsage(id: string): Promise<ApiKeyUsageData> {
  return apiRequest<ApiKeyUsageData>(`/api-keys/${id}/usage`);
}

export function getBusinessUsage(businessId: string): Promise<BusinessUsageData> {
  return apiRequest<BusinessUsageData>(`/api-keys/usage/business/${businessId}`);
}
