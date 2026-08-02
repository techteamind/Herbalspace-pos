import { useEffect, useState } from "react";
import { Icon, useToast } from "@/components/shared";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api-client";
import { formatRupiah } from "@/lib/utils";

interface Shift { id: string; openingCash: string; openedAt: string }
interface Closed { id: string; closingCash: string; expectedCash: string; totalSales: string }

// Alur "Akhiri Shift & Keluar": hitung kas → tutup → tampil selisih → [Buka lagi]
// atau [Keluar ke daftar user]. Kalau tak ada shift aktif, langsung ke picker.
export function EndShiftFlow({ onClose }: { onClose: () => void }): JSX.Element {
  const { exitToPicker } = useAuth();
  const toast = useToast();
  const [shift, setShift] = useState<Shift | null | undefined>(undefined); // undefined = loading
  const [closingCash, setClosingCash] = useState("");
  const [closed, setClosed] = useState<Closed | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<Shift | null>("shifts?active=true").then(setShift).catch(() => setShift(null));
  }, []);

  async function doClose(): Promise<void> {
    if (!shift) return;
    setBusy(true);
    try {
      const res = await apiFetch<Closed>("shifts", { method: "PUT", body: JSON.stringify({ id: shift.id, action: "close", closingCash: Number(closingCash) || 0 }) });
      setClosed(res);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menutup shift", "error");
    }
    setBusy(false);
  }

  async function reopen(): Promise<void> {
    if (!closed) return;
    setBusy(true);
    try {
      await apiFetch("shifts", { method: "PUT", body: JSON.stringify({ id: closed.id, action: "reopen" }) });
      toast("Shift dibuka lagi", "success");
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal buka lagi shift", "error");
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-6" onClick={closed ? undefined : onClose}>
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        {shift === undefined ? (
          <p className="text-center text-on-surface-variant py-4">Memuat…</p>
        ) : shift === null ? (
          <>
            <h2 className="font-h2 text-h2 text-on-surface">Keluar</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Tak ada shift aktif. Kembali ke daftar user?</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 h-12 rounded-xl border border-outline-variant font-body-md text-body-md font-semibold text-on-surface">Batal</button>
              <button onClick={exitToPicker} className="flex-1 h-12 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-semibold">Keluar</button>
            </div>
          </>
        ) : closed ? (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-primary-container flex items-center justify-center"><Icon name="check" filled className="text-on-primary text-[30px]" /></div>
            <h2 className="font-h2 text-h2 text-on-surface text-center">Shift Ditutup</h2>
            <div className="bg-surface-container-low rounded-xl p-3 space-y-1 text-sm">
              <Row label="Penjualan" value={formatRupiah(closed.totalSales)} />
              <Row label="Kas seharusnya" value={formatRupiah(closed.expectedCash)} />
              <Row label="Kas dihitung" value={formatRupiah(closed.closingCash)} />
              <div className="pt-1 border-t border-outline-variant/40">
                <Row label="Selisih" value={formatRupiah(Number(closed.closingCash) - Number(closed.expectedCash))}
                  className={Number(closed.closingCash) - Number(closed.expectedCash) === 0 ? "text-on-surface" : "text-error"} bold />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={reopen} disabled={busy} className="flex-1 h-12 rounded-xl border border-outline-variant font-body-md text-body-md font-semibold text-on-surface disabled:opacity-50">Buka Lagi</button>
              <button onClick={exitToPicker} className="flex-1 h-12 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-semibold">Keluar</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-h2 text-h2 text-on-surface">Akhiri Shift</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Hitung uang di laci untuk rekonsiliasi kas.</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">Rp</span>
              <input autoFocus inputMode="numeric" value={closingCash}
                onChange={(e) => setClosingCash(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0"
                className="w-full h-14 pl-12 pr-4 rounded-xl border border-outline-variant bg-surface-container-low focus:outline-none focus:border-primary font-body-lg text-body-lg text-right" />
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 h-12 rounded-xl border border-outline-variant font-body-md text-body-md font-semibold text-on-surface">Batal</button>
              <button onClick={doClose} disabled={busy} className="flex-1 h-12 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-semibold disabled:opacity-60">{busy ? "Menutup…" : "Akhiri Shift"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }): JSX.Element {
  return (
    <div className="flex justify-between">
      <span className="text-on-surface-variant">{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${className ?? "text-on-surface"}`}>{value}</span>
    </div>
  );
}
