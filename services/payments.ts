import type {
  CreateQrData,
  CreateQrRequest,
  PaymentOrderDetailData,
} from "@/types/api";
import { exchangeApiKey } from "@/services/auth";
import { ApiError, apiRequest } from "@/services/api";

export function createQr(
  payload: CreateQrRequest,
  accessToken?: string,
): Promise<CreateQrData> {
  return apiRequest<CreateQrData>("/payments/qr", {
    method: "POST",
    body: payload,
    ...(accessToken ? { accessToken, skipAuthRefresh: true } : {}),
  });
}

/**
 * Fetches the latest order state. The backoffice polls this endpoint to track
 * payment matching without any browser callback.
 */
export function getPaymentOrder(
  orderId: string,
  accessToken?: string,
): Promise<PaymentOrderDetailData> {
  return apiRequest<PaymentOrderDetailData>(
    `/payments/orders/${encodeURIComponent(orderId)}`,
    accessToken ? { accessToken, skipAuthRefresh: true } : undefined,
  );
}

export interface ApiKeyQrResult {
  order: CreateQrData;
  accessToken: string;
}

/** Exchanges a raw API key for a short-lived JWT, then creates the QR order. */
export async function createQrWithApiKey(
  apiKey: string,
  payload: CreateQrRequest,
): Promise<ApiKeyQrResult> {
  const token = await exchangeApiKey(apiKey.trim());
  const order = await createQr(payload, token.access_token);
  return { order, accessToken: token.access_token };
}

/** `409` raised when all 99 decimal reference slots of the base amount are taken. */
export function isDecimalSlotConflict(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.message.startsWith("No available decimal reference slot")
  );
}
