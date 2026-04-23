import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  // Handle MySQL date format (YYYY-MM-DD HH:mm:ss) by replacing space with T
  const isoStr = dateStr.includes(" ") ? dateStr.replace(" ", "T") : dateStr;
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? null : d;
}
