import type { ProductWithCategory } from "@/types";

// Open bill (bon tertahan) disimpan LOKAL per-HP per-outlet (localStorage). Jalan
// offline; tak tersinkron antar-HP. Stok/poin baru terpotong saat bon dibayar.
export interface CartItem {
  qty: number;
  product: ProductWithCategory;
  variantId?: string;
  variantLabel?: string;
  variantPrice?: number;
  note?: string;
  modifiers?: { id?: string; name: string; price: number }[];
}
export type Cart = Record<string, CartItem>;

export interface OpenBill {
  id: string;
  name: string;
  createdAt: number;
  cart: Cart;
}

const keyFor = (outletId: string): string => `pos_openbills_${outletId}`;

export function loadBills(outletId: string): OpenBill[] {
  try {
    const raw = JSON.parse(localStorage.getItem(keyFor(outletId)) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

export function saveBills(outletId: string, bills: OpenBill[]): void {
  localStorage.setItem(keyFor(outletId), JSON.stringify(bills));
}

export function billCount(b: OpenBill): number {
  return Object.values(b.cart).reduce((s, l) => s + l.qty, 0);
}

export function billTotal(b: OpenBill): number {
  return Object.values(b.cart).reduce((s, l) => {
    const base = l.variantPrice ?? Number(l.product.price);
    const mod = (l.modifiers ?? []).reduce((m, x) => m + x.price, 0);
    return s + (base + mod) * l.qty;
  }, 0);
}
