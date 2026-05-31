import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDisplayText(value: unknown) {
  if (typeof value !== "string") return "";

  const text = value.trim();
  return text && text !== "undefined" && text !== "null" ? text : "";
}

export function normalizePhoneNumber(value: string) {
  const compact = value.replace(/[\s-]/g, "");

  if (/^\+91[6-9]\d{9}$/.test(compact)) {
    return compact.slice(3);
  }

  if (/^91[6-9]\d{9}$/.test(compact)) {
    return compact.slice(2);
  }

  return compact;
}

export function isValidPhoneNumber(value: string) {
  return /^[6-9]\d{9}$/.test(normalizePhoneNumber(value));
}

export function getPhoneValidationMessage(value: string) {
  const phoneNumber = normalizePhoneNumber(value);

  if (!phoneNumber) return "";

  if (phoneNumber.length > 10) {
    return "Phone number must be exactly 10 digits";
  }

  if (phoneNumber.length === 10 && !isValidPhoneNumber(value)) {
    return "Enter a valid 10-digit phone number";
  }

  return "";
}
