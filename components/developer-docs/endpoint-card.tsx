"use client";

import { KeyRound, ShieldOff } from "lucide-react";
import type { DocAuth, DocEndpoint, DocMethod } from "@/lib/developer-docs";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { CodeBlock } from "@/components/developer-docs/code-block";

const METHOD_TONE: Record<DocMethod, BadgeTone> = {
  GET: "info",
  POST: "success",
  PATCH: "warning",
  DELETE: "danger",
};

function authLabel(auth: DocAuth) {
  switch (auth) {
    case "bearer":
      return "Bearer JWT";
    case "api-key":
      return "x-api-key";
    default:
      return "ไม่ต้องยืนยันตัวตน";
  }
}

export function EndpointCard({ endpoint }: { endpoint: DocEndpoint }) {
  const AuthIcon = endpoint.auth === "none" ? ShieldOff : KeyRound;

  return (
    <Card id={endpoint.id} className="scroll-mt-24 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-subtle px-4 py-2.5 sm:px-5">
        <Badge tone={METHOD_TONE[endpoint.method]} className="font-mono">
          {endpoint.method}
        </Badge>
        <code className="min-w-0 break-all font-mono text-xs font-semibold text-ink">
          {endpoint.path}
        </code>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
          <AuthIcon className="size-3 text-ink-muted" aria-hidden="true" />
          {authLabel(endpoint.auth)}
        </span>
      </div>

      <CardBody className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">{endpoint.summary}</h3>
          <p className="mt-1 text-xs leading-5 text-ink-secondary">{endpoint.description}</p>
        </div>

        {endpoint.params?.length ? (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Parameters
            </p>
            <div className="divide-y divide-line overflow-hidden rounded-card border border-line">
              {endpoint.params.map((param) => (
                <div
                  key={`${param.location}-${param.name}`}
                  className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-baseline sm:gap-3"
                >
                  <div className="flex min-w-[190px] flex-wrap items-center gap-1.5">
                    <code className="font-mono text-[11px] font-semibold text-brand-ink">
                      {param.name}
                    </code>
                    <span className="text-[10px] uppercase tracking-wide text-ink-muted">
                      {param.location}
                    </span>
                    {param.required ? (
                      <Badge tone="danger" className="px-1.5 py-0 text-[10px]">
                        required
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-[11px] leading-5 text-ink-secondary">{param.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {endpoint.request ? (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {endpoint.id === "webhook-payment-paid" ? "Callback payload" : "Request body"}
            </p>
            <CodeBlock
              code={endpoint.request}
              label={endpoint.id === "webhook-payment-paid" ? "payload.json" : "request.json"}
            />
          </div>
        ) : null}

        {endpoint.response ? (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Response
            </p>
            <CodeBlock code={endpoint.response} label="response.json" />
          </div>
        ) : null}

        {endpoint.notes?.length ? (
          <ul className="space-y-1.5 rounded-card border border-brand-border bg-brand-soft/60 px-3.5 py-3">
            {endpoint.notes.map((note) => (
              <li
                key={note}
                className="flex gap-2 text-[11px] leading-5 text-brand-ink"
              >
                <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-brand" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}
