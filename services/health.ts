import type { HealthData } from "@/types/api";
import { apiRequest } from "@/services/api";

export function getHealth(): Promise<HealthData> {
  return apiRequest<HealthData>("/app/health", { auth: false });
}
