import { useState } from "react";
import { FormSheet, Field, inputCls, Icon, ConfirmDialog, useToast } from "@/components/shared";
import { useCreateExpense, useUpdateExpense, useDeleteExpense, useExpenseCategories, useCreateExpenseCategory } from "@/hooks/use-expenses";
import { haptic, hapticError } from "@/lib/haptic";
import type { Expense } from "@/types";

export function ExpenseForm({ initial, onClose }: { initial?: Expense; onClose: () => void }): JSX.Element {
  const toast = useToast();
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const del = useDeleteExpense();
  const { data: categories } = useExpenseCategories();
  const createCat = useCreateExpenseCategory();
  const editing = !!initial;

  const today = new Date().toISOString().slice(0, 10);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial ? String(Number(initial.amount)) : "");
  const [spentAt, setSpentAt] = useState(initial ? new Date(initial.spentAt).toISOString().slice(0, 10) : today);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const busy = create.isPending || update.isPending || del.isPending;
  const err = create.error || update.error || del.error;

  async function addCategory(): Promise<void> {
    const name = prompt("Nama kategori baru:");
    if (!name) return;
    const cat = await createCat.mutateAsync({ name }) as { id: string };
    setCategoryId(cat.id);
  }
  async function submit(): Promise<void> {
    const payload = { categoryId: categoryId || undefined, description, amount: Number(amount) || 0, spentAt: new Date(spentAt).toISOString() };
    if (editing) await update.mutateAsync({ id: initial.id, ...payload });
    else await create.mutateAsync(payload);
    haptic();
    toast(editing ? "Pengeluaran diperbarui" : "Pengeluaran ditambahkan");
    onClose();
  }
  async function remove(): Promise<void> {
    if (!initial) return;
    await del.mutateAsync(initial.id);
    hapticError();
    toast("Pengeluaran dihapus", "error");
    onClose();
  }

  return (
    <FormSheet title={editing ? "Edit Pengeluaran" : "Tambah Pengeluaran"} onClose={onClose}>
      <Field label="Kategori">
        <div className="flex gap-2">
          <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— Pilih —</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={addCategory} type="button" aria-label="Tambah kategori"
            className="h-touch-target-min w-12 shrink-0 rounded-lg border border-outline-variant text-primary flex items-center justify-center"><Icon name="add" /></button>
        </div>
      </Field>
      <Field label="Deskripsi" required><input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sewa tempat Juni" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Jumlah"><input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" /></Field>
        <Field label="Tanggal"><input className={inputCls} type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} /></Field>
      </div>
      {err && <p className="font-body-md text-body-md text-error">{err instanceof Error ? err.message : "Gagal menyimpan"}</p>}
      <button onClick={submit} disabled={!description || !amount || busy}
        className="w-full bg-primary text-on-primary rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
        {busy ? "Menyimpan..." : "Simpan Pengeluaran"}
      </button>
      {editing && (
        <button onClick={() => setShowDeleteConfirm(true)} disabled={busy} className="w-full h-12 rounded-xl border border-error/40 text-error font-body-md text-body-md font-semibold flex items-center justify-center gap-2">
          <Icon name="delete" />Hapus
        </button>
      )}
      <ConfirmDialog open={showDeleteConfirm} title="Hapus pengeluaran ini?" message="Data pengeluaran yang dihapus tidak dapat dikembalikan."
        onConfirm={remove} onCancel={() => setShowDeleteConfirm(false)} />
    </FormSheet>
  );
}
