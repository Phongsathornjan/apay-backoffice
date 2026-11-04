"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Server,
  Search,
  SearchX,
  ShieldCheck,
  Sparkles,
  Webhook,
  Zap,
} from "lucide-react";
import { API_BASE_URL, API_PREFIX } from "@/services/api";
import {
  ERROR_CODES,
  INTEGRATION_STEPS,
  QUICKSTART_CURL,
  QUICKSTART_FETCH,
  SECTIONS,
} from "@/lib/developer-docs";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { CodeBlock } from "@/components/developer-docs/code-block";
import { CopyAiContextButton } from "@/components/developer-docs/copy-ai-context";
import { EndpointCard } from "@/components/developer-docs/endpoint-card";
import { cn } from "@/lib/utils";

const BASE_URL = `${API_BASE_URL}${API_PREFIX}`;

const SUCCESS_ENVELOPE = `{
  "ok": true,
  "status": 200,
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "data": { }
}`;

const ERROR_ENVELOPE = `{
  "ok": false,
  "status": 403,
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Business package is inactive or unpaid"
}`;

const CORRELATION_HEADER = `x-correlation-id: 550e8400-e29b-41d4-a716-446655440000`;

export default function DeveloperDocsPage() {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState(SECTIONS[0]?.id ?? "");
  const [quickStartTab, setQuickStartTab] = useState<"curl" | "fetch">("curl");

  const filteredSections = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return SECTIONS;

    return SECTIONS.map((section) => {
      const sectionMatches = `${section.title} ${section.description}`
        .toLowerCase()
        .includes(keyword);
      const endpoints = sectionMatches
        ? section.endpoints
        : section.endpoints.filter((endpoint) =>
            `${endpoint.method} ${endpoint.path} ${endpoint.summary} ${endpoint.description}`
              .toLowerCase()
              .includes(keyword),
          );
      return { ...section, endpoints };
    }).filter((section) => section.endpoints.length > 0);
  }, [query]);

  useEffect(() => {
    const elements = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (element): element is HTMLElement => Boolean(element),
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: 0 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [query]);

  const totalEndpoints = SECTIONS.reduce((total, section) => total + section.endpoints.length, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Developer documentation"
        title="Developer Docs"
        actions={
          <>
            <Badge tone="brand">
              <BookOpen className="size-3" />
              REST · OpenAPI 3.0.3
            </Badge>
            <CopyAiContextButton baseUrl={BASE_URL} />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            <Server className="size-3.5 text-brand" aria-hidden="true" />
            Base URL
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <code className="min-w-0 break-all font-mono text-xs font-semibold text-ink">
              {BASE_URL}
            </code>
            <CopyButton value={BASE_URL} iconOnly label="คัดลอก Base URL" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            <ShieldCheck className="size-3.5 text-brand" aria-hidden="true" />
            Authentication
          </div>
          <p className="mt-2 text-xs font-semibold text-ink">Bearer JWT + Refresh Token</p>
          <p className="mt-1 text-[11px] leading-4 text-ink-secondary">
            access_token อายุ 15 นาที · ต่ออายุด้วย refresh_token (Token Rotation)
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            <Zap className="size-3.5 text-brand" aria-hidden="true" />
            Conventions
          </div>
          <p className="mt-2 text-xs font-semibold text-ink">Asia/Bangkok · THB · UTC+7</p>
        </Card>
      </div>

      <Card className="p-3 lg:hidden">
        <label htmlFor="docs-search-mobile" className="sr-only">
          ค้นหา endpoint
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            id="docs-search-mobile"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหา endpoint เช่น qr, webhook, api key…"
            className="h-10 w-full rounded-control border border-line bg-surface-subtle pl-9 pr-3 text-xs text-ink outline-none placeholder:text-ink-muted focus:border-brand focus:ring-4 focus:ring-brand/10"
          />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden self-start lg:sticky lg:top-20 lg:block">
          <div className="rounded-panel border border-line bg-surface p-3 shadow-card">
            <label htmlFor="docs-search" className="sr-only">
              ค้นหา endpoint
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                id="docs-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหา endpoint…"
                className="h-9 w-full rounded-control border border-line bg-surface-subtle pl-8 pr-2 text-[11px] text-ink outline-none placeholder:text-ink-muted focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>

            <nav aria-label="สารบัญเอกสาร" className="mt-3 space-y-0.5">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  aria-current={activeSection === section.id ? "true" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-control px-2.5 py-2 text-[11px] font-medium transition-colors",
                    activeSection === section.id
                      ? "bg-brand-soft text-brand-ink"
                      : "text-ink-secondary hover:bg-surface-subtle hover:text-ink",
                  )}
                >
                  <span className="truncate">{section.title}</span>
                  <span className="font-mono text-[10px] text-ink-muted">
                    {section.endpoints.length}
                  </span>
                </a>
              ))}
              <a
                href="#errors"
                className="flex items-center justify-between gap-2 rounded-control px-2.5 py-2 text-[11px] font-medium text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink"
              >
                Error handling
                <span className="font-mono text-[10px] text-ink-muted">{ERROR_CODES.length}</span>
              </a>
            </nav>

            <p className="mt-3 border-t border-line pt-3 text-[10px] leading-4 text-ink-muted">
              {totalEndpoints} endpoints · API v1
            </p>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <section id="quick-start" className="scroll-mt-24 space-y-4">
            <Card className="overflow-hidden">
              <div className="border-b border-line px-4 py-3.5 sm:px-5">
                <h2 className="text-sm font-semibold text-ink">เริ่มต้นใช้งานใน 4 ขั้นตอน</h2>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  เส้นทางการเชื่อมต่อสำหรับระบบรับชำระเงินอัตโนมัติ: API Key → JWT → QR → Webhook or Live Polling
                </p>
              </div>
              <ol className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
                {INTEGRATION_STEPS.map((step, index) => (
                  <li
                    key={step.title}
                    className="rounded-card border border-line bg-surface-subtle p-3"
                  >
                    <span className="flex size-6 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="mt-2 text-xs font-semibold text-ink">{step.title}</p>
                    <p className="mt-1 text-[11px] leading-4 text-ink-secondary">
                      {step.description}
                    </p>
                  </li>
                ))}
              </ol>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
                  <div>
                    <h2 className="text-sm font-semibold text-ink">Quick start</h2>
                    <p className="mt-0.5 text-[11px] text-ink-secondary">
                      แลก API Key แล้วสร้าง QR ใบแรก
                    </p>
                  </div>
                  <SegmentedControl
                    size="sm"
                    value={quickStartTab}
                    onChange={setQuickStartTab}
                    options={[
                      { value: "curl", label: "cURL" },
                      { value: "fetch", label: "JavaScript" },
                    ]}
                  />
                </div>
                <div className="p-4">
                  <CodeBlock
                    code={quickStartTab === "curl" ? QUICKSTART_CURL : QUICKSTART_FETCH}
                    label={quickStartTab === "curl" ? "terminal" : "javascript"}
                  />
                  <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-ink-muted">
                    <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
                    ใช้ AI Agent ช่วยเขียนโค้ด? กด “For AI Agent” ด้านบนเพื่อคัดลอก prompt ที่มี
                    Base URL, endpoint, payload และ error handling ครบแล้ว
                  </p>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b border-line px-4 py-3 sm:px-5">
                  <h2 className="text-sm font-semibold text-ink">Response envelope</h2>
                  <p className="mt-0.5 text-[11px] text-ink-secondary">
                    สำเร็จและผิดพลาดใช้รูปแบบเดียวกัน เสถียรต่อการ parse
                  </p>
                </div>
                <div className="space-y-3 p-4">
                  <CodeBlock code={SUCCESS_ENVELOPE} label="success · 2xx" />
                  <CodeBlock code={ERROR_ENVELOPE} label="error · 4xx / 5xx" />
                  <div className="rounded-card border border-line bg-surface-subtle p-3">
                    <p className="text-[11px] font-semibold text-ink">Correlation ID</p>
                    <p className="mt-1 text-[11px] leading-4 text-ink-secondary">
                      แนบ header นี้เพื่อให้ทีมผู้ดูแลตรวจสอบ log ได้ตรง request
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <code className="min-w-0 break-all font-mono text-[11px] text-ink-secondary">
                        {CORRELATION_HEADER}
                      </code>
                      <CopyButton value={CORRELATION_HEADER} iconOnly label="คัดลอก header" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {filteredSections.length === 0 ? (
            <Card>
              <EmptyState
                icon={SearchX}
                title="ไม่พบ endpoint ที่ค้นหา"
                description={`ลองค้นหาด้วยคำอื่น เช่น "qr", "webhook" หรือ "api key" (คำค้น: ${query.trim()})`}
                action={
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="text-xs font-semibold text-brand-ink hover:underline"
                  >
                    ล้างคำค้นหา
                  </button>
                }
              />
            </Card>
          ) : (
            filteredSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 space-y-3"
                aria-labelledby={`${section.id}-title`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1">
                  <div>
                    <h2
                      id={`${section.id}-title`}
                      className="text-lg font-bold tracking-tight text-ink"
                    >
                      {section.title}
                    </h2>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-secondary">
                      {section.description}
                    </p>
                  </div>
                  <Badge tone="neutral">{section.endpoints.length} endpoints</Badge>
                </div>

                {section.endpoints.map((endpoint) => (
                  <EndpointCard key={endpoint.id} endpoint={endpoint} />
                ))}
              </section>
            ))
          )}

          <section id="errors" className="scroll-mt-24 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-ink">Error handling</h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-secondary">
                  ตรวจสอบฟิลด์ ok และ status จาก envelope ก่อนอ่าน message — เก็บ correlation_id ไว้ทุกครั้ง
                  ที่แจ้งปัญหา
                </p>
              </div>
              <Badge tone="neutral">{ERROR_CODES.length} status codes</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {ERROR_CODES.map((code) => (
                <Card key={code.status} className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-base font-bold tabular-nums text-ink">
                      {code.status}
                    </span>
                    <Badge tone={code.tone}>{code.title}</Badge>
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-ink-secondary">{code.description}</p>
                </Card>
              ))}
            </div>

            <Card className="flex items-start gap-3 border-info-border bg-info-soft p-4">
              <Webhook className="mt-0.5 size-4 shrink-0 text-info-ink" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-info-ink">Retry policy ที่แนะนำ</p>
                <p className="mt-1 text-[11px] leading-4 text-info-ink/90">
                  สำหรับ 429 ให้เคารพ Rate Limit และ retry ด้วย exponential backoff · สำหรับ 5xx ให้ retry
                  แบบจำกัดจำนวนครั้ง · สำหรับ 4xx อื่น ๆ ควรแก้ request ก่อนส่งซ้ำ · Webhook ที่ไม่ได้รับ 2xx
                  ควรตรวจสอบย้อนหลังด้วย GET /api/v1/payments/orders/{"{id}"}
                </p>
              </div>
            </Card>
          </section>

          <p className="pb-2 text-[11px] leading-4 text-ink-muted">
            copyright © 2024 AI Era Solution Co., Ltd. All rights reserved. · API v1 · Asia/Bangkok (UTC+7)
          </p>
        </div>
      </div>
    </div>
  );
}
