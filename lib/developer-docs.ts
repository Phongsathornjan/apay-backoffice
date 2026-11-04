export type DocMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type DocAuth = "none" | "bearer" | "api-key";

export interface DocParam {
  name: string;
  location: "path" | "query" | "body" | "header";
  required?: boolean;
  description: string;
}

export interface DocEndpoint {
  id: string;
  method: DocMethod;
  path: string;
  summary: string;
  description: string;
  auth: DocAuth;
  params?: DocParam[];
  request?: string;
  response?: string;
  notes?: string[];
}

export interface DocSection {
  id: string;
  title: string;
  description: string;
  endpoints: DocEndpoint[];
}

export interface QuickStartStep {
  title: string;
  description: string;
}

const CORRELATION_ID = "550e8400-e29b-41d4-a716-446655440000";
const BUSINESS_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
const API_KEY_EXAMPLE = "apay_live_1a2b3c4d_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c";

export const INTEGRATION_STEPS: QuickStartStep[] = [
  {
    title: "สร้าง API Key",
    description:
      "สร้างจากเมนู API Keys ใน Portal",
  },
  {
    title: "แลก API Key เป็น JWT",
    description:
      "POST /api/v1/auth/token เพื่อรับ access_token",
  },
  {
    title: "สร้าง PromptPay QR",
    description:
      "POST /api/v1/payments/qr เพื่อรับ QR Code และ Order ID",
  },
  {
    title: "รับผลการชำระเงิน",
    description:
      "GET /payments/orders/{id} เพื่อตรวจสอบสถานะ หรือรอ Webhook ที่ Redirect URL เมื่อจับคู่สำเร็จ",
  },
];

export const QUICKSTART_CURL = `# 1) แลก API Key เป็น JWT
curl -X POST "$APAY_BASE_URL/api/v1/auth/token" \\
  -H "Content-Type: application/json" \\
  -d '{"api_key":"${API_KEY_EXAMPLE}"}'

# 2) สร้าง PromptPay QR ด้วย access_token ที่ได้
curl -X POST "$APAY_BASE_URL/api/v1/payments/qr" \\
  -H "Authorization: Bearer $ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"amount":100,"redirect_url":"https://merchant.example.com/webhooks/apay"}'`;

export const QUICKSTART_FETCH = `const BASE_URL = process.env.APAY_BASE_URL; // เช่น http://localhost:3000

const res = await fetch(BASE_URL + "/api/v1/payments/qr", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + accessToken,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount: 100,
    redirect_url: "https://merchant.example.com/webhooks/apay",
  }),
});

const payload = await res.json();

if (!payload.ok) {
  // payload = { ok: false, status, correlation_id, message }
  throw new Error(payload.message);
}

// payload.data = CreateQrData
console.log(payload.data.order_id, payload.data.total_amount);
console.log(payload.data.qr_image); // data:image/png;base64,...`;

export const ERROR_CODES: Array<{
  status: string;
  title: string;
  description: string;
  tone: "warning" | "danger" | "info" | "neutral";
}> = [
  {
    status: "400",
    title: "Bad Request",
    description:
      "ข้อมูลไม่ผ่าน validation เช่น amount < 1, redirect_url ไม่ใช่ URL, amount มีเศษสตางค์แต่ส่ง zero_decimal: true",
    tone: "warning",
  },
  {
    status: "401",
    title: "Unauthorized",
    description: "ไม่ได้แนบ JWT, Token หมดอายุ, API Key ไม่ถูกต้อง หรือ Refresh Token ถูกใช้งานไปแล้ว",
    tone: "danger",
  },
  {
    status: "403",
    title: "Forbidden",
    description:
      "Subscription ไม่ได้อยู่ในสถานะ ACTIVE / เลย paid-through หรือ API Key ถูกปิดใช้งาน",
    tone: "danger",
  },
  {
    status: "404",
    title: "Not Found",
    description: "ไม่พบคำสั่งซื้อ หรือคำสั่งซื้อนั้นไม่ได้เป็นของธุรกิจผู้เรียก",
    tone: "neutral",
  },
  {
    status: "409",
    title: "Conflict",
    description:
      "ทศนิยมอ้างอิง 0.01–0.99 เต็มทั้ง 99 ช่อง หรือขอ QR แบบ zero_decimal ยอดเดิมซ้ำภายใน 1 นาที",
    tone: "warning",
  },
  {
    status: "429",
    title: "Too Many Requests",
    description: "โควต้าเดือนนี้หมด หรือสร้าง QR เกิน rate_limit_per_hour ใน 60 นาทีล่าสุด",
    tone: "warning",
  },
  {
    status: "500",
    title: "Internal Server Error",
    description: "เกิดข้อผิดพลาดภายในระบบ — แจ้งทีมผู้ดูแลพร้อมค่า correlation_id ที่แนบมากับ response",
    tone: "danger",
  },
];

export const SECTIONS: DocSection[] = [
  {
    id: "auth",
    title: "Authentication",
    description:
      "ระบบร้านค้าแลก API Key เป็น JWT แล้วแนบ Bearer Token ในทุกคำขอ — Token มีอายุ 15 นาทีและต่ออายุได้ด้วย refresh_token",
    endpoints: [
      {
        id: "auth-token",
        method: "POST",
        path: "/api/v1/auth/token",
        summary: "แลก API Key เป็น JWT Token Bundle",
        description:
          "ส่ง API Key ทาง Header x-api-key หรือใน JSON Body ชื่อ api_key อย่างใดอย่างหนึ่ง ระบบจะตรวจว่า Key ยัง active และไม่ถูก Soft Delete",
        auth: "api-key",
        params: [
          {
            name: "api_key",
            location: "body",
            description: "API Key ของธุรกิจ (ไม่บังคับหากส่ง Header x-api-key แล้ว)",
          },
          {
            name: "x-api-key",
            location: "header",
            description: "API Key รูปแบบ apay_live_<8_hex>_<32_hex>",
          },
        ],
        request: `{
  "api_key": "${API_KEY_EXAMPLE}"
}`,
        response: `{
  "ok": true,
  "status": 200,
  "correlation_id": "${CORRELATION_ID}",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 900
  }
}`,
        notes: [
          "Token ที่ได้จะผูก api_key_id มาด้วย ทำให้ Usage Analytics แยกรายคีย์ได้",
          "expires_in มีหน่วยเป็นวินาที (ค่าเริ่มต้น 900 = 15 นาที)",
        ],
      },
      {
        id: "auth-refresh",
        method: "POST",
        path: "/api/v1/auth/refresh",
        summary: "ต่ออายุ JWT ด้วย Refresh Token (Token Rotation)",
        description:
          "ส่ง refresh_token ล่าสุดเพื่อรับ access_token และ refresh_token ชุดใหม่ โดย Refresh Token เดิมจะถูกแทนที่ทันที",
        auth: "none",
        params: [
          {
            name: "refresh_token",
            location: "body",
            required: true,
            description: "Refresh Token ล่าสุดจาก /auth/token หรือ /auth/refresh",
          },
        ],
        request: `{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}`,
        response: `{
  "ok": true,
  "status": 200,
  "correlation_id": "${CORRELATION_ID}",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 900
  }
}`,
        notes: ["ถ้า Key ถูกปิดใช้งาน (is_active = false) Refresh Token ของ Key นั้นจะใช้ไม่ได้ทันที"],
      },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    description:
      "สร้าง PromptPay QR และติดตามสถานะคำสั่งซื้อ ระบบจองเศษสตางค์อ้างอิงอัตโนมัติเพื่อจับคู่ยอดโอน และ QR มีอายุ 5 นาที",
    endpoints: [
      {
        id: "payments-create-qr",
        method: "POST",
        path: "/api/v1/payments/qr",
        summary: "สร้างรายการชำระเงิน PromptPay QR Code",
        description:
          "สร้างคำสั่งซื้อสำหรับธุรกิจของ Token ที่เรียกใช้งาน ระบบปัด amount ลงเป็นจำนวนเต็มแล้วบวก decimal_ref 0.01–0.99 (หรือ 0 เมื่อ zero_decimal = true) พร้อมบันทึก Usage Log QR_CREATED",
        auth: "bearer",
        params: [
          {
            name: "amount",
            location: "body",
            required: true,
            description: "จำนวนเงินตั้งต้น (>= 1) — โหมดปกติต้องเป็นจำนวนเต็ม",
          },
          {
            name: "redirect_url",
            location: "body",
            required: true,
            description: "URL ปลายทางที่ต้องการรับ Webhook payment.paid",
          },
          {
            name: "zero_decimal",
            location: "body",
            description:
              "true = สร้างยอดลงท้าย .00 (amount ต้องเป็นจำนวนเต็ม) / false = จองเศษสตางค์อ้างอิงตามปกติ",
          },
        ],
        request: `{
  "amount": 100,
  "redirect_url": "https://merchant.example.com/webhooks/apay",
  "zero_decimal": false
}`,
        response: `{
  "ok": true,
  "status": 201,
  "correlation_id": "${CORRELATION_ID}",
  "data": {
    "order_id": "20261020153045_100.01",
    "lookup_key": "20261020_100.01",
    "base_amount": 100,
    "decimal_ref": 0.01,
    "total_amount": 100.01,
    "qr_payload": "00020101021229370016A000000677010111011300668123456785802TH53037645406100.016304ABCD",
    "qr_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "status": "UNVERIFIED",
    "redirect_url": "https://merchant.example.com/webhooks/apay",
    "expires_at": "2026-10-20T08:35:45.000Z",
    "api_key_id": "d4e5f6a7-b8c9-0123-def0-234567890123"
  }
}`,
        notes: [
          "ต้องมี Subscription ACTIVE และ quota_remaining > 0 มิฉะนั้นได้ 403 หรือ 429",
          "Rate Limit นับจาก QR_CREATED ใน 60 นาทีล่าสุด เทียบกับ rate_limit_per_hour ของแพ็กเกจ",
          "โหมด zero_decimal ที่ขอยอดเดิมซ้ำภายใน 1 นาทีจะได้ 409 — ให้รอ 1 นาทีหรือใช้โหมดมีทศนิยมแทน",
          "ทศนิยมอ้างอิงของ base_amount เดียวกันจองได้ 99 ช่องพร้อมกัน (0.01–0.99)",
        ],
      },
      {
        id: "payments-order-detail",
        method: "GET",
        path: "/api/v1/payments/orders/{id}",
        summary: "ดูรายละเอียดและสถานะคำสั่งซื้อ",
        description:
          "ดึงข้อมูลคำสั่งซื้อตาม order_id โดย business เข้าถึงได้เฉพาะคำสั่งซื้อของตัวเอง — ใช้สำหรับ polling สถานะเมื่อยังไม่ได้รับ Webhook",
        auth: "bearer",
        params: [
          {
            name: "id",
            location: "path",
            required: true,
            description: "order_id รูปแบบ YYYYMMDDHHmmss_<total_amount>",
          },
        ],
        response: `{
  "ok": true,
  "status": 200,
  "correlation_id": "${CORRELATION_ID}",
  "data": {
    "order_id": "20261020153045_100.01",
    "lookup_key": "20261020_100.01",
    "business_id": "${BUSINESS_ID}",
    "base_amount": 100,
    "decimal_ref": 0.01,
    "total_amount": 100.01,
    "qr_payload": "00020101021229370016A000000677010111011300668123456785802TH53037645406100.016304ABCD",
    "status": "PAID",
    "callback_sent": true,
    "callback_status_code": 200,
    "redirect_url": "https://merchant.example.com/webhooks/apay",
    "expires_at": "2026-10-20T08:35:45.000Z",
    "paid_at": "2026-10-20T08:31:12.000Z",
    "created_at": "2026-10-20T08:30:45.000Z"
  }
}`,
        notes: [
          "status เป็นได้ 3 ค่า: UNVERIFIED, PAID, EXPIRED",
          "callback_sent / callback_status_code บอกผลการยิง Webhook ไปยัง redirect_url",
        ],
      },
    ],
  },
  {
    id: "webhooks",
    title: "Webhooks",
    description:
      "APay จะ POST ผลการชำระเงินไปยัง redirect_url ของออเดอร์ (timeout 5 วินาที) โดยถือว่า 2xx = สำเร็จ",
    endpoints: [
      {
        id: "webhook-payment-paid",
        method: "POST",
        path: "{redirect_url}",
        summary: "Webhook Callback: payment.paid",
        description:
          "เมื่อระบบจับคู่ยอดโอนกับ lookup_key สำเร็จและยังไม่หมดอายุ จะเปลี่ยนสถานะออเดอร์เป็น PAID, หักโควต้า 1 ครั้ง แล้วยิง callback นี้ทันที — ควรตอบ 2xx ให้เร็วที่สุดและประมวลผล Business Logic แบบ idempotent ด้วย order_id",
        auth: "none",
        request: `{
  "ok": true,
  "event": "payment.paid",
  "order_id": "20261020153045_100.01",
  "lookup_key": "20261020_100.01",
  "business_id": "${BUSINESS_ID}",
  "base_amount": 100,
  "decimal_ref": 0.01,
  "total_amount": 100.01,
  "status": "PAID",
  "paid_at": "2026-10-20T08:31:12.000Z"
}`,
        notes: [
          "ตอบกลับ 2xx ภายใน 5 วินาที ระบบจะบันทึก callback_sent = true และ callback_status_code",
          "อย่าถือว่า callback เรียงลำดับเสมอ — ตรวจสอบ order_id และสถานะเดิมก่อนอัปเดตข้อมูล",
          "หากต้องการตรวจสอบย้อนหลัง ให้ใช้ GET /api/v1/payments/orders/{id} เป็น source of truth",
        ],
      },
    ],
  },
];

/**
 * Builds a self-contained prompt for an AI coding agent that integrates the
 * merchant-side APay flow (API key → JWT → PromptPay QR → webhook).
 */
export function buildAiContext(baseUrl: string): string {
  const lines: string[] = [];

  lines.push("# APay Backend API v1 — Integration Context (PromptPay)");
  lines.push("");
  lines.push(
    "You are an AI coding agent helping a merchant build an automated PromptPay payment flow with the APay Backend API.",
  );
  lines.push(
    "Use ONLY the endpoints, request fields, response fields, and status values documented below. Do not invent endpoints, fields, headers, or status values.",
  );
  lines.push("");
  lines.push(`Base URL: ${baseUrl}`);
  lines.push("");
  lines.push("## Ground rules");
  lines.push("- Currency is THB and all timestamps are Asia/Bangkok (UTC+7), returned as ISO date-time.");
  lines.push(
    "- Every response uses the envelope `{ ok, status, correlation_id, data }` on success or `{ ok, status, correlation_id, message }` on error. Always check `ok` before reading `data`.",
  );
  lines.push(
    "- Send an optional `x-correlation-id` header (UUID) so requests can be traced; include the returned `correlation_id` in any error log.",
  );
  lines.push(
    "- Authenticate with `Authorization: Bearer <access_token>`. Access tokens live 900 seconds; refresh them with the refresh token (rotation: the old refresh token stops working).",
  );
  lines.push(
    "- Token exchange requires an active API key. QR creation additionally requires a Subscription in ACTIVE status that has not passed its paid-through date; otherwise the API returns 403/429 — surface the message to the merchant instead of retrying blindly.",
  );
  lines.push(
    "- Payment order status values are exactly: UNVERIFIED, PAID, EXPIRED. A QR expires 5 minutes after creation.",
  );
  lines.push(
    "- `amount` is the requested price. The API floors it to `base_amount` and reserves a decimal reference `decimal_ref` (0.01–0.99) so the payable amount `total_amount` is unique; always show `total_amount` to the payer. With `zero_decimal: true` the amount must be a whole number and `decimal_ref` is 0.",
  );
  lines.push(
    "- Never log or expose API keys, access tokens, or refresh tokens in client-side code or logs.",
  );
  lines.push("");

  lines.push("## Required integration flow");
  INTEGRATION_STEPS.forEach((step, index) => {
    lines.push(`${index + 1}. ${step.title} — ${step.description}`);
  });
  lines.push("");

  for (const section of SECTIONS) {
    lines.push(`## ${section.title}`);
    lines.push(section.description);
    lines.push("");

    for (const endpoint of section.endpoints) {
      lines.push(`### ${endpoint.method} ${endpoint.path} — ${endpoint.summary}`);
      lines.push(endpoint.description);
      lines.push("");

      if (endpoint.params?.length) {
        lines.push("Parameters:");
        for (const param of endpoint.params) {
          lines.push(
            `- \`${param.name}\` (${param.location}${param.required ? ", required" : ", optional"}): ${param.description}`,
          );
        }
        lines.push("");
      }

      if (endpoint.request) {
        lines.push(
          endpoint.id === "webhook-payment-paid" ? "Inbound webhook payload:" : "Request example:",
        );
        lines.push("```json");
        lines.push(endpoint.request);
        lines.push("```");
        lines.push("");
      }

      if (endpoint.response) {
        lines.push("Response example:");
        lines.push("```json");
        lines.push(endpoint.response);
        lines.push("```");
        lines.push("");
      }

      if (endpoint.notes?.length) {
        lines.push("Notes:");
        for (const note of endpoint.notes) lines.push(`- ${note}`);
        lines.push("");
      }
    }
  }

  lines.push("## Webhook handling contract");
  lines.push(
    "- APay sends `POST` to the `redirect_url` of the order with event `payment.paid` (timeout 5 seconds).",
  );
  lines.push(
    "- Respond with any 2xx as fast as possible; APay records `callback_sent` and `callback_status_code`.",
  );
  lines.push(
    "- Process idempotently: deduplicate by `order_id`, verify the order with GET /api/v1/payments/orders/{id} when needed, and never trust delivery ordering.",
  );
  lines.push(
    "- If no webhook arrives, poll GET /api/v1/payments/orders/{id} while status is UNVERIFIED and before `expires_at`.",
  );
  lines.push("");

  lines.push("## Error handling");
  for (const code of ERROR_CODES) {
    lines.push(`- ${code.status} ${code.title}: ${code.description}`);
  }
  lines.push(
    "- For 429: respect the rate limit and retry with exponential backoff. For 5xx: retry a limited number of times. For other 4xx: fix the request before retrying.",
  );
  lines.push("");
  lines.push(
    "When you generate code, keep the API key and token exchange on the server side, validate inputs (amount >= 1, redirect_url must be a valid absolute URL such as HTTPS), and expose clear error messages to the operator.",
  );

  return lines.join("\n");
}
