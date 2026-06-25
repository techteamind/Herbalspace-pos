const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

function encode(text: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(text);
}

function cmd(...bytes: number[]): Uint8Array {
  return new Uint8Array(bytes);
}

export interface ThermalReceiptData {
  storeName: string;
  address?: string;
  phone?: string;
  number: string;
  datetime: string;
  cashierName?: string;
  lines: { name: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  tax: number;
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
  }

  push(encode("--------------------------------\n"));

  // Totals
  const fmt = (n: number) => n.toLocaleString("id-ID");
  push(encode(`Subtotal`.padEnd(20) + fmt(data.subtotal).padStart(12) + "\n"));
  if (data.discount > 0) push(encode(`Diskon`.padEnd(20) + `-${fmt(data.discount)}`.padStart(12) + "\n"));
  if (data.tax > 0) push(encode(`Pajak`.padEnd(20) + fmt(data.tax).padStart(12) + "\n"));
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedPort: any = null;

export async function connectThermalPrinter(): Promise<any> {
  if (cachedPort) {
    try {
      if (cachedPort.readable) return cachedPort;
    } catch { /* reconnect */ }
  }

  if (!("serial" in navigator)) throw new Error("Browser tidak mendukung Web Serial API. Gunakan Chrome/Edge.");

  const port = await (navigator as any).serial.requestPort();
  await port.open({ baudRate: 9600 });
  cachedPort = port;
  return port;
}

export async function printThermal(data: ThermalReceiptData): Promise<void> {
  const port = await connectThermalPrinter();
  const bytes = buildReceiptBytes(data);
  const writer = port.writable!.getWriter();
  try {
    await writer.write(bytes);
  } finally {
    writer.releaseLock();
  }
}

export function isThermalSupported(): boolean {
  return "serial" in navigator;
}
