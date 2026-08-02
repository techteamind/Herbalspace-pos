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

import { Capacitor } from "@capacitor/core";

export interface BondedPrinter { address: string; name: string }

const SAVED_KEY = "thermalPrinterAddress";
export function getSavedPrinterAddress(): string | null { return localStorage.getItem(SAVED_KEY); }
export function setSavedPrinterAddress(addr: string | null): void {
  if (addr) localStorage.setItem(SAVED_KEY, addr); else localStorage.removeItem(SAVED_KEY);
}

function isNative(): boolean { return Capacitor.isNativePlatform(); }

// Native: cetak lewat Bluetooth Classic (SPP) memakai perangkat yang SUDAH dipasangkan.
// Plugin `bluetooth-serial` di-import dinamis supaya tak masuk bundle web.
async function bt() { return (await import("bluetooth-serial")).BluetoothSerial; }

async function ensureBtReady(): Promise<void> {
  const BluetoothSerial = await bt();
  // Tipe plugin mendeklarasikan PermissionStatus[] (keliru); runtime = objek beralias
  // (mekanisme izin bawaan Capacitor), mis. { connect: "granted" }.
  const asStatus = (v: unknown) => v as { connect?: string };
  const status = asStatus(await BluetoothSerial.checkPermissions());
  if (status.connect !== "granted") {
    const req = asStatus(await BluetoothSerial.requestPermissions({ permissions: ["connect"] }));
    if (req.connect !== "granted") throw new Error("Izin Bluetooth ditolak");
  }
  const { isEnabled } = await BluetoothSerial.isEnabled();
  if (!isEnabled) {
    const res = await BluetoothSerial.enable();
    if (!res.isEnabled) throw new Error("Bluetooth belum aktif");
  }
}

/** Daftar printer yang sudah dipasangkan (bonded) di Pengaturan Bluetooth HP. */
export async function listBondedPrinters(): Promise<BondedPrinter[]> {
  await ensureBtReady();
  const BluetoothSerial = await bt();
  const { devices } = await BluetoothSerial.list();
  return devices.map((d) => ({ address: d.address, name: d.name ?? d.address }));
}

// Semua byte payload < 0x80 (lihat encode), jadi String.fromCharCode + getBytes(UTF-8)
// di sisi native menghasilkan byte identik.
function bytesToBinaryString(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return s;
}

/** Cetak struk. Native: butuh alamat printer (argumen atau tersimpan). Web: Web Serial. */
export async function printThermal(data: ThermalReceiptData, address?: string): Promise<void> {
  const bytes = buildReceiptBytes(data);

  if (isNative()) {
    const addr = address ?? getSavedPrinterAddress();
    if (!addr) throw new Error("Printer belum dipilih");
    await ensureBtReady();
    const BluetoothSerial = await bt();
    await BluetoothSerial.connect({ address: addr });
    try {
      await BluetoothSerial.write({ data: bytesToBinaryString(bytes) });
      // beri jeda agar buffer printer selesai sebelum socket ditutup
      await new Promise((r) => setTimeout(r, 400));
    } finally {
      await BluetoothSerial.disconnect();
    }
    return;
  }

  // Web (Chrome/Edge desktop): Web Serial
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

export function isThermalSupported(): boolean {
  return isNative() || "serial" in navigator;
}
