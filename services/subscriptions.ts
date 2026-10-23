import type {
  AssignSubscriptionRequest,
  BusinessSubscriptionDetailsData,
  RenewSubscriptionRequest,
  SubscriptionSummary,
} from "@/types/api";
import { apiRequest } from "@/services/api";

export function assignSubscription(
  payload: AssignSubscriptionRequest,
): Promise<SubscriptionSummary> {
  return apiRequest<SubscriptionSummary>("/subscriptions", {
    method: "POST",
    body: payload,
  });
}

export function renewSubscription(
  id: string,
  payload: RenewSubscriptionRequest = {},
): Promise<SubscriptionSummary> {
  return apiRequest<SubscriptionSummary>(`/subscriptions/${id}/renew`, {
    method: "POST",
    body: payload,
  });
}

export function getBusinessSubscription(
  businessId: string,
): Promise<BusinessSubscriptionDetailsData> {
  return apiRequest<BusinessSubscriptionDetailsData>(
    `/subscriptions/business/${businessId}`,
  );
}
