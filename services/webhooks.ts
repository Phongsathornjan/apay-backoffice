import type { LineWebhookRequest, WebhookProcessedData } from "@/types/api";
import { apiRequestWithMeta, type ApiResult } from "@/services/api";

export function simulateLineWebhook(
  payload: LineWebhookRequest,
  signature?: string,
): Promise<ApiResult<WebhookProcessedData>> {
  return apiRequestWithMeta<WebhookProcessedData>("/webhooks/kbank/line", {
    method: "POST",
    body: payload,
    auth: false,
    headers: signature?.trim() ? { "x-line-signature": signature.trim() } : undefined,
  });
}
