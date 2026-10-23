/**
 * Tiny EMVCo TLV reader for PromptPay payloads.
 *
 * The backoffice only needs the receiver reference so the linking screen can
 * show the same payee block a banking app shows before a transfer. Everything
 * is best-effort: a malformed payload simply yields `null` and the UI falls
 * back to a dash instead of breaking the linking flow.
 */

interface TlvField {
  tag: string;
  value: string;
}

/** PromptPay merchant account AID (`tag 29 / sub-tag 00`). */
const PROMPTPAY_AID = "A000000677010111";

function readTlv(payload: string): TlvField[] | null {
  const fields: TlvField[] = [];
  let index = 0;

  while (index < payload.length) {
    const tag = payload.slice(index, index + 2);
    const lengthRaw = payload.slice(index + 2, index + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthRaw)) return null;

    const length = Number(lengthRaw);
    const value = payload.slice(index + 4, index + 4 + length);
    if (value.length !== length) return null;

    fields.push({ tag, value });
    index += 4 + length;
  }

  return fields;
}

function readField(fields: TlvField[], tag: string): string | null {
  return fields.find((field) => field.tag === tag)?.value ?? null;
}

function group(value: string, sizes: number[], separator = "-"): string {
  const parts: string[] = [];
  let cursor = 0;
  for (const size of sizes) {
    parts.push(value.slice(cursor, cursor + size));
    cursor += size;
  }
  if (cursor < value.length) parts.push(value.slice(cursor));
  return parts.filter(Boolean).join(separator);
}

export type PromptPayAccountKind = "phone" | "national_id" | "ewallet";

export interface PromptPayAccount {
  kind: PromptPayAccountKind;
  /** Digits exactly as stored in the payload. */
  id: string;
  /** Human-readable reference, e.g. `081-234-5678`. */
  formatted: string;
  /** Same reference with the middle digits hidden, e.g. `081-xxx-5678`. */
  masked: string;
}

/**
 * Extracts the PromptPay receiver reference from a QR payload.
 * Returns `null` when the payload is not a personal PromptPay QR.
 */
export function parsePromptPayAccount(
  payload: string | null | undefined,
): PromptPayAccount | null {
  if (!payload) return null;

  const root = readTlv(payload);
  if (!root) return null;

  const merchant = readField(root, "29");
  if (!merchant) return null;

  const inner = readTlv(merchant);
  if (!inner || readField(inner, "00") !== PROMPTPAY_AID) return null;

  const phone = readField(inner, "02");
  if (phone) {
    // Mobile numbers are stored as `0066` + 9 digits (no leading zero).
    const local = phone.startsWith("0066") ? `0${phone.slice(4)}` : phone;
    if (local.length >= 9) {
      return {
        kind: "phone",
        id: local,
        formatted: group(local, [3, 3, 4]),
        masked: `${local.slice(0, 3)}-xxx-${local.slice(-4)}`,
      };
    }
  }

  const nationalId = readField(inner, "01");
  if (nationalId && nationalId.length === 13) {
    return {
      kind: "national_id",
      id: nationalId,
      formatted: group(nationalId, [1, 4, 5, 2, 1]),
      masked: `${nationalId.slice(0, 1)}-xxxx-xxxxx-xx-${nationalId.slice(-1)}`,
    };
  }

  const ewallet = readField(inner, "03");
  if (ewallet) {
    return {
      kind: "ewallet",
      id: ewallet,
      formatted: group(ewallet, [4, 4, 4]),
      masked: `xxxx-xxxx-${ewallet.slice(-4)}`,
    };
  }

  return null;
}
