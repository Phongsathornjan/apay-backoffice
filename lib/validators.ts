export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateRequired(value: string, label: string): ValidationResult {
  return value.trim() ? { valid: true } : { valid: false, message: `กรุณากรอก${label}` };
}

export function validatePromptPayId(value: string): ValidationResult {
  if (!/^\d{10}$|^\d{13}$/.test(value.trim())) {
    return {
      valid: false,
      message: "PromptPay ID ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตร/นิติบุคคล 13 หลัก",
    };
  }
  return { valid: true };
}

export function validatePassword(value: string, minLength = 8): ValidationResult {
  if (value.length < minLength) {
    return { valid: false, message: `รหัสผ่านต้องมีอย่างน้อย ${minLength} ตัวอักษร` };
  }
  return { valid: true };
}

export function validateHttpsUrl(value: string, allowHttp = true): ValidationResult {
  try {
    const url = new URL(value);
    if (!allowHttp && url.protocol !== "https:") {
      return { valid: false, message: "URL ต้องเป็น https://" };
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      return { valid: false, message: "URL ต้องเริ่มต้นด้วย http:// หรือ https://" };
    }
    return { valid: true };
  } catch {
    return { valid: false, message: "URL ไม่ถูกต้อง" };
  }
}

export function validateAmount(value: string): ValidationResult {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 1) {
    return { valid: false, message: "จำนวนเงินต้องมีค่าอย่างน้อย 1 บาท" };
  }
  return { valid: true };
}

export function validateMaxLength(value: string, max: number, label: string): ValidationResult {
  return value.length <= max
    ? { valid: true }
    : { valid: false, message: `${label}ต้องไม่เกิน ${max} ตัวอักษร` };
}
