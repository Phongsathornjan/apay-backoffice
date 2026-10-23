/**
 * APay API v1 contracts.
 *
 * Source of truth: api-docs.html. Keep request, response, query and enum
 * definitions in this file aligned with that document.
 */

export type UserRole = "admin" | "business";
export type Interval = "hour" | "day";
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELLED";
export type PaymentOrderStatus = "UNVERIFIED" | "PAID" | "EXPIRED";
export type ApiKeyUsageAction = "QR_CREATED" | "QR_PAID";

export interface ApiSuccessEnvelope<T> {
  ok: true;
  status: number;
  correlation_id: string;
  data: T;
}

export interface ApiErrorEnvelope {
  ok: false;
  status: number;
  correlation_id: string;
  message: string;
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export interface HealthData {
  service_name: string;
  message: string;
  timestamp: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthUserSummary {
  user_id: string;
  username: string;
  role: UserRole;
  business_id: string | null;
  /** Bound LINE User ID; null until the business completes the linking flow (always null for admin). */
  line_user_id: string | null;
}

export interface TokenBundle {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
}

export interface LoginData extends TokenBundle {
  user: AuthUserSummary;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface GetTokenRequest {
  api_key?: string;
}

export interface RegisterBusinessRequest {
  username: string;
  password: string;
  business_name: string;
  promptpay_id: string;
  line_destination?: string | null;
  line_user_id?: string | null;
  package_id?: string | null;
}

export interface RegisterBusinessData {
  user_id: string;
  username: string;
  role: "business";
  business_id: string;
  business_name: string;
  promptpay_id: string;
  line_user_id: string | null;
}

export interface CreateQrRequest {
  amount: number;
  redirect_url: string;
}

export interface CreateQrData {
  order_id: string;
  lookup_key: string;
  base_amount: number;
  decimal_ref: number;
  total_amount: number;
  qr_payload: string;
  qr_image: string;
  status: PaymentOrderStatus;
  redirect_url: string | null;
  expires_at: string;
  api_key_id: string | null;
  line_user_id: string | null;
  is_line_link: boolean;
}

/** Response of `POST /payments/line/link-qr` — the 0.01–0.99 verification order. */
export interface LinkLineQrData {
  order_id: string;
  lookup_key: string;
  base_amount: 0;
  decimal_ref: number;
  total_amount: number;
  qr_payload: string;
  qr_image: string;
  status: PaymentOrderStatus;
  redirect_url: null;
  expires_at: string;
  api_key_id: null;
  line_user_id: null;
  is_line_link: true;
}

export interface PaymentOrderDetailData {
  order_id: string;
  lookup_key: string;
  business_id: string;
  base_amount: number;
  decimal_ref: number;
  total_amount: number;
  qr_payload: string;
  status: PaymentOrderStatus;
  callback_sent: boolean;
  callback_status_code: number | null;
  redirect_url: string | null;
  line_user_id: string | null;
  is_line_link: boolean;
  expires_at: string;
  paid_at: string | null;
  created_at: string;
}

export interface MerchantCallbackPayload {
  ok: boolean;
  event: "payment.paid";
  order_id: string;
  lookup_key: string;
  business_id: string;
  base_amount: number;
  decimal_ref: number;
  total_amount: number;
  status: "PAID";
  paid_at: string;
}

export interface LineWebhookRequest {
  destination?: string;
  events: Array<{
    type?: string;
    timestamp?: number;
    source?: {
      type?: string;
      userId?: string;
    };
    message?: {
      type: string;
      id: string;
      text?: string;
    };
  }>;
}

export interface WebhookProcessedData {
  processed: number;
}

export interface Package {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  max_api_keys: number;
  quota_limit: number;
  rate_limit_per_hour: number;
  billing_cycle_months: number;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePackageRequest {
  code: string;
  name: string;
  description?: string | null;
  price: number;
  max_api_keys: number;
  quota_limit: number;
  rate_limit_per_hour: number;
  billing_cycle_months?: number;
  is_active?: boolean;
}

export type UpdatePackageRequest = Partial<CreatePackageRequest>;

export interface DeletePackageData {
  id: string;
  deleted: boolean;
}

export interface SubscriptionSummary {
  id: string;
  business_id: string;
  package_id: string;
  status: SubscriptionStatus;
  quota_limit: number;
  quota_used: number;
  quota_remaining: number;
  rate_limit_per_hour: number;
  max_api_keys: number;
  current_period_start: string;
  current_period_end: string;
  last_payment_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPeriod {
  id: string;
  subscription_id: string;
  business_id: string;
  package_id: string;
  period_start: string;
  period_end: string;
  quota_limit: number;
  quota_used: number;
  created_at: string;
}

export interface BusinessSubscriptionDetailsData {
  business_id: string;
  subscription: SubscriptionSummary | null;
  api_keys: {
    used: number;
    max: number;
  };
  periods: SubscriptionPeriod[];
}

export interface BusinessUsageData {
  business_id: string;
  subscription: SubscriptionSummary | null;
  current_hour_requests: number;
  keys_breakdown: Array<{
    api_key_id: string;
    name: string;
    key_prefix: string;
    is_active: boolean;
    deleted_at: string | null;
    qr_created_count: number;
    qr_paid_count: number;
    quota_deducted_count: number;
    last_used_at: string | null;
  }>;
}

export interface AssignSubscriptionRequest {
  business_id: string;
  package_id: string;
}

export interface RenewSubscriptionRequest {
  package_id?: string | null;
}

export interface ApiKeySummary {
  id: string;
  business_id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateApiKeyRequest {
  business_id?: string;
  name: string;
  package_id?: string | null;
}

export interface CreateApiKeyData extends ApiKeySummary {
  api_key: string;
}

export interface UpdateApiKeyRequest {
  name?: string;
  is_active?: boolean;
}

export interface RevokeApiKeyData {
  id: string;
  revoked: boolean;
}

export interface ApiKeyUsageLog {
  id: string;
  action: ApiKeyUsageAction;
  payment_order_id: string | null;
  quota_deducted: boolean;
  created_at: string;
}

export interface ApiKeyUsageData {
  api_key_id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  deleted_at: string | null;
  last_used_at: string | null;
  total_qr_created: number;
  total_qr_paid_and_deducted: number;
  current_hour_requests: number;
  recent_logs: ApiKeyUsageLog[];
}

export interface DashboardRange {
  from: string;
  to: string;
  interval: Interval;
  timezone: "Asia/Bangkok";
}

export interface DashboardSeriesPoint {
  bucket_start: string;
  label: string;
  value: number;
}

export interface DashboardSeries {
  key: string;
  label: string;
  points: DashboardSeriesPoint[];
}

export interface DashboardSubscriptionSummary {
  id: string;
  package_id: string;
  package_code: string | null;
  package_name: string | null;
  status: SubscriptionStatus;
  quota_limit: number;
  quota_used: number;
  quota_remaining: number;
  rate_limit_per_hour: number;
  max_api_keys: number;
  current_period_start: string;
  current_period_end: string;
  last_payment_at: string | null;
  days_until_period_end: number;
}

export interface DashboardOverviewData {
  range: DashboardRange;
  business: {
    id: string;
    name: string;
  };
  subscription: DashboardSubscriptionSummary | null;
  usage: {
    qr_created: number;
    qr_paid: number;
    quota_deducted: number;
    paid_rate: number;
  };
  transactions: {
    orders_created: number;
    paid_count: number;
    expired_count: number;
    active_unverified_count: number;
    gmv: number;
    average_order_value: number;
    paid_rate: number;
  };
  api_keys: {
    used: number;
    active: number;
    max: number;
  };
  rate_limit: {
    requests_last_hour: number;
    limit: number;
    remaining: number;
    utilization: number;
  };
  webhook: {
    matched: number;
  };
}

export interface DashboardUsageTimeseriesData {
  range: DashboardRange;
  series: DashboardSeries[];
}

export interface DashboardTransactionsTimeseriesData {
  range: DashboardRange;
  series: DashboardSeries[];
  status_breakdown: {
    PAID: number;
    UNVERIFIED: {
      active: number;
      expired: number;
    };
    EXPIRED: number;
  };
}

export interface DashboardRateLimitData {
  business_id: string;
  requests_last_hour: number;
  limit_per_hour: number;
  remaining: number;
  utilization: number;
  series: DashboardSeriesPoint[];
}

export interface DashboardApiKeyBreakdownData {
  range: DashboardRange;
  summary: {
    total_keys: number;
    active_keys: number;
    revoked_keys: number;
    max_api_keys: number;
  };
  keys: Array<{
    id: string;
    name: string;
    key_prefix: string;
    is_active: boolean;
    deleted_at: string | null;
    created_at: string;
    last_used_at: string | null;
    qr_created: number;
    qr_paid: number;
    quota_deducted: number;
    share_of_created: number;
    share_of_paid: number;
  }>;
}

export interface DashboardApiKeyTimeseriesData {
  range: DashboardRange;
  series: DashboardSeries[];
}

export interface DashboardSubscriptionTrendData {
  current: DashboardSubscriptionSummary | null;
  quota: {
    daily: Array<{
      bucket_start: string;
      label: string;
      quota_deducted: number;
      cumulative_used: number;
      quota_remaining: number;
    }>;
  };
  periods: Array<{
    id: string;
    subscription_id: string;
    business_id: string;
    package_id: string;
    period_start: string;
    period_end: string;
    quota_limit: number;
    quota_used: number;
    utilization: number;
    created_at: string;
  }>;
}

export interface AdminDashboardOverviewData {
  range: DashboardRange;
  businesses: {
    total: number;
    active: number;
    new_in_range: number;
  };
  subscriptions: {
    active: number;
    past_due: number;
    cancelled: number;
    expiring_7d: number;
    expiring_30d: number;
  };
  platform: {
    orders_created: number;
    paid_count: number;
    expired_count: number;
    active_unverified_count: number;
    gmv: number;
    average_order_value: number;
    paid_rate: number;
    qr_created: number;
    qr_paid: number;
  };
  webhook: {
    matched: number;
    no_match: number;
    match_rate: number;
  };
  estimated_mrr: number;
  estimated_arr: number;
}

export interface AdminDashboardTimeseriesData {
  range: DashboardRange;
  series: DashboardSeries[];
}

export interface AdminDashboardDistributionData {
  packages: Array<{
    package_id: string;
    code: string;
    name: string;
    price: number;
    business_count: number;
    active_count: number;
    past_due_count: number;
  }>;
  subscription_status: Array<{
    status: SubscriptionStatus;
    count: number;
  }>;
  quota_utilization: Array<{
    bucket: "0-25" | "26-50" | "51-75" | "76-100" | "100+";
    count: number;
  }>;
}

export interface AdminBusinessListItem {
  business_id: string;
  business_name: string;
  package_code: string | null;
  package_name: string | null;
  subscription_status: SubscriptionStatus | null;
  quota_limit: number | null;
  quota_used: number | null;
  quota_remaining: number | null;
  current_period_end: string | null;
  last_payment_at: string | null;
  api_keys_used: number;
  api_keys_max: number | null;
  qr_created: number;
  qr_paid: number;
  gmv: number;
}

export interface AdminBusinessListData {
  range: DashboardRange;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  items: AdminBusinessListItem[];
}

export interface AdminExpiringData {
  expiring: Array<{
    business_id: string;
    business_name: string;
    subscription_id: string;
    status: SubscriptionStatus;
    current_period_end: string;
    days_remaining: number;
    quota_remaining: number;
    quota_limit: number;
  }>;
  near_quota: Array<{
    business_id: string;
    business_name: string;
    subscription_id: string;
    status: SubscriptionStatus;
    current_period_end: string;
    quota_used: number;
    quota_limit: number;
    quota_remaining: number;
    utilization: number;
  }>;
}

export interface DashboardQuery {
  from?: string;
  to?: string;
  interval?: Interval;
  business_id?: string;
}

export interface UsageTimeseriesQuery extends DashboardQuery {
  metric?: "qr_created" | "qr_paid" | "quota_deducted";
  api_key_id?: string;
}

export interface RateLimitQuery {
  hours?: number;
  business_id?: string;
}

export interface ApiKeyBreakdownQuery {
  from?: string;
  to?: string;
  include_deleted?: boolean;
  business_id?: string;
}

export interface ApiKeyTimeseriesQuery extends ApiKeyBreakdownQuery {
  interval?: Interval;
  metric?: "qr_created" | "qr_paid" | "quota_deducted";
  api_key_id?: string;
}

export interface AdminBusinessListQuery {
  from?: string;
  to?: string;
  search?: string;
  package_id?: string;
  status?: SubscriptionStatus;
  sort_by?:
    | "gmv"
    | "qr_created"
    | "qr_paid"
    | "quota_used"
    | "current_period_end"
    | "created_at";
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface AdminExpiringQuery {
  days?: number;
  quota_threshold?: number;
}
