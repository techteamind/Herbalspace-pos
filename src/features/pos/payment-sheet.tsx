import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useCreateSale } from "@/hooks/use-transactions";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { useActivePromos, type Promo } from "@/hooks/use-promos";
import { haptic } from "@/lib/haptic";
import type { ProductWithCategory, Customer } from "@/types";

export interface CartLine { product: ProductWithCategory; qty: number; variantId?: string; variantLabel?: string; variantPrice?: number; note?: string; modifiers?: { name: string; price: number }[]; }
type Method = "cash" | "qris" | "card" | "transfer";
const METHODS: { key: Method; label: string }[] = [
  { key: "cash", label: "Tunai" }, { key: "qris", label: "QRIS" }, { key: "card", label: "Kartu" }, { key: "transfer", label: "Transfer" },
];

interface Props {
  lines: CartLine[];
  taxPercent: number;
  onClose: () => void;
  onSuccess: (data: { transactionId: string; number: string; subtotal: number; discount: number; tax: number; total: number; method: string; received?: number; change?: number; customerName?: string; customerPhone?: string; lines: { name: string; qty: number; price: number; note?: string }[] }) => void;
  onQty: (productId: string, delta: number) => void;
  onNote: (productId: string, note: string) => void;
}

export function PaymentSheet({ lines, taxPercent, onClose, onSuccess, onQty, onNote }: Props): JSX.Element {
  const [method, setMethod] = useState<Method>("cash");
  const [received, setReceived] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discountType, setDiscountType] = useState<"rp" | "pct">("rp");

  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeField, setActiveField] = useState<"name" | "phone" | null>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  const searchQuery = activeField === "name" ? custName : activeField === "phone" ? custPhone : "";
  const { data: suggestions } = useCustomers(searchQuery.length >= 2 ? searchQuery : undefined);

  const createSale = useCreateSale();
  const createCustomer = useCreateCustomer();
  const activePromos = useActivePromos();

  useEffect(() => {
    setShowSuggestions(!!(activeField && searchQuery.length >= 2 && (suggestions ?? []).length > 0 && !matchedCustomer));
  }, [activeField, searchQuery, suggestions, matchedCustomer]);

  function selectCustomer(c: Customer): void {
    setMatchedCustomer(c);
    setCustName(c.name);
    setCustPhone(c.phone ?? "");
    setShowSuggestions(false);
    setActiveField(null);
  }

  function clearCustomer(): void {
    setMatchedCustomer(null);
    setCustName("");
    setCustPhone("");
  }

  const subtotal = lines.reduce((s, l) => {
    const base = l.variantPrice ?? Number(l.product.price);
    const modTotal = (l.modifiers ?? []).reduce((m, mod) => m + mod.price, 0);
    return s + (base + modTotal) * l.qty;
  }, 0);

  const appliedPromos = useMemo(() => {
    const result: { promo: Promo; discountAmount: number }[] = [];
    for (const p of activePromos) {
      if (p.type === "discount_percent") {
        if (subtotal >= Number(p.minPurchase)) {
          result.push({ promo: p, discountAmount: Math.round(subtotal * Number(p.value) / 100) });
        }
      } else if (p.type === "discount_amount") {
        if (subtotal >= Number(p.minPurchase)) {
          result.push({ promo: p, discountAmount: Number(p.value) });
        }
      } else if (p.type === "happy_hour") {
        result.push({ promo: p, discountAmount: Math.round(subtotal * Number(p.value) / 100) });
      } else if (p.type === "buy_x_get_y" && p.productId) {
        const line = lines.find((l) => l.product.id === p.productId);
        if (line && p.buyQty && p.getQty && line.qty >= p.buyQty) {
          const freeQty = Math.floor(line.qty / p.buyQty) * p.getQty;
          result.push({ promo: p, discountAmount: freeQty * Number(line.product.price) });
        }
      }
    }
    return result;
  }, [activePromos, subtotal, lines]);

  const promoDiscount = appliedPromos.reduce((s, a) => s + a.discountAmount, 0);

  const manualDiscountVal = discountType === "pct"
    ? Math.round(subtotal * (Number(discountInput) || 0) / 100)
    : (Number(discountInput) || 0);
  const discount = Math.min(promoDiscount + manualDiscountVal, subtotal);
  const afterDiscount = subtotal - discount;
  const tax = Math.round(afterDiscount * taxPercent / 100);
  const total = afterDiscount + tax;
  const receivedNum = Number(received) || 0;
  const change = Math.max(0, receivedNum - total);
  const insufficient = method === "cash" && receivedNum < total;

  async function process(): Promise<void> {
    haptic();
    let customerId = matchedCustomer?.id ?? null;
    const finalName = custName.trim();
    const finalPhone = custPhone.trim();

    if (!customerId && finalPhone && finalName) {
      const newCust = await createCustomer.mutateAsync({ name: finalName, phone: finalPhone }) as Customer;
      customerId = newCust.id;
    }

    const result = await createSale.mutateAsync({
      customerId,
      taxPercent,
      discount,
      items: lines.map((l) => {
        const modTotal = (l.modifiers ?? []).reduce((m, mod) => m + mod.price, 0);
        const modLabel = l.modifiers?.length ? ` [${l.modifiers.map((m) => m.name).join(", ")}]` : "";
        return {
          product_id: l.product.id,
          product_name: (l.variantLabel ? `${l.product.name} (${l.variantLabel})` : l.product.name) + modLabel,
          quantity: l.qty,
          unit_price: (l.variantPrice ?? Number(l.product.price)) + modTotal,
          note: l.note || undefined,
        };
      }),
      payments: [{
        method,
        amount: total,
        ...(method === "cash" ? { amount_received: receivedNum, change_amount: change } : {}),
      }],
    }) as { transaction_id: string; number: string; total: string };
    onSuccess({
      transactionId: result.transaction_id,
      number: result.number,
      subtotal, discount, tax, total, method,
      ...(method === "cash" ? { received: receivedNum, change } : {}),
      customerName: finalName || undefined,
      customerPhone: finalPhone || undefined,
      lines: lines.map((l) => {
        const modTotal = (l.modifiers ?? []).reduce((m, mod) => m + mod.price, 0);
        const modLabel = l.modifiers?.length ? ` [${l.modifiers.map((m) => m.name).join(", ")}]` : "";
        return { name: (l.variantLabel ? `${l.product.name} (${l.variantLabel})` : l.product.name) + modLabel, qty: l.qty, price: (l.variantPrice ?? Number(l.product.price)) + modTotal, note: l.note };
      }),
    });
  }

  const busy = createSale.isPending || createCustomer.isPending;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-3xl bg-surface-container-lowest rounded-t-[24px] p-5 pb-safe space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="font-h2 text-h2 text-on-surface">Pembayaran</h2>
          <button onClick={onClose} className="text-on-surface-variant"><Icon name="close" /></button>
        </div>

        {/* Customer inline fields */}
        <div className="space-y-2 relative" ref={suggestRef}>
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Pelanggan (opsional)</p>
          {matchedCustomer ? (
            <div className="flex items-center gap-3 h-12 px-3 rounded-lg border border-primary/30 bg-primary-container/10">
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                <span className="font-label-caps text-label-caps text-on-primary">{matchedCustomer.name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body-md text-body-md text-on-surface truncate">{matchedCustomer.name}</p>
                {matchedCustomer.phone && <p className="font-label-caps text-label-caps text-on-surface-variant">{matchedCustomer.phone}</p>}
              </div>
              <button onClick={clearCustomer} className="text-on-surface-variant"><Icon name="close" className="text-[18px]" /></button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Icon name="person" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
                <input value={custName}
                  onChange={(e) => { setCustName(e.target.value); setMatchedCustomer(null); }}
                  onFocus={() => setActiveField("name")}
                  onBlur={() => setTimeout(() => setActiveField((f) => f === "name" ? null : f), 200)}
                  placeholder="Nama"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-outline-variant bg-surface-container-low focus:outline-none focus:border-primary font-body-md text-body-md" />
              </div>
              <div className="relative">
                <Icon name="call" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
                <input value={custPhone}
                  onChange={(e) => { setCustPhone(e.target.value.replace(/[^0-9+\- ]/g, "")); setMatchedCustomer(null); }}
                  onFocus={() => setActiveField("phone")}
                  onBlur={() => setTimeout(() => setActiveField((f) => f === "phone" ? null : f), 200)}
                  placeholder="No. WA"
                  inputMode="tel"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-outline-variant bg-surface-container-low focus:outline-none focus:border-primary font-body-md text-body-md" />
              </div>
            </div>
          )}

          {showSuggestions && (suggestions ?? []).length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/50 max-h-40 overflow-y-auto">
              {(suggestions ?? []).slice(0, 5).map((c) => (
                <button key={c.id} onMouseDown={() => selectCustomer(c)}
                  className="w-full flex items-center gap-3 h-11 px-3 text-left hover:bg-surface-container-low active:bg-surface-container transition-colors">
                  <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-semibold text-on-primary">{c.name[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-body-md text-on-surface truncate">{c.name}</p>
                  </div>
                  {c.phone && <span className="font-label-caps text-label-caps text-on-surface-variant shrink-0">{c.phone}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Item list */}
        <div className="space-y-3">
          {lines.map((l) => {
            const cartKey = l.variantId ? `${l.product.id}:${l.variantId}` : l.product.id;
            const basePrice = l.variantPrice ?? Number(l.product.price);
            const modTotal = (l.modifiers ?? []).reduce((m, mod) => m + mod.price, 0);
            const unitPrice = basePrice + modTotal;
            return (
              <div key={cartKey} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-body-md text-on-surface truncate">{l.product.name}</p>
                    {l.variantLabel && <p className="font-label-caps text-label-caps text-primary">{l.variantLabel}</p>}
                    {(l.modifiers ?? []).length > 0 && (
                      <p className="font-label-caps text-[10px] text-secondary">
                        + {l.modifiers!.map((m) => m.name).join(", ")}
                      </p>
                    )}
                    <p className="font-label-caps text-label-caps text-on-surface-variant">{formatRupiah(unitPrice)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onQty(cartKey, -1)} className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center"><Icon name="remove" className="text-[16px]" /></button>
                    <span className="w-5 text-center font-body-md text-body-md font-semibold">{l.qty}</span>
                    <button onClick={() => onQty(cartKey, 1)} className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center"><Icon name="add" className="text-[16px]" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon name="edit_note" className="text-[16px] text-on-surface-variant/50 shrink-0" />
                  <input value={l.note ?? ""} onChange={(e) => onNote(cartKey, e.target.value)}
                    placeholder="Catatan (cth: less sugar, extra shot)"
                    className="w-full h-7 px-2 rounded-md border border-outline-variant/40 bg-surface-container-low focus:outline-none focus:border-primary font-body-md text-[11px] text-on-surface-variant" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Discount */}
        <div className="flex items-center gap-2">
          <Icon name="sell" className="text-on-surface-variant shrink-0" />
          <div className="flex-1 relative">
            <input inputMode="numeric" value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Diskon" className="w-full h-10 px-3 pr-20 rounded-lg border border-outline-variant bg-surface-container-low focus:outline-none focus:border-primary font-body-md text-body-md" />
            <div className="absolute right-1 top-1 flex">
              <button onClick={() => setDiscountType("rp")}
                className={`h-8 px-2 rounded-md font-label-caps text-label-caps ${discountType === "rp" ? "bg-primary-container text-on-primary" : "text-on-surface-variant"}`}>Rp</button>
              <button onClick={() => setDiscountType("pct")}
                className={`h-8 px-2 rounded-md font-label-caps text-label-caps ${discountType === "pct" ? "bg-primary-container text-on-primary" : "text-on-surface-variant"}`}>%</button>
            </div>
          </div>
        </div>

        {/* Applied promos */}
        {appliedPromos.length > 0 && (
          <div className="bg-primary-container/10 border border-primary/20 rounded-xl p-3 space-y-1.5">
            <p className="font-label-caps text-label-caps text-primary flex items-center gap-1">
              <Icon name="local_offer" className="text-[14px]" /> Promo Aktif
            </p>
            {appliedPromos.map((a) => (
              <div key={a.promo.id} className="flex justify-between items-center">
                <span className="font-body-md text-body-md text-on-surface">{a.promo.name}</span>
                <span className="font-body-md text-body-md font-semibold text-primary">-{formatRupiah(a.discountAmount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-outline-variant/40 pt-3 space-y-1">
          <Line label="Subtotal" value={formatRupiah(subtotal)} />
          {promoDiscount > 0 && <Line label="Diskon Promo" value={`-${formatRupiah(promoDiscount)}`} className="text-primary" />}
          {manualDiscountVal > 0 && <Line label="Diskon Manual" value={`-${formatRupiah(manualDiscountVal)}`} className="text-error" />}
          {taxPercent > 0 && <Line label={`Pajak (${taxPercent}%)`} value={formatRupiah(tax)} />}
          <div className="flex justify-between items-center pt-1">
            <span className="font-body-lg text-body-lg font-semibold text-on-surface">Total</span>
            <span className="font-h2 text-h2 text-primary">{formatRupiah(total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {METHODS.map((m) => (
            <button key={m.key} onClick={() => setMethod(m.key)}
              className={`h-11 rounded-lg font-body-md text-body-md font-semibold border ${method === m.key ? "bg-primary-container text-on-primary border-transparent" : "bg-surface-container-lowest text-on-surface border-outline-variant"}`}>{m.label}</button>
          ))}
        </div>

        {method === "cash" && (
          <div className="space-y-2">
            <input inputMode="numeric" value={received} onChange={(e) => setReceived(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Uang diterima" className="w-full h-touch-target-min px-4 rounded-lg border border-outline-variant bg-surface-container-low focus:outline-none focus:border-primary font-body-lg text-body-lg" />
            <div className="flex gap-2 flex-wrap">
              <QuickCash label="Uang Pas" value={total} onPick={setReceived} />
              {[50000, 100000, 150000, 200000].filter((v) => v >= total).slice(0, 3).map((v) => (
                <QuickCash key={v} label={formatRupiah(v)} value={v} onPick={setReceived} />
              ))}
            </div>
            {receivedNum > 0 && <Line label="Kembalian" value={formatRupiah(change)} />}
          </div>
        )}

        {(createSale.isError || createCustomer.isError) && (
          <p className="font-body-md text-body-md text-error">
            {(createSale.error ?? createCustomer.error) instanceof Error ? (createSale.error ?? createCustomer.error)!.message : "Gagal memproses"}
          </p>
        )}

        <button onClick={process} disabled={busy || insufficient || lines.length === 0}
          className="w-full bg-secondary-container text-on-secondary-container rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
          {busy ? "Memproses..." : insufficient ? "Uang kurang" : "Proses Pembayaran"}
        </button>
      </div>
    </div>
  );
}

function QuickCash({ label, value, onPick }: { label: string; value: number; onPick: (v: string) => void }): JSX.Element {
  return (
    <button onClick={() => onPick(String(value))}
      className="h-9 px-3 rounded-lg bg-surface-container border border-outline-variant font-body-md text-body-md text-on-surface-variant active:scale-95 transition-transform">
      {label}
    </button>
  );
}

function Line({ label, value, className }: { label: string; value: string; className?: string }): JSX.Element {
  return (
    <div className="flex justify-between items-center">
      <span className="font-body-md text-body-md text-on-surface-variant">{label}</span>
      <span className={`font-body-md text-body-md ${className ?? "text-on-surface"}`}>{value}</span>
    </div>
  );
}
