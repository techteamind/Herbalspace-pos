import { formatRupiah } from "./utils";

export interface ReceiptLine { name: string; qty: number; price: number; }
export interface Receipt {
  number: string;
  cafeName: string;
  datetime: string;
  lines: ReceiptLine[];
  subtotal: number;
  tax: number;
  total: number;
  method: string;
  received?: number;
  change?: number;
}

const METHOD_LABEL: Record<string, string> = { cash: "Tunai", qris: "QRIS", card: "Kartu", transfer: "Transfer" };

/** Cetak struk thermal sederhana lewat jendela print browser. */
export function printReceipt(r: Receipt): void {
  const w = window.open("", "_blank", "width=320,height=640");
  if (!w) return;
  const rows = r.lines.map((l) =>
    `<tr><td>${l.qty}x ${escapeHtml(l.name)}</td><td style="text-align:right">${formatRupiah(l.price * l.qty)}</td></tr>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${r.number}</title>
<style>
  *{font-family:'Courier New',monospace;font-size:12px;color:#000}
  body{width:280px;margin:0 auto;padding:12px}
  h2{text-align:center;margin:4px 0;font-size:15px}
  table{width:100%;border-collapse:collapse}
  td{padding:2px 0}
  .sep{border-top:1px dashed #000;margin:6px 0}
  .tot{font-weight:bold;font-size:13px}
  .center{text-align:center}
</style></head><body>
  <h2>${escapeHtml(r.cafeName)}</h2>
  <div class="center">${r.number}<br>${r.datetime}</div>
  <div class="sep"></div>
  <table>${rows}</table>
  <div class="sep"></div>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">${formatRupiah(r.subtotal)}</td></tr>
    ${r.tax > 0 ? `<tr><td>Pajak</td><td style="text-align:right">${formatRupiah(r.tax)}</td></tr>` : ""}
    <tr class="tot"><td>TOTAL</td><td style="text-align:right">${formatRupiah(r.total)}</td></tr>
    <tr><td>Bayar (${METHOD_LABEL[r.method] ?? r.method})</td><td style="text-align:right">${formatRupiah(r.received ?? r.total)}</td></tr>
    ${r.change ? `<tr><td>Kembalian</td><td style="text-align:right">${formatRupiah(r.change)}</td></tr>` : ""}
  </table>
  <div class="sep"></div>
  <div class="center">Terima kasih 🌿</div>
  <script>window.onload=function(){window.print();}</script>
</body></html>`);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
