import { useState } from "react";
import { PageHeader, Icon, FormSheet, Field, inputCls, ListSkeleton, EmptyState, ErrorState, useConfirm } from "@/components/shared";
import { useOutlets, useCreateOutlet, useUpdateOutlet, useDeleteOutlet, type Outlet } from "@/hooks/use-outlets";

export function OutletsPage(): JSX.Element {
  const { data: outlets, isLoading, isError, error } = useOutlets();
  const deleteMut = useDeleteOutlet();
  const { confirm: confirmDel, ConfirmDialog } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Outlet | null>(null);

  return (
    <>
      <PageHeader title="Outlet" leftIcon="arrow_back" onLeft={() => window.history.back()} rightIcon="add" onRight={() => setShowForm(true)} />
      <div className="px-container-padding space-y-3 pb-24">
        {isLoading && <ListSkeleton />}
        {isError && <ErrorState message={error instanceof Error ? error.message : "Gagal memuat"} />}
        {!isLoading && !isError && (outlets ?? []).length === 0 && (
          <EmptyState icon="store" title="Belum ada outlet" subtitle="Tambah outlet untuk mengelola cabang." />
        )}
        {(outlets ?? []).map((o) => (
          <div key={o.id} className="bg-surface-container-lowest rounded-xl p-4 shadow-card border border-outline-variant/40">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-body-md text-body-md font-semibold text-on-surface">{o.name}</h3>
                {o.address && <p className="font-label-caps text-label-caps text-on-surface-variant mt-0.5">{o.address}</p>}
                {o.phone && <p className="font-label-caps text-label-caps text-on-surface-variant">{o.phone}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(o); setShowForm(true); }}
                  className="p-2 text-on-surface-variant active:scale-90 transition-transform">
                  <Icon name="edit" />
                </button>
                <button onClick={async () => { if (await confirmDel("Hapus outlet ini?", "Data outlet akan dihapus permanen.")) deleteMut.mutate(o.id); }}
                  className="p-2 text-error active:scale-90 transition-transform">
                  <Icon name="delete" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && <OutletForm outlet={editing} onClose={() => { setShowForm(false); setEditing(null); }} />}
      <ConfirmDialog />
    </>
  );
}

function OutletForm({ outlet, onClose }: { outlet: Outlet | null; onClose: () => void }): JSX.Element {
  const create = useCreateOutlet();
  const update = useUpdateOutlet();
  const [name, setName] = useState(outlet?.name ?? "");
  const [address, setAddress] = useState(outlet?.address ?? "");
  const [phone, setPhone] = useState(outlet?.phone ?? "");
  const [receiptHeader, setReceiptHeader] = useState(outlet?.receiptHeader ?? "");
  const [receiptFooter, setReceiptFooter] = useState(outlet?.receiptFooter ?? "");

  async function submit(): Promise<void> {
    const data = { name, address, phone, receiptHeader: receiptHeader || undefined, receiptFooter: receiptFooter || undefined };
    if (outlet) await update.mutateAsync({ id: outlet.id, ...data });
    else await create.mutateAsync(data);
    onClose();
  }

  const pending = create.isPending || update.isPending;

  return (
    <FormSheet title={outlet ? "Edit Outlet" : "Tambah Outlet"} onClose={onClose}>
      <Field label="Nama Outlet">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Herbaspace Cabang X" autoFocus />
      </Field>
      <Field label="Alamat">
        <textarea className={`${inputCls} h-20 py-3`} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat lengkap" />
      </Field>
      <Field label="Telepon">
        <input className={inputCls} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx" />
      </Field>

      <div className="pt-2 border-t border-outline-variant/30">
        <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1">
          <Icon name="receipt" className="text-[14px]" /> Branding Struk
        </p>
        <div className="space-y-3">
          <Field label="Header Struk">
            <input className={inputCls} value={receiptHeader} onChange={(e) => setReceiptHeader(e.target.value)} placeholder="cth: Terima kasih telah berkunjung!" />
          </Field>
          <Field label="Footer Struk">
            <input className={inputCls} value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} placeholder="cth: Follow @herbaspace" />
          </Field>
        </div>
      </div>

      <button onClick={submit} disabled={pending || !name.trim()}
        className="w-full bg-primary text-on-primary rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
        {pending ? "Menyimpan..." : "Simpan"}
      </button>
    </FormSheet>
  );
}
