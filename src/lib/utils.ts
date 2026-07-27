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

/** Base URL publik untuk link yang dibuka orang lain (mis. struk WA).
 *  Di APK, window.location.origin = "localhost" → link mati bagi pelanggan.
 *  Urutan: VITE_PUBLIC_URL (override) → origin web nyata → VITE_API_BASE (domain Vercel). */
export function publicBaseUrl(): string {
  const explicit = import.meta.env.VITE_PUBLIC_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const origin = window.location.origin;
  if (!/localhost/.test(origin)) return origin;
  const apiBase = import.meta.env.VITE_API_BASE?.replace(/\/$/, "");
  return apiBase || origin;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
