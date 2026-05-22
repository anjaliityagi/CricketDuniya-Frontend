import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
