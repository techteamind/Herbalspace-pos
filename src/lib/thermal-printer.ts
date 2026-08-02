const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// ESC/POS payload harus ASCII (byte < 0x80): (1) printer 58mm murah tak set code-page
// UTF-8 default → karakter non-ASCII jadi mojibake; (2) transport Bluetooth mengirim
// string via getBytes(UTF-8), byte-exact HANYA untuk < 0x80. NFKD melipat aksen (é→e),
// sisanya dibuang.
function encode(text: string): Uint8Array {
  const ascii = text.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
  const out = new Uint8Array(ascii.length);
  for (let i = 0; i < ascii.length; i++) out[i] = ascii.charCodeAt(i) & 0x7f;
  return out;
}

function cmd(...bytes: number[]): Uint8Array {
  return new Uint8Array(bytes);
}

export interface ThermalReceiptData {
  storeName: string;
  address?: string;
  phone?: string;
  header?: string;
  number: string;
  datetime: string;
  cashierName?: string;
  lines: { name: string; qty: number; price: number; note?: string }[];
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge?: number;
  total: number;
  method: string;
  received?: number;
  change?: number;
  customerName?: string;
  footer?: string;
}

function buildReceiptBytes(data: ThermalReceiptData): Uint8Array {
  const parts: Uint8Array[] = [];
  const push = (...items: Uint8Array[]) => parts.push(...items);

  // Initialize
  push(cmd(ESC, 0x40)); // reset
  push(cmd(ESC, 0x61, 1)); // center align

  // Header
  push(cmd(ESC, 0x45, 1)); // bold on
  push(encode(data.storeName + "\n"));
  push(cmd(ESC, 0x45, 0)); // bold off
  if (data.address) push(encode(data.address + "\n"));
  if (data.phone) push(encode(data.phone + "\n"));
  if (data.header) push(encode(data.header + "\n"));
  push(encode("================================\n"));

  // Transaction info - left align
  push(cmd(ESC, 0x61, 0)); // left align
  push(encode(`No: ${data.number}\n`));
  push(encode(`Tgl: ${data.datetime}\n`));
  if (data.cashierName) push(encode(`Kasir: ${data.cashierName}\n`));
  if (data.customerName) push(encode(`Pelanggan: ${data.customerName}\n`));
  push(encode("--------------------------------\n"));

  // Items
  for (const line of data.lines) {
    const name = line.name.length > 20 ? line.name.slice(0, 20) : line.name;
    const total = (line.qty * line.price).toLocaleString("id-ID");
    push(encode(`${name}\n`));
    push(encode(`  ${line.qty} x ${line.price.toLocaleString("id-ID")}`.padEnd(20) + total.padStart(12) + "\n"));
    if (line.note) push(encode(`  * ${line.note}\n`));
  }

  push(encode("--------------------------------\n"));

  // Totals
  const fmt = (n: number) => n.toLocaleString("id-ID");
  push(encode(`Subtotal`.padEnd(20) + fmt(data.subtotal).padStart(12) + "\n"));
  if (data.discount > 0) push(encode(`Diskon`.padEnd(20) + `-${fmt(data.discount)}`.padStart(12) + "\n"));
  if (data.tax > 0) push(encode(`Pajak`.padEnd(20) + fmt(data.tax).padStart(12) + "\n"));
  if (data.serviceCharge && data.serviceCharge > 0) push(encode(`Service`.padEnd(20) + fmt(data.serviceCharge).padStart(12) + "\n"));
  push(encode("--------------------------------\n"));
  push(cmd(ESC, 0x45, 1)); // bold
  push(encode(`TOTAL`.padEnd(20) + fmt(data.total).padStart(12) + "\n"));
  push(cmd(ESC, 0x45, 0)); // unbold
  push(encode("--------------------------------\n"));

  const methodLabel = { cash: "Tunai", qris: "QRIS", card: "Kartu", transfer: "Transfer" }[data.method] ?? data.method;
  push(encode(`Bayar (${methodLabel})`.padEnd(20) + fmt(data.received ?? data.total).padStart(12) + "\n"));
  if (data.change && data.change > 0) {
    push(encode(`Kembali`.padEnd(20) + fmt(data.change).padStart(12) + "\n"));
  }

  push(encode("\n"));
  push(cmd(ESC, 0x61, 1)); // center
  push(encode(data.footer || "Terima kasih!\nSampai jumpa lagi"));
  push(encode("\n\n\n"));

  // Cut paper
  push(cmd(GS, 0x56, 0x42, 3)); // partial cut

  // Feed
  push(cmd(LF, LF, LF));

  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    result.set(p, offset);
    offset += p.length;
  }
  return result;
}

// ---- Tiket internal (dapur/barista): item + jumlah + catatan, TANPA harga ----
export interface ThermalTicketLine { name: string; qty: number; note?: string; modifiers?: string[] }
export interface ThermalTicketData {
  title?: string;       // default "TIKET PESANAN"
  billName?: string;    // nama bon / pelanggan
  datetime: string;
  cashierName?: string;
  lines: ThermalTicketLine[];
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

function buildTicketBytes(d: ThermalTicketData): Uint8Array {
  const parts: Uint8Array[] = [];
  const push = (...xs: Uint8Array[]) => parts.push(...xs);
  const big = () => push(cmd(ESC, 0x21, 0x30));   // double width+height
  const normal = () => push(cmd(ESC, 0x21, 0x00));

  push(cmd(ESC, 0x40));            // reset
  push(cmd(ESC, 0x61, 1));         // center
  push(cmd(ESC, 0x45, 1)); big();  // bold + besar
  push(encode((d.title ?? "TIKET PESANAN") + "\n"));
  normal(); push(cmd(ESC, 0x45, 0));
  push(encode("================================\n"));

  push(cmd(ESC, 0x61, 0));         // left
  if (d.billName) { push(cmd(ESC, 0x45, 1)); push(encode(`Bon: ${d.billName}\n`)); push(cmd(ESC, 0x45, 0)); }
  push(encode(`${d.datetime}\n`));
  if (d.cashierName) push(encode(`Kasir: ${d.cashierName}\n`));
  push(encode("--------------------------------\n"));

  for (const l of d.lines) {
    push(cmd(ESC, 0x45, 1)); big();
    push(encode(`${l.qty}x ${l.name}\n`));
    normal(); push(cmd(ESC, 0x45, 0));
    if (l.modifiers && l.modifiers.length) push(encode(`   + ${l.modifiers.join(", ")}\n`));
    if (l.note) push(encode(`   * ${l.note}\n`));
  }

  push(encode("--------------------------------\n\n\n"));
  push(cmd(GS, 0x56, 0x42, 3));    // partial cut
  push(cmd(LF, LF, LF));
  return concat(parts);
}

import { Capacitor } from "@capacitor/core";
import type { BondedPrinter } from "./thermal-plugin";

export type { BondedPrinter };

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

const SAVED_KEY = "thermalPrinterAddress";
export function getSavedPrinterAddress(): string | null { return localStorage.getItem(SAVED_KEY); }
export function setSavedPrinterAddress(addr: string | null): void {
  if (addr) localStorage.setItem(SAVED_KEY, addr); else localStorage.removeItem(SAVED_KEY);
}

/** Daftar printer yang sudah dipasangkan (bonded) di Pengaturan Bluetooth HP. Native saja. */
export async function listPrinters(): Promise<BondedPrinter[]> {
  const { ThermalPrinter } = await import("./thermal-plugin");
  const { devices } = await ThermalPrinter.list();
  return devices;
}

/**
 * Kirim byte ESC/POS ke printer.
 * - APK (native): plugin Bluetooth Classic (SPP) custom → connect ke printer bonded
 *   (POS58B/RPP02). Butuh alamat printer (argumen/tersimpan).
 * - Web (Chrome/Edge desktop): Web Serial.
 */
async function sendBytes(bytes: Uint8Array, address?: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const addr = address ?? getSavedPrinterAddress();
    if (!addr) throw new Error("Printer belum dipilih");
    const { ThermalPrinter } = await import("./thermal-plugin");
    await ThermalPrinter.print({ address: addr, data: bytesToBase64(bytes) });
    return;
  }

  if (!("serial" in navigator)) throw new Error("Perangkat ini tak mendukung cetak thermal.");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const port = await (navigator as any).serial.requestPort();
  await port.open({ baudRate: 9600 });
  const writer = port.writable.getWriter();
  try {
    await writer.write(bytes);
    await new Promise((r) => setTimeout(r, 400));
  } finally {
    writer.releaseLock();
    await port.close();
  }
}

/** Cetak struk pelanggan. */
export function printThermal(data: ThermalReceiptData, address?: string): Promise<void> {
  return sendBytes(buildReceiptBytes(data), address);
}

/** Cetak tiket internal (dapur/barista). */
export function printTicket(data: ThermalTicketData, address?: string): Promise<void> {
  return sendBytes(buildTicketBytes(data), address);
}

export function isThermalSupported(): boolean {
  return Capacitor.isNativePlatform() || "serial" in navigator;
}
