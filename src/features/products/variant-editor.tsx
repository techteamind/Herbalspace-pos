import { useState } from "react";
import { Icon, Field, inputCls } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";

interface VariantGroupInput {
  name: string;
  options: string[];
}

interface VariantRow {
  optionIds: string[];
  label: string;
  sku: string;
  price: string;
}

interface Props {
  basePrice: number;
  groups: VariantGroupInput[];
  variants: VariantRow[];
  onChange: (groups: VariantGroupInput[], variants: VariantRow[]) => void;
}

function generateCombinations(groups: VariantGroupInput[], existingVariants?: VariantRow[]): VariantRow[] {
  if (groups.length === 0 || groups.some((g) => g.options.length === 0)) return [];
  const combos: VariantRow[] = [];
  const recurse = (gi: number, picked: string[], ids: string[]) => {
    if (gi === groups.length) {
      const label = picked.join(" / ");
      const existing = existingVariants?.find((v) =>
        v.optionIds.join(",") === ids.join(",") || v.label === label
      );
      combos.push({
        optionIds: ids,
        label,
        sku: existing?.sku ?? "",
        price: existing?.price ?? "",
      });
      return;
    }
    groups[gi]!.options.forEach((opt, oi) => {
      recurse(gi + 1, [...picked, opt], [...ids, `${gi}-${oi}`]);
    });
  };
  recurse(0, [], []);
  return combos;
}

export function VariantEditor({ basePrice, groups, variants, onChange }: Props): JSX.Element {
  const [showEditor, setShowEditor] = useState(groups.length > 0);

  function addGroup(): void {
    const next = [...groups, { name: "", options: [""] }];
    onChange(next, generateCombinations(next, variants));
  }

  function removeGroup(gi: number): void {
    const next = groups.filter((_, i) => i !== gi);
    onChange(next, generateCombinations(next, variants));
  }

  function updateGroupName(gi: number, name: string): void {
    const next = groups.map((g, i) => (i === gi ? { ...g, name } : g));
    onChange(next, variants);
  }

  function addOption(gi: number): void {
    const next = groups.map((g, i) => (i === gi ? { ...g, options: [...g.options, ""] } : g));
    onChange(next, generateCombinations(next, variants));
  }

  function removeOption(gi: number, oi: number): void {
    const next = groups.map((g, i) => (i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g));
    onChange(next, generateCombinations(next, variants));
  }

  function updateOption(gi: number, oi: number, val: string): void {
    const next = groups.map((g, i) =>
      i === gi ? { ...g, options: g.options.map((o, j) => (j === oi ? val : o)) } : g
    );
    onChange(next, generateCombinations(next, variants));
  }

  function updateVariant(idx: number, field: "sku" | "price", val: string): void {
    const next = variants.map((v, i) => (i === idx ? { ...v, [field]: val } : v));
    onChange(groups, next);
  }

  if (!showEditor) {
    return (
      <button type="button" onClick={() => { setShowEditor(true); if (groups.length === 0) addGroup(); }}
        className="w-full flex items-center justify-between bg-surface-container border border-outline-variant rounded-xl px-4 h-touch-target-min text-on-surface-variant hover:border-primary transition-colors">
        <span className="flex items-center gap-2">
          <Icon name="tune" />
          <span className="font-body-md text-body-md font-semibold">Tambah Varian (Ukuran, Tipe, dll)</span>
        </span>
        <Icon name="add" />
      </button>
    );
  }

  return (
    <div className="space-y-4 bg-surface-container rounded-xl p-4 border border-outline-variant">
      <div className="flex items-center justify-between">
        <h3 className="font-body-md text-body-md font-semibold text-on-surface flex items-center gap-2">
          <Icon name="tune" className="text-primary" /> Varian Produk
        </h3>
        <button type="button" onClick={() => { setShowEditor(false); onChange([], []); }}
          className="text-error font-label-caps text-label-caps flex items-center gap-1">
          <Icon name="close" className="text-[14px]" /> Hapus Semua
        </button>
      </div>

      {groups.map((g, gi) => (
        <div key={gi} className="bg-surface-container-lowest rounded-lg p-3 space-y-2 border border-outline-variant/50">
          <div className="flex items-center gap-2">
            <input className={`${inputCls} flex-1`} value={g.name} onChange={(e) => updateGroupName(gi, e.target.value)}
              placeholder={`Nama grup (cth: Ukuran, Tipe)`} />
            {groups.length > 1 && (
              <button type="button" onClick={() => removeGroup(gi)} className="text-error p-1">
                <Icon name="delete" className="text-[20px]" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {g.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-1 bg-surface-container rounded-full pl-3 pr-1 h-8 border border-outline-variant/50">
                <input className="bg-transparent outline-none font-body-md text-body-md w-20 text-on-surface"
                  value={opt} onChange={(e) => updateOption(gi, oi, e.target.value)}
                  placeholder={`Opsi ${oi + 1}`} />
                {g.options.length > 1 && (
                  <button type="button" onClick={() => removeOption(gi, oi)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error">
                    <Icon name="close" className="text-[14px]" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => addOption(gi)}
              className="h-8 px-3 rounded-full border border-dashed border-primary text-primary font-label-caps text-label-caps flex items-center gap-1">
              <Icon name="add" className="text-[14px]" /> Opsi
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={addGroup}
        className="w-full h-10 rounded-lg border border-dashed border-outline-variant text-on-surface-variant font-label-caps text-label-caps flex items-center justify-center gap-1 hover:border-primary hover:text-primary transition-colors">
        <Icon name="add" className="text-[16px]" /> Tambah Grup Varian
      </button>

      {variants.length > 0 && (
        <div className="space-y-2">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Daftar Varian ({variants.length})
          </p>
          {variants.map((v, i) => (
            <div key={v.optionIds.join(",")} className="bg-surface-container-lowest rounded-lg p-3 border border-outline-variant/50">
              <p className="font-body-md text-body-md font-semibold text-on-surface mb-2">{v.label || "—"}</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Harga">
                  <input className={inputCls} inputMode="numeric" value={v.price}
                    onChange={(e) => updateVariant(i, "price", e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder={String(basePrice || 0)} />
                </Field>
                <Field label="SKU">
                  <input className={inputCls} value={v.sku}
                    onChange={(e) => updateVariant(i, "sku", e.target.value)} placeholder="Opsional" />
                </Field>
              </div>
              {v.price && (
                <p className="font-label-caps text-label-caps text-primary mt-1">{formatRupiah(Number(v.price))}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
