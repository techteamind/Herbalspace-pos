import { useState } from "react";
import { Icon } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useCreateSale } from "@/hooks/use-transactions";
import type { ProductWithCategory } from "@/types";

export interface CartLine { product: ProductWithCategory; qty: number; }
type Method = "cash" | "qris" | "card" | "transfer";
const METHODS: { key: Method; label: string }[] = [
  { key: "cash", label: "Tunai" }, { key: "qris", label: "QRIS" }, { key: "card", label: "Kartu" },
];

interface Props {
  lines: CartLine[];
  taxPercent: number;
  onClose: () => void;
  onSuccess: (data: { number: string; subtotal: number; tax: number; total: number; method: string; received?: number; change?: number; lines: { name: string; qty: number; price: number }[] }) => void;
  onQty: (productId: string, delta: number) => void;
}

export function PaymentSheet({ lines, taxPercent, onClose, onSuccess, onQty }: Props): JSX.Element {
  const [method, setMethod] = useState<Method>("cash");
  const [received, setReceived] = useState("");
  const createSale = useCreateSale();

  const subtotal = lines.reduce((s, l) => s + Number(l.product.price) * l.qty, 0);
  const tax = Math.round(subtotal * taxPercent / 100);
  const total = subtotal + tax;
  const receivedNum = Number(received) || 0;
  const change = Math.max(0, receivedNum - total);
  const insufficient = method === "cash" && receivedNum < total;

  async function process(): Promise<void> {
    const result = await createSale.mutateAsync({
      taxPercent,
      discount: 0,
      items: lines.map((l) => ({
        product_id: l.product.id,
        product_name: l.product.name,
        quantity: l.qty,
        unit_price: Number(l.product.price),
      })),
      payments: [{
        method,
        amount: total,
        ...(method === "cash" ? { amount_received: receivedNum, change_amount: change } : {}),
      }],
    }) as { number: string; total: string };
    onSuccess({
      number: result.number,
      subtotal, tax, total, method,
      ...(method === "cash" ? { received: receivedNum, change } : {}),
      lines: lines.map((l) => ({ name: l.product.name, qty: l.qty, price: Number(l.product.price) })),
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-surface-container-lowest rounded-t-[24px] p-5 pb-safe space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="font-h2 text-h2 text-on-surface">Pembayaran</h2>
          <button onClick={onClose} className="text-on-surface-variant"><Icon name="close" /></button>
        </div>

        <div className="space-y-2">
          {lines.map((l) => (
            <div key={l.product.id} className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-body-md text-body-md text-on-surface truncate">{l.product.name}</p>
                <p className="font-label-caps text-label-caps text-on-surface-variant">{formatRupiah(l.product.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onQty(l.product.id, -1)} className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center"><Icon name="remove" className="text-[16px]" /></button>
                <span className="w-5 text-center font-body-md text-body-md font-semibold">{l.qty}</span>
                <button onClick={() => onQty(l.product.id, 1)} className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center"><Icon name="add" className="text-[16px]" /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-outline-variant/40 pt-3 space-y-1">
          <Line label="Subtotal" value={formatRupiah(subtotal)} />
          {taxPercent > 0 && <Line label={`Pajak (${taxPercent}%)`} value={formatRupiah(tax)} />}
          <div className="flex justify-between items-center pt-1">
            <span className="font-body-lg text-body-lg font-semibold text-on-surface">Total</span>
            <span className="font-h2 text-h2 text-primary">{formatRupiah(total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button key={m.key} onClick={() => setMethod(m.key)}
              className={`h-11 rounded-lg font-body-md text-body-md font-semibold border ${method === m.key ? "bg-primary-container text-on-primary border-transparent" : "bg-surface-container-lowest text-on-surface border-outline-variant"}`}>{m.label}</button>
          ))}
        </div>

        {method === "cash" && (
          <div className="space-y-2">
            <input inputMode="numeric" value={received} onChange={(e) => setReceived(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Uang diterima" className="w-full h-touch-target-min px-4 rounded-lg border border-outline-variant bg-surface-container-low focus:outline-none focus:border-primary font-body-lg text-body-lg" />
            {receivedNum > 0 && <Line label="Kembalian" value={formatRupiah(change)} />}
          </div>
        )}

        {createSale.isError && (
          <p className="font-body-md text-body-md text-error">{createSale.error instanceof Error ? createSale.error.message : "Gagal memproses"}</p>
        )}

        <button onClick={process} disabled={createSale.isPending || insufficient || lines.length === 0}
          className="w-full bg-secondary-container text-on-secondary-container rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
          {createSale.isPending ? "Memproses..." : insufficient ? "Uang kurang" : "Proses Pembayaran"}
        </button>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between items-center">
      <span className="font-body-md text-body-md text-on-surface-variant">{label}</span>
      <span className="font-body-md text-body-md text-on-surface">{value}</span>
    </div>
  );
}
