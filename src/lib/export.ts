import { formatRupiah, escapeHtml as escHtml } from "./utils";

export interface ReportData {
  period: string;
  outletName?: string;
  summary: { omzet: number; hpp: number; labaKotor: number; pengeluaran: number; labaBersih: number };
  topProducts: { name: string; value: number }[];
}

export function exportReportExcel(d: ReportData): void {
  const rows = [
    ["Laporan Herbaspace POS"],
    [d.outletName ? `Outlet: ${d.outletName}` : "Semua Outlet"],
    [`Periode: ${d.period}`],
    [],
    ["Ringkasan Keuangan"],
    ["Omzet", d.summary.omzet],
    ["HPP", d.summary.hpp],
    ["Laba Kotor", d.summary.labaKotor],
    ["Pengeluaran", d.summary.pengeluaran],
    ["Laba Bersih", d.summary.labaBersih],
    [],
    ["Produk Teratas", "Pendapatan"],
    ...d.topProducts.map((p) => [p.name, p.value]),
  ];

  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const bom = "﻿";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laporan-${d.period.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportReportPdf(d: ReportData): void {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Laporan ${d.period}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 32px; color: #181d19; max-width: 600px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 24px 0 8px; color: #3f4942; text-transform: uppercase; letter-spacing: 0.5px; }
  .period { color: #6f7a72; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  td, th { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e9e4; }
  th { font-weight: 600; color: #3f4942; font-size: 12px; text-transform: uppercase; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .total { font-weight: 700; font-size: 16px; }
  .positive { color: #00603e; }
  .negative { color: #ba1a1a; }
  @media print { body { padding: 16px; } }
</style></head><body>
<h1>Laporan Herbaspace POS</h1>
${d.outletName ? `<p style="color:#3f4942;font-size:14px;margin:2px 0">Outlet: ${escHtml(d.outletName)}</p>` : `<p style="color:#3f4942;font-size:14px;margin:2px 0">Semua Outlet</p>`}
<p class="period">Periode: ${d.period} &mdash; Dicetak ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
<h2>Ringkasan Keuangan</h2>
<table>
  <tr><td>Omzet</td><td class="num">${formatRupiah(d.summary.omzet)}</td></tr>
  <tr><td>HPP</td><td class="num">${formatRupiah(d.summary.hpp)}</td></tr>
  <tr><td>Laba Kotor</td><td class="num positive">${formatRupiah(d.summary.labaKotor)}</td></tr>
  <tr><td>Pengeluaran</td><td class="num negative">${formatRupiah(d.summary.pengeluaran)}</td></tr>
  <tr><td class="total">Laba Bersih</td><td class="num total ${d.summary.labaBersih >= 0 ? "positive" : "negative"}">${formatRupiah(d.summary.labaBersih)}</td></tr>
</table>
${d.topProducts.length > 0 ? `
<h2>Produk Teratas</h2>
<table>
  <tr><th>Produk</th><th class="num">Pendapatan</th></tr>
  ${d.topProducts.map((p, i) => `<tr><td>${i + 1}. ${escHtml(p.name)}</td><td class="num">${formatRupiah(p.value)}</td></tr>`).join("")}
</table>` : ""}
</body></html>`;

  const w = window.open("", "_blank", "width=700,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onafterprint = () => w.close();
  setTimeout(() => w.print(), 300);
}
