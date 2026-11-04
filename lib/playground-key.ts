const STORAGE_PREFIX = "apay.playground-api-key.v1";

export const PLAYGROUND_KEY_EVENT = "apay:playground-key-change";

function storageKey(businessId: string) {
  return `${STORAGE_PREFIX}:${businessId}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Raw API Key ที่จำไว้ให้ PromptPay Playground เติมอัตโนมัติ (แยกตามธุรกิจ). */
export function loadPlaygroundApiKey(businessId: string | null | undefined): string {
  if (!businessId || !canUseStorage()) return "";

  try {
    return window.localStorage.getItem(storageKey(businessId)) ?? "";
  } catch {
    return "";
  }
}

/**
 * จำ Raw API Key ตัวแรกที่สร้างให้ธุรกิจนี้ เพื่อให้ Playground เติมค่าให้อัตโนมัติ
 * Key ที่สร้างทีหลังจะไม่ทับค่าเดิม และคืนค่า true เมื่อบันทึกสำเร็จ
 */
export function rememberPlaygroundApiKey(
  businessId: string | null | undefined,
  apiKey: string,
): boolean {
  if (!businessId || !apiKey || !canUseStorage()) return false;

  try {
    const key = storageKey(businessId);
    if (window.localStorage.getItem(key)) return false;
    window.localStorage.setItem(key, apiKey);
    window.dispatchEvent(new CustomEvent(PLAYGROUND_KEY_EVENT, { detail: businessId }));
    return true;
  } catch {
    return false;
  }
}

/** External-store subscription สำหรับ useSyncExternalStore ของ Playground. */
export function subscribePlaygroundApiKey(listener: () => void) {
  if (!canUseStorage()) return () => undefined;

  const onStorage = () => listener();
  window.addEventListener(PLAYGROUND_KEY_EVENT, onStorage);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PLAYGROUND_KEY_EVENT, onStorage);
    window.removeEventListener("storage", onStorage);
  };
}
