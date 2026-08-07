import { Capacitor } from "@capacitor/core";
import { formatRupiah, escapeHtml as escHtml } from "./utils";
import { shareTextFile } from "./native-share";

// Cegah CSV formula injection: nama produk/outlet (dikontrol user) yang diawali
// = + - @ tab/CR bisa dieksekusi Excel/Sheets. Prefiks "'" menetralkannya.
// Angka dilewati (bisa negatif yang sah, mis. laba bersih -Rp).
function csvCell(c: unknown): string {
  const s = String(c ?? "");
  const safe = typeof c !== "number" && /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export interface ReportData {
  period: string;
  periodRange: string;   // "01 Mar 2026 - 31 Mar 2026"
  outletName?: string;
  summary: {
    grossSales: number;  // penjualan kotor (sebelum diskon)
    discount: number;    // diskon / promo / komplimen
    netSales: number;    // penjualan bersih (setelah diskon; pajak/service belum dikeluarkan)
    taxService: number;  // pajak + service charge (titipan)
    hpp: number;
    grossProfit: number; // laba kotor = (netSales - taxService) - hpp
    expense: number;
    netProfit: number;   // laba bersih
    trxCount: number;
  };
  payments: { label: string; trx: number; total: number }[];
  categories: { name: string; qty: number; total: number; hpp: number }[];
  topProducts: { name: string; value: number }[];
}

const pct = (n: number, d: number): string => (d > 0 ? `${((n / d) * 100).toFixed(2)}%` : "0%");

// ---- Excel (CSV) — versi data/tabular, terpisah dari PDF ----
export function exportReportExcel(d: ReportData): Promise<void> {
  const trxSum = d.payments.reduce((s, p) => s + p.trx, 0);
  const paySum = d.payments.reduce((s, p) => s + p.total, 0);
  const qtySum = d.categories.reduce((s, c) => s + c.qty, 0);
  const catSum = d.categories.reduce((s, c) => s + c.total, 0);

  const rows: unknown[][] = [
    ["Laporan Penjualan Herbaspace POS"],
    [d.outletName ? `Outlet: ${d.outletName}` : "Semua Outlet"],
    [`Periode: ${d.periodRange}`],
    [],
    ["RINGKASAN PENJUALAN"],
    ["Penjualan Kotor", d.summary.grossSales],
    ["Diskon / Promo", -d.summary.discount],
    ["Penjualan Bersih", d.summary.netSales],
    ["Pajak & Service", d.summary.taxService],
    ["HPP", d.summary.hpp],
    ["Laba Kotor", d.summary.grossProfit],
    ["Pengeluaran", d.summary.expense],
    ["Laba Bersih", d.summary.netProfit],
    ["Jumlah Transaksi", d.summary.trxCount],
    [],
    ["JENIS BAYAR", "Transaksi", "Transaksi %", "Penjualan (Rp)", "Penjualan %"],
    ...d.payments.map((p) => [p.label, p.trx, pct(p.trx, trxSum), p.total, pct(p.total, paySum)]),
    ["Total", trxSum, "100%", paySum, "100%"],
    [],
    ["PENJUALAN KATEGORI", "Qty", "Qty %", "Penjualan (Rp)", "Penjualan %", "HPP"],
    ...d.categories.map((c) => [c.name, c.qty, pct(c.qty, qtySum), c.total, pct(c.total, catSum), c.hpp]),
    ["Total", qtySum, "100%", catSum, "100%", d.categories.reduce((s, c) => s + c.hpp, 0)],
    [],
    ["PRODUK TERATAS", "Pendapatan"],
    ...d.topProducts.map((p) => [p.name, p.value]),
  ];

  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  const bom = "﻿";
  const filename = `laporan-${d.period.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  return shareTextFile(filename, bom + csv, "text/csv;charset=utf-8;");
}

// ---- PDF — versi presentasi multi-section, lebih detail ----
export function exportReportPdf(d: ReportData): Promise<void> {
  const rp = (n: number) => formatRupiah(n);
  const trxSum = d.payments.reduce((s, p) => s + p.trx, 0);
  const paySum = d.payments.reduce((s, p) => s + p.total, 0);
  const qtySum = d.categories.reduce((s, c) => s + c.qty, 0);
  const catSum = d.categories.reduce((s, c) => s + c.total, 0);
  const hppSum = d.categories.reduce((s, c) => s + c.hpp, 0);
  const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const sumRow = (label: string, val: number, opt: { bold?: boolean; neg?: boolean; sign?: boolean } = {}) =>
    `<tr${opt.bold ? ' class="tot"' : ""}><td>${label}</td><td class="num ${val < 0 || opt.neg ? "neg" : ""}">${opt.sign && val > 0 ? "-" : ""}${rp(Math.abs(val))}</td></tr>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Laporan ${escHtml(d.period)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; padding: 28px; color: #181d19; max-width: 720px; margin: 0 auto; font-size: 13px; }
  h1 { font-size: 20px; margin: 0; }
  .sub { color: #6f7a72; font-size: 12px; margin: 2px 0; }
  h2 { font-size: 12px; margin: 26px 0 8px; color: #00603e; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 2px solid #00603e; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  td, th { padding: 6px 10px; border-bottom: 1px solid #e5e9e4; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #3f4942; background: #f3f6f1; }
  th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.tot td, tr.tot th { font-weight: 700; border-top: 2px solid #cdd2cc; background: #f7f9f6; }
  .neg { color: #ba1a1a; }
  .pos { color: #00603e; }
  @media print { body { padding: 12px; } h2 { break-after: avoid; } table { break-inside: auto; } tr { break-inside: avoid; } }
</style></head><body>
  <h1>Laporan Penjualan</h1>
  <p class="sub">${d.outletName ? escHtml(d.outletName) : "Semua Outlet"} &middot; Herbaspace POS</p>
  <p class="sub">Periode: ${escHtml(d.periodRange)} (WIB) &middot; Dicetak ${now}</p>

  <h2>Ringkasan Penjualan</h2>
  <table>
    ${sumRow("Penjualan Kotor", d.summary.grossSales)}
    ${sumRow("Diskon / Promo", d.summary.discount, { neg: true, sign: true })}
    ${sumRow("Penjualan Bersih", d.summary.netSales, { bold: true })}
    ${sumRow("Pajak &amp; Service", d.summary.taxService)}
    ${sumRow("HPP", d.summary.hpp)}
    ${sumRow("Laba Kotor", d.summary.grossProfit, { bold: true })}
    ${sumRow("Pengeluaran", d.summary.expense, { neg: true, sign: true })}
    <tr class="tot"><td>Laba Bersih</td><td class="num ${d.summary.netProfit >= 0 ? "pos" : "neg"}">${rp(d.summary.netProfit)}</td></tr>
    <tr><td>Jumlah Transaksi</td><td class="num">${d.summary.trxCount}</td></tr>
  </table>

  <h2>Laporan Jenis Bayar</h2>
  <table>
    <tr><th>Metode</th><th class="num">Transaksi</th><th class="num">%</th><th class="num">Penjualan</th><th class="num">%</th></tr>
    ${d.payments.map((p) => `<tr><td>${escHtml(p.label)}</td><td class="num">${p.trx}</td><td class="num">${pct(p.trx, trxSum)}</td><td class="num">${rp(p.total)}</td><td class="num">${pct(p.total, paySum)}</td></tr>`).join("")}
    <tr class="tot"><td>Total</td><td class="num">${trxSum}</td><td class="num">100%</td><td class="num">${rp(paySum)}</td><td class="num">100%</td></tr>
  </table>

  <h2>Laporan Penjualan Kategori</h2>
  <table>
    <tr><th>Kategori</th><th class="num">Qty</th><th class="num">%</th><th class="num">Penjualan</th><th class="num">%</th><th class="num">HPP</th></tr>
    ${d.categories.map((c) => `<tr><td>${escHtml(c.name)}</td><td class="num">${c.qty}</td><td class="num">${pct(c.qty, qtySum)}</td><td class="num">${rp(c.total)}</td><td class="num">${pct(c.total, catSum)}</td><td class="num">${rp(c.hpp)}</td></tr>`).join("")}
    <tr class="tot"><td>Total</td><td class="num">${qtySum}</td><td class="num">100%</td><td class="num">${rp(catSum)}</td><td class="num">100%</td><td class="num">${rp(hppSum)}</td></tr>
  </table>

  ${d.topProducts.length > 0 ? `
  <h2>Produk Teratas</h2>
  <table>
    <tr><th>Produk</th><th class="num">Pendapatan</th></tr>
    ${d.topProducts.map((p, i) => `<tr><td>${i + 1}. ${escHtml(p.name)}</td><td class="num">${rp(p.value)}</td></tr>`).join("")}
  </table>` : ""}
</body></html>`;

  // Native (APK): window.open/print mati di WebView. Bagikan file HTML laporan —
  // bisa dibuka & di-"print/save PDF" dari browser HP. (PDF asli butuh lib berat.)
  if (Capacitor.isNativePlatform()) {
    const filename = `laporan-${d.period.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.html`;
    return shareTextFile(filename, html, "text/html");
  }
  const w = window.open("", "_blank", "width=760,height=900");
  if (!w) return Promise.resolve();
  w.document.write(html);
  w.document.close();
  w.onafterprint = () => w.close();
  setTimeout(() => w.print(), 300);
  return Promise.resolve();
}
