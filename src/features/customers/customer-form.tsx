import { useState } from "react";
import { FormSheet, Field, inputCls, Icon } from "@/components/shared";
import { useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/hooks/use-customers";
import type { Customer } from "@/types";

export function CustomerForm({ initial, onClose, onDeleted }: { initial?: Customer; onClose: () => void; onDeleted?: () => void }): JSX.Element {
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const del = useDeleteCustomer();
  const editing = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  const busy = create.isPending || update.isPending || del.isPending;
  const err = create.error || update.error || del.error;

  async function submit(): Promise<void> {
    if (editing) await update.mutateAsync({ id: initial.id, name, phone: phone || undefined, email: email || undefined, note: note || undefined });
    else await create.mutateAsync({ name, phone: phone || undefined, email: email || undefined, note: note || undefined });
    onClose();
  }
  async function remove(): Promise<void> {
    if (!initial || !confirm(`Hapus pelanggan "${initial.name}"?`)) return;
    await del.mutateAsync(initial.id);
    (onDeleted ?? onClose)();
  }

  return (
    <FormSheet title={editing ? "Edit Pelanggan" : "Tambah Pelanggan"} onClose={onClose}>
      <Field label="Nama"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Budi Santoso" /></Field>
      <Field label="Telepon"><input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812-3456-7890" /></Field>
      <Field label="Email (opsional)"><input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" /></Field>
      <Field label="Catatan (opsional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pelanggan langganan" /></Field>
      {err && <p className="font-body-md text-body-md text-error">{err instanceof Error ? err.message : "Gagal menyimpan"}</p>}
      <button onClick={submit} disabled={!name || busy}
        className="w-full bg-primary text-on-primary rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
        {busy ? "Menyimpan..." : "Simpan Pelanggan"}
      </button>
      {editing && (
        <button onClick={remove} disabled={busy} className="w-full h-12 rounded-xl border border-error/40 text-error font-body-md text-body-md font-semibold flex items-center justify-center gap-2">
          <Icon name="delete" />Hapus Pelanggan
        </button>
      )}
    </FormSheet>
  );
}
