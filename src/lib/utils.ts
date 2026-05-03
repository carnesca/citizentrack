import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

export function formatMonths(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "No data";
  return `${Math.round(value)} mo`;
}

export function toPercent(part: number, total: number) {
  if (!total) return 0;
  return Math.max(4, Math.min(100, Math.round((part / total) * 100)));
}

export function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}
