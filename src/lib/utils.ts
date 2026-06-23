import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format angka ke Rupiah, mis. 25000 -> "Rp 25.000" */
export function formatRupiah(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  return "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(n));
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
