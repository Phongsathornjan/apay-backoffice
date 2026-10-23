/**
 * Bank registry for the LINE linking flow.
 *
 * A business links one LINE User ID per bank account whose "money in"
 * notifications are forwarded to APay. Today only KBank is implemented end to
 * end (`POST /api/v1/webhooks/kbank/line` + `parseKBankMessage`), so every other
 * bank is listed but marked `supported: false` ("เร็ว ๆ นี้").
 *
 * To enable a new bank later:
 *   1. Add the backend webhook + message parser for that bank.
 *   2. Flip `supported: true` here (the picker, copy and badges update
 *      automatically).
 *   3. If the backend starts storing the bank per business, pass the selected
 *      bank in the link request — do not send it before that exists: the
 *      backend ValidationPipe is `whitelist: true`, so the field would be
 *      silently dropped.
 */

export type BankCode = "kbank" | "scb" | "ktb" | "bbl" | "ttb" | "bay";

export interface BankOption {
  code: BankCode;
  /** Full Thai bank name. */
  name: string;
  /** Short brand label used in chips/badges. */
  shortName: string;
  /** Tailwind background class for the brand dot. */
  accent: string;
  /** Whether APay can already verify transfers from this bank's LINE alerts. */
  supported: boolean;
}

export const BANK_OPTIONS: readonly BankOption[] = [
  {
    code: "kbank",
    name: "ธนาคารกสิกรไทย",
    shortName: "KBank",
    accent: "bg-emerald-600",
    supported: true,
  },
  {
    code: "scb",
    name: "ธนาคารไทยพาณิชย์",
    shortName: "SCB",
    accent: "bg-purple-600",
    supported: false,
  },
  {
    code: "ktb",
    name: "ธนาคารกรุงไทย",
    shortName: "KTB",
    accent: "bg-sky-600",
    supported: false,
  },
  {
    code: "bbl",
    name: "ธนาคารกรุงเทพ",
    shortName: "BBL",
    accent: "bg-indigo-700",
    supported: false,
  },
  {
    code: "ttb",
    name: "ธนาคารทหารไทยธนชาต",
    shortName: "ttb",
    accent: "bg-blue-600",
    supported: false,
  },
  {
    code: "bay",
    name: "ธนาคารกรุงศรีอยุธยา",
    shortName: "BAY",
    accent: "bg-amber-500",
    supported: false,
  },
];

export const SUPPORTED_BANKS: readonly BankOption[] = BANK_OPTIONS.filter(
  (bank) => bank.supported,
);

export function getBankOption(code: BankCode | string | null | undefined): BankOption {
  return BANK_OPTIONS.find((bank) => bank.code === code) ?? BANK_OPTIONS[0];
}

export function isSupportedBank(code: BankCode | string | null | undefined): boolean {
  return Boolean(BANK_OPTIONS.find((bank) => bank.code === code)?.supported);
}

/** First bank the UI may preselect (KBank until another one ships). */
export function getDefaultBank(): BankOption {
  return SUPPORTED_BANKS[0] ?? BANK_OPTIONS[0];
}

/** e.g. "KBank" or "KBank, SCB" — used in copy and badges. */
export function supportedBankLabel(separator = ", "): string {
  const labels = SUPPORTED_BANKS.map((bank) => bank.shortName);
  return labels.length > 0 ? labels.join(separator) : "—";
}
