import { useState } from "react";
import { Icon, FormSheet, Field, inputCls } from "@/components/shared";
import { useIngredients } from "@/hooks/use-ingredients";
import { useCreateStockAdjustment } from "@/hooks/use-stock-movements";

const TYPES = [
  { key: "purchase" as const, label: "Pembelian", icon: "add_shopping_cart" },
  { key: "adjustment" as const, label: "Opname", icon: "tune" },
  { key: "waste" as const, label: "Rusak/Expired", icon: "delete" },
  { key: "return" as const, label: "Retur", icon: "undo" },
];

interface Props { onClose: () => void; preselectedId?: string; }

export function StockAdjustForm({ onClose, preselectedId }: Props): JSX.Element {
  const { data: ingredients } = useIngredients();
  const mutation = useCreateStockAdjustment();
  const [ingredientId, setIngredientId] = useState(preselectedId ?? "");
  const [type, setType] = useState<typeof TYPES[number]["key"]>("purchase");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");

  const selected = (ingredients ?? []).find((i) => i.id === ingredientId);
  const qtyNum = Number(qty) || 0;
  const isNegative = type === "waste" || type === "return";
  const qtyChange = isNegative ? -Math.abs(qtyNum) : type === "adjustment" ? qtyNum : Math.abs(qtyNum);
  const newBalance = selected ? Number(selected.currentStock) + qtyChange : 0;
  const valid = ingredientId && qtyNum !== 0;

  async function handleSubmit(): Promise<void> {
    await mutation.mutateAsync({ ingredientId, type, qtyChange, note: note || undefined });
    onClose();
  }

  return (
    <FormSheet title="Penyesuaian Stok" onClose={onClose}>
      <Field label="Bahan Baku">
        <select value={ingredientId} onChange={(e) => setIngredientId(e.target.value)} className={inputCls}>
          <option value="">Pilih bahan...</option>
          {(ingredients ?? []).map((i) => (
            <option key={i.id} value={i.id}>{i.name} ({Number(i.currentStock).toLocaleString("id-ID")} {i.unit.code})</option>
          ))}
        </select>
      </Field>

      <Field label="Jenis">
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => (
            <button key={t.key} type="button" onClick={() => setType(t.key)}
              className={`h-11 rounded-lg font-body-md text-body-md flex items-center justify-center gap-1.5 border ${type === t.key ? "bg-primary-container text-on-primary border-transparent" : "bg-surface-container-lowest text-on-surface border-outline-variant"}`}>
              <Icon name={t.icon} className="text-[18px]" />{t.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label={type === "adjustment" ? "Selisih Stok (bisa negatif)" : "Jumlah"}>
        <div className="flex items-center gap-2">
          <input type="number" inputMode="decimal" value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0" className={inputCls} />
          {selected && <span className="font-body-md text-body-md text-on-surface-variant shrink-0">{selected.unit.code}</span>}
        </div>
      </Field>

      {selected && qtyNum !== 0 && (
        <div className="bg-surface-container rounded-lg p-3 space-y-1">
          <div className="flex justify-between font-body-md text-body-md">
            <span className="text-on-surface-variant">Stok saat ini</span>
            <span className="text-on-surface">{Number(selected.currentStock).toLocaleString("id-ID")} {selected.unit.code}</span>
          </div>
          <div className="flex justify-between font-body-md text-body-md">
            <span className="text-on-surface-variant">Perubahan</span>
            <span className={qtyChange >= 0 ? "text-primary" : "text-error"}>{qtyChange >= 0 ? "+" : ""}{qtyChange} {selected.unit.code}</span>
          </div>
          <div className="flex justify-between font-body-md text-body-md font-semibold border-t border-outline-variant/40 pt-1">
            <span className="text-on-surface">Stok akhir</span>
            <span className={newBalance < 0 ? "text-error" : "text-on-surface"}>{newBalance.toLocaleString("id-ID")} {selected.unit.code}</span>
          </div>
        </div>
      )}

      <Field label="Catatan (opsional)">
        <input value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Contoh: Expired batch #12" className={inputCls} />
      </Field>

      {mutation.isError && (
        <p className="font-body-md text-body-md text-error">{mutation.error instanceof Error ? mutation.error.message : "Gagal menyimpan"}</p>
      )}

      <button onClick={handleSubmit} disabled={!valid || mutation.isPending}
        className="w-full bg-secondary-container text-on-secondary-container rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
        {mutation.isPending ? "Menyimpan..." : "Simpan Penyesuaian"}
      </button>
    </FormSheet>
  );
}
