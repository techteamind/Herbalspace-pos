import { useState } from "react";
import { PageHeader, Icon, FormSheet, Field, inputCls, ListSkeleton, EmptyState } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useActiveShift, useShifts, useOpenShift, useCloseShift, type Shift } from "@/hooks/use-shifts";

export function ShiftsPage(): JSX.Element {
  const { data: activeShift, isLoading: loadingActive } = useActiveShift();
  const { data: history, isLoading: loadingHistory } = useShifts();
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [selected, setSelected] = useState<Shift | null>(null);

  return (
    <>
      <PageHeader title="Shift Kasir" leftIcon="arrow_back" onLeft={() => history && window.history.back()} />
      <div className="px-container-padding space-y-4 pb-24">
        {loadingActive ? <ListSkeleton /> : activeShift ? (
          <ActiveShiftCard shift={activeShift} onClose={() => setShowClose(true)} />
        ) : (
          <div className="bg-surface-container rounded-xl p-5 text-center space-y-3">
            <Icon name="schedule" className="text-[40px] text-outline" />
            <p className="font-body-md text-body-md text-on-surface-variant">Tidak ada shift aktif</p>
            <button onClick={() => setShowOpen(true)}
              className="bg-primary text-on-primary rounded-xl h-12 px-6 font-body-md text-body-md font-semibold active:scale-[0.98] transition-transform">
              <Icon name="play_arrow" className="mr-1" />Buka Shift
            </button>
          </div>
        )}

        <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Riwayat Shift</p>
        {loadingHistory && <ListSkeleton />}
        {!loadingHistory && (history ?? []).filter((s) => s.closedAt).length === 0 && (
          <EmptyState icon="schedule" title="Belum ada riwayat" subtitle="Riwayat shift akan muncul setelah shift ditutup." />
        )}
        <div className="space-y-2">
          {(history ?? []).filter((s) => s.closedAt).map((s) => (
            <button key={s.id} onClick={() => setSelected(s)}
              className="w-full bg-surface-container-lowest p-3 rounded-xl shadow-elevation-1 text-left active:scale-[0.99] transition-transform">
              <div className="flex justify-between items-center">
                <h3 className="font-body-md text-body-md font-semibold text-on-surface">{s.cashierName}</h3>
                <span className="font-body-md text-body-md font-bold text-primary">{formatRupiah(s.totalSales ?? "0")}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant">
                  {new Date(s.openedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} · {new Date(s.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} – {new Date(s.closedAt!).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="font-label-caps text-label-caps text-on-surface-variant">{s.totalTransactions ?? 0} transaksi</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {showOpen && <OpenShiftForm onClose={() => setShowOpen(false)} />}
      {showClose && activeShift && <CloseShiftForm shift={activeShift} onClose={() => setShowClose(false)} />}
      {selected && <ShiftDetail shift={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function ActiveShiftCard({ shift, onClose }: { shift: Shift; onClose: () => void }): JSX.Element {
  const elapsed = Math.floor((Date.now() - new Date(shift.openedAt).getTime()) / 60000);
  const hours = Math.floor(elapsed / 60);
  const mins = elapsed % 60;

  return (
    <div className="bg-primary-container rounded-xl p-4 shadow-card space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
          <span className="font-body-md text-body-md font-semibold text-on-primary">Shift Aktif</span>
        </div>
        <span className="font-label-caps text-label-caps text-primary">{hours}j {mins}m</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="font-body-md text-body-md text-primary-fixed">Kasir</span>
          <span className="font-body-md text-body-md text-on-primary font-semibold">{shift.cashierName}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-body-md text-body-md text-primary-fixed">Mulai</span>
          <span className="font-body-md text-body-md text-on-primary">{new Date(shift.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-body-md text-body-md text-primary-fixed">Kas Awal</span>
          <span className="font-body-md text-body-md text-on-primary font-semibold">{formatRupiah(shift.openingCash)}</span>
        </div>
      </div>
      <button onClick={onClose}
        className="w-full h-11 rounded-xl bg-error text-on-error font-body-md text-body-md font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
        <Icon name="stop" />Tutup Shift
      </button>
    </div>
  );
}

function OpenShiftForm({ onClose }: { onClose: () => void }): JSX.Element {
  const open = useOpenShift();
  const [cash, setCash] = useState("");

  async function submit(): Promise<void> {
    await open.mutateAsync({ openingCash: Number(cash) || 0 });
    onClose();
  }

  return (
    <FormSheet title="Buka Shift" onClose={onClose}>
      <Field label="Kas Awal (Rp)">
        <input className={inputCls} inputMode="numeric" value={cash}
          onChange={(e) => setCash(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="0" autoFocus />
      </Field>
      <p className="font-label-caps text-label-caps text-on-surface-variant">Masukkan jumlah uang tunai di laci kasir saat ini.</p>
      <button onClick={submit} disabled={open.isPending}
        className="w-full bg-primary text-on-primary rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
        {open.isPending ? "Memproses..." : "Buka Shift"}
      </button>
    </FormSheet>
  );
}

function CloseShiftForm({ shift, onClose }: { shift: Shift; onClose: () => void }): JSX.Element {
  const close = useCloseShift();
  const [cash, setCash] = useState("");
  const [note, setNote] = useState("");

  async function submit(): Promise<void> {
    await close.mutateAsync({ id: shift.id, closingCash: Number(cash) || 0, note: note || undefined });
    onClose();
  }

  return (
    <FormSheet title="Tutup Shift" onClose={onClose}>
      <Field label="Kas Akhir (Rp)">
        <input className={inputCls} inputMode="numeric" value={cash}
          onChange={(e) => setCash(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="Hitung uang di laci" autoFocus />
      </Field>
      <Field label="Catatan (opsional)">
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan akhir shift" />
      </Field>
      {close.isError && <p className="font-body-md text-body-md text-error">{close.error instanceof Error ? close.error.message : "Gagal"}</p>}
      <button onClick={submit} disabled={close.isPending}
        className="w-full bg-error text-on-error rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
        {close.isPending ? "Memproses..." : "Tutup Shift"}
      </button>
    </FormSheet>
  );
}

function ShiftDetail({ shift, onClose }: { shift: Shift; onClose: () => void }): JSX.Element {
  const diff = Number(shift.closingCash ?? 0) - Number(shift.expectedCash ?? 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-3xl bg-surface-container-lowest rounded-t-[24px] p-5 pb-safe space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="font-h2 text-h2 text-on-surface">Rekap Shift</h2>
          <button onClick={onClose} className="text-on-surface-variant"><Icon name="close" /></button>
        </div>
        <div className="bg-surface-container rounded-xl p-3 space-y-1">
          <Row label="Kasir" value={shift.cashierName} />
          <Row label="Mulai" value={new Date(shift.openedAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} />
          <Row label="Selesai" value={shift.closedAt ? new Date(shift.closedAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"} />
          <Row label="Total Transaksi" value={`${shift.totalTransactions ?? 0} transaksi`} />
        </div>
        <div className="border-t border-outline-variant/40 pt-3 space-y-1">
          <Row label="Total Penjualan" value={formatRupiah(shift.totalSales ?? "0")} bold />
          <Row label="Kas Awal" value={formatRupiah(shift.openingCash)} />
          <Row label="Kas Akhir (dihitung)" value={formatRupiah(shift.closingCash ?? "0")} />
          <Row label="Kas Harapan" value={formatRupiah(shift.expectedCash ?? "0")} />
          <div className="flex justify-between items-center pt-1">
            <span className="font-body-md text-body-md font-semibold text-on-surface">Selisih</span>
            <span className={`font-body-md text-body-md font-bold ${diff === 0 ? "text-primary" : diff > 0 ? "text-primary" : "text-error"}`}>
              {diff > 0 ? "+" : ""}{formatRupiah(Math.abs(diff))}
              {diff !== 0 && <span className="text-on-surface-variant font-normal"> ({diff > 0 ? "lebih" : "kurang"})</span>}
            </span>
          </div>
        </div>
        {shift.note && (
          <div className="bg-surface-container rounded-xl p-3">
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">Catatan</p>
            <p className="font-body-md text-body-md text-on-surface">{shift.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }): JSX.Element {
  return (
    <div className="flex justify-between items-center">
      <span className="font-body-md text-body-md text-on-surface-variant">{label}</span>
      <span className={`font-body-md text-body-md text-on-surface ${bold ? "font-bold" : ""}`}>{value}</span>
    </div>
  );
}
