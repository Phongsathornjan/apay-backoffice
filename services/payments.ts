import type {
  CreateQrData,
  CreateQrRequest,
  LinkLineQrData,
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
 * Creates the 0.01–0.99 verification order used to bind a LINE User ID to the
 * business. The backoffice discovers the linked state by polling
 * `GET /payments/orders/:id` every 3 seconds — no browser callback is used.
 */
export function createLineLinkQr(accessToken?: string): Promise<LinkLineQrData> {
  return apiRequest<LinkLineQrData>("/payments/line/link-qr", {
    method: "POST",
    ...(accessToken ? { accessToken, skipAuthRefresh: true } : {}),
  });
}

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

export interface ApiKeyLineLinkQrResult {
  order: LinkLineQrData;
  accessToken: string;
}

/**
 * Admin (Raw API Key mode) flow: exchange the business API key and create the
 * LINE linking order on its behalf.
 */
export async function createLineLinkQrWithApiKey(
  apiKey: string,
): Promise<ApiKeyLineLinkQrResult> {
  const token = await exchangeApiKey(apiKey.trim());
  const order = await createLineLinkQr(token.access_token);
  return { order, accessToken: token.access_token };
}

/** `403` raised by `POST /payments/qr` while the business has no LINE User ID. */
export function isLineNotLinkedError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    error.message.includes("not linked to a LINE user")
  );
}

/** `409` raised by `POST /payments/line/link-qr` when the business is already linked. */
export function isAlreadyLinkedError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.message.includes("already linked to a LINE user")
  );
}

/** `409` raised when all 99 decimal reference slots of the base amount are taken. */
export function isDecimalSlotConflict(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.message.startsWith("No available decimal reference slot")
  );
}
