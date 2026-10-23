import type {
  AdminBusinessListData,
  AdminBusinessListQuery,
  AdminDashboardDistributionData,
  AdminDashboardOverviewData,
  AdminDashboardTimeseriesData,
  AdminExpiringData,
  AdminExpiringQuery,
  ApiKeyBreakdownQuery,
  ApiKeyTimeseriesQuery,
  DashboardApiKeyBreakdownData,
  DashboardApiKeyTimeseriesData,
  DashboardOverviewData,
  DashboardQuery,
  DashboardRateLimitData,
  DashboardSubscriptionTrendData,
  DashboardTransactionsTimeseriesData,
  DashboardUsageTimeseriesData,
  RateLimitQuery,
  UsageTimeseriesQuery,
} from "@/types/api";
import { apiRequest } from "@/services/api";

export function getBusinessOverview(query: DashboardQuery): Promise<DashboardOverviewData> {
  return apiRequest<DashboardOverviewData>("/dashboard/overview", { query });
}

export function getUsageTimeseries(
  query: UsageTimeseriesQuery,
): Promise<DashboardUsageTimeseriesData> {
  return apiRequest<DashboardUsageTimeseriesData>("/dashboard/usage/timeseries", { query });
}

export function getTransactionsTimeseries(
  query: DashboardQuery,
): Promise<DashboardTransactionsTimeseriesData> {
  return apiRequest<DashboardTransactionsTimeseriesData>(
    "/dashboard/transactions/timeseries",
    { query },
  );
}

export function getRateLimit(query: RateLimitQuery): Promise<DashboardRateLimitData> {
  return apiRequest<DashboardRateLimitData>("/dashboard/rate-limit", { query });
}

export function getApiKeyBreakdown(
  query: ApiKeyBreakdownQuery,
): Promise<DashboardApiKeyBreakdownData> {
  return apiRequest<DashboardApiKeyBreakdownData>("/dashboard/api-keys", { query });
}

export function getApiKeyTimeseries(
  query: ApiKeyTimeseriesQuery,
): Promise<DashboardApiKeyTimeseriesData> {
  return apiRequest<DashboardApiKeyTimeseriesData>("/dashboard/api-keys/timeseries", { query });
}

export function getSubscriptionTrend(businessId?: string): Promise<DashboardSubscriptionTrendData> {
  return apiRequest<DashboardSubscriptionTrendData>("/dashboard/subscription", {
    query: { business_id: businessId },
  });
}

export function getAdminOverview(query: DashboardQuery): Promise<AdminDashboardOverviewData> {
  return apiRequest<AdminDashboardOverviewData>("/dashboard/admin/overview", { query });
}

export function getAdminTimeseries(query: DashboardQuery): Promise<AdminDashboardTimeseriesData> {
  return apiRequest<AdminDashboardTimeseriesData>("/dashboard/admin/timeseries", { query });
}

export function getAdminDistribution(): Promise<AdminDashboardDistributionData> {
  return apiRequest<AdminDashboardDistributionData>("/dashboard/admin/distribution");
}

export function getAdminBusinesses(
  query: AdminBusinessListQuery,
): Promise<AdminBusinessListData> {
  return apiRequest<AdminBusinessListData>("/dashboard/admin/businesses", { query });
}

export function getAdminExpiring(query: AdminExpiringQuery): Promise<AdminExpiringData> {
  return apiRequest<AdminExpiringData>("/dashboard/admin/expiring", { query });
}
