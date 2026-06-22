import { useState } from "react";
import { PageHeader, Icon, FormSheet, Field, inputCls, ListSkeleton, EmptyState, ErrorState, useConfirm } from "@/components/shared";
import { usePromos, useCreatePromo, useUpdatePromo, useDeletePromo, type Promo } from "@/hooks/use-promos";

const TYPE_LABELS: Record<Promo["type"], string> = {
  discount_percent: "Diskon %",
  discount_amount: "Diskon Rp",
  buy_x_get_y: "Beli X Gratis Y",
  happy_hour: "Happy Hour",
};

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function PromosPage(): JSX.Element {
  const { data: promos, isLoading, isError, error } = usePromos();
  const deleteMut = useDeletePromo();
  const updateMut = useUpdatePromo();
  const { confirm: confirmDel, ConfirmDialog } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Promo | null>(null);

  return (
    <>
      <PageHeader title="Promo" leftIcon="arrow_back" onLeft={() => window.history.back()} rightIcon="add" onRight={() => setShowForm(true)} />
      <div className="px-container-padding space-y-3 pb-24">
        {isLoading && <ListSkeleton />}
        {isError && <ErrorState message={error instanceof Error ? error.message : "Gagal memuat"} />}
        {!isLoading && !isError && (promos ?? []).length === 0 && (
          <EmptyState icon="local_offer" title="Belum ada promo" subtitle="Buat promo diskon, happy hour, atau beli X gratis Y." />
        )}
        {(promos ?? []).map((p) => (
          <div key={p.id} className="bg-surface-container-lowest rounded-xl p-4 shadow-card border border-outline-variant/40">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-body-md text-body-md font-semibold text-on-surface">{p.name}</h3>
                  {!p.isActive && <span className="font-label-caps text-label-caps bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded">OFF</span>}
                </div>
                <p className="font-label-caps text-label-caps text-primary mt-0.5">
                  {TYPE_LABELS[p.type]}
                  {p.type === "discount_percent" && ` ${Number(p.value)}%`}
                  {p.type === "discount_amount" && ` Rp${Number(p.value).toLocaleString("id-ID")}`}
                  {p.type === "buy_x_get_y" && ` Beli ${p.buyQty} Gratis ${p.getQty}`}
                  {p.type === "happy_hour" && ` ${Number(p.value)}%`}
                </p>
                {p.startHour && p.endHour && (
                  <p className="font-label-caps text-label-caps text-on-surface-variant mt-0.5">
                    {p.startHour} – {p.endHour}
                    {p.daysOfWeek && p.daysOfWeek.length > 0 && ` · ${p.daysOfWeek.map((d) => DAY_NAMES[d]).join(", ")}`}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => updateMut.mutate({ id: p.id, isActive: !p.isActive })}
                  className="p-2 text-on-surface-variant active:scale-90 transition-transform">
                  <Icon name={p.isActive ? "toggle_on" : "toggle_off"} className={p.isActive ? "text-primary" : ""} />
                </button>
                <button onClick={() => { setEditing(p); setShowForm(true); }}
                  className="p-2 text-on-surface-variant active:scale-90 transition-transform">
                  <Icon name="edit" />
                </button>
                <button onClick={async () => { if (await confirmDel("Hapus promo ini?", "Promo yang dihapus tidak dapat dikembalikan.")) deleteMut.mutate(p.id); }}
                  className="p-2 text-error active:scale-90 transition-transform">
                  <Icon name="delete" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && <PromoForm promo={editing} onClose={() => { setShowForm(false); setEditing(null); }} />}
      <ConfirmDialog />
    </>
  );
}

function PromoForm({ promo, onClose }: { promo: Promo | null; onClose: () => void }): JSX.Element {
  const create = useCreatePromo();
  const update = useUpdatePromo();
  const [name, setName] = useState(promo?.name ?? "");
  const [type, setType] = useState<Promo["type"]>(promo?.type ?? "discount_percent");
  const [value, setValue] = useState(promo ? String(Number(promo.value)) : "");
  const [buyQty, setBuyQty] = useState(promo?.buyQty ? String(promo.buyQty) : "2");
  const [getQty, setGetQty] = useState(promo?.getQty ? String(promo.getQty) : "1");
  const [startHour, setStartHour] = useState(promo?.startHour ?? "");
  const [endHour, setEndHour] = useState(promo?.endHour ?? "");
  const [days, setDays] = useState<number[]>(promo?.daysOfWeek ?? []);

  function toggleDay(d: number): void {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  async function submit(): Promise<void> {
    const data = {
      name, type, value: String(Number(value) || 0),
      buyQty: type === "buy_x_get_y" ? Number(buyQty) : null,
      getQty: type === "buy_x_get_y" ? Number(getQty) : null,
      startHour: startHour || null, endHour: endHour || null,
      daysOfWeek: days.length > 0 ? days : null,
    };
    if (promo) await update.mutateAsync({ id: promo.id, ...data });
    else await create.mutateAsync(data);
    onClose();
  }

  const pending = create.isPending || update.isPending;

  return (
    <FormSheet title={promo ? "Edit Promo" : "Buat Promo"} onClose={onClose}>
      <Field label="Nama Promo">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Diskon Weekend" autoFocus />
      </Field>
      <Field label="Tipe">
        <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as Promo["type"])}>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      {(type === "discount_percent" || type === "discount_amount" || type === "happy_hour") && (
        <Field label={type === "discount_amount" ? "Nilai Diskon (Rp)" : "Nilai Diskon (%)"}>
          <input className={inputCls} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="10" />
        </Field>
      )}
      {type === "buy_x_get_y" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Beli">
            <input className={inputCls} inputMode="numeric" value={buyQty} onChange={(e) => setBuyQty(e.target.value.replace(/[^0-9]/g, ""))} />
          </Field>
          <Field label="Gratis">
            <input className={inputCls} inputMode="numeric" value={getQty} onChange={(e) => setGetQty(e.target.value.replace(/[^0-9]/g, ""))} />
          </Field>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Jam Mulai">
          <input className={inputCls} type="time" value={startHour} onChange={(e) => setStartHour(e.target.value)} />
        </Field>
        <Field label="Jam Selesai">
          <input className={inputCls} type="time" value={endHour} onChange={(e) => setEndHour(e.target.value)} />
        </Field>
      </div>
      <Field label="Hari Aktif">
        <div className="flex gap-1.5 flex-wrap">
          {DAY_NAMES.map((d, i) => (
            <button key={i} type="button" onClick={() => toggleDay(i)}
              className={`h-9 w-11 rounded-lg font-label-caps text-label-caps ${days.includes(i) ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant border border-outline-variant"}`}>
              {d}
            </button>
          ))}
        </div>
      </Field>
      <p className="font-label-caps text-label-caps text-on-surface-variant">Kosongkan jam & hari = berlaku sepanjang waktu.</p>
      <button onClick={submit} disabled={pending || !name.trim()}
        className="w-full bg-primary text-on-primary rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
        {pending ? "Menyimpan..." : promo ? "Simpan" : "Buat Promo"}
      </button>
    </FormSheet>
  );
}
