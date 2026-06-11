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

export function lawTypeLabel(value: string | null | undefined) {
  if (!value) return "Unknown";
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (
    normalized === "5 stag erklarung" ||
    normalized === "5 stag erklärung" ||
    normalized === "5 stag declaration" ||
    normalized === "stag §5" ||
    normalized === "stag 5" ||
    normalized === "stag5" ||
    normalized === "5 stag" ||
    normalized === "§5 stag"
  ) {
    return "StAG 5";
  }
  return value;
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
