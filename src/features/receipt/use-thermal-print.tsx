import { useCallback, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Icon, useToast } from "@/components/shared";
import {
  isThermalSupported, listPrinters, getSavedPrinterAddress,
  setSavedPrinterAddress, type BondedPrinter,
} from "@/lib/thermal-printer";

// Sebuah "print job": fungsi yang mencetak ke alamat printer tertentu (atau tersimpan).
export type PrintJob = (address?: string) => Promise<void>;

/**
 * Alur cetak thermal in-app (struk pelanggan & tiket internal). Pilih printer bonded
 * sekali (disimpan), lalu cetak langsung via plugin Bluetooth. Web Serial di web.
 * Jika koneksi gagal, alamat tersimpan dibuang → pilih ulang di percobaan berikutnya.
 */
export function useThermalPrint(): {
  supported: boolean;
  printing: boolean;
  triggerPrint: (job: PrintJob) => Promise<void>;
  picker: JSX.Element | null;
} {
  const toast = useToast();
  const [printing, setPrinting] = useState(false);
  const [devices, setDevices] = useState<BondedPrinter[]>([]);
  const [pending, setPending] = useState<{ job: PrintJob } | null>(null);

  const runJob = useCallback(async (job: PrintJob, address?: string): Promise<void> => {
    setPrinting(true);
    try {
      await job(address);
      toast("Terkirim ke printer", "success");
    } catch (e) {
      setSavedPrinterAddress(null);
      toast(e instanceof Error ? e.message : "Gagal mencetak", "error");
    }
    setPrinting(false);
  }, [toast]);

  const triggerPrint = useCallback(async (job: PrintJob): Promise<void> => {
    // Web: Web Serial punya picker sendiri.
    if (!Capacitor.isNativePlatform()) { await runJob(job); return; }
    // Native: pakai printer tersimpan; kalau belum ada, tampilkan picker.
    if (getSavedPrinterAddress()) { await runJob(job); return; }
    setPrinting(true);
    try {
      const list = await listPrinters();
      setPrinting(false);
      if (!list.length) {
        toast("Belum ada printer terpasang. Pasangkan printer di Setelan Bluetooth HP dulu.", "error");
        return;
      }
      setDevices(list);
      setPending({ job });
    } catch (e) {
      setPrinting(false);
      toast(e instanceof Error ? e.message : "Gagal mengakses Bluetooth", "error");
    }
  }, [runJob, toast]);

  const pick = useCallback(async (address: string): Promise<void> => {
    setSavedPrinterAddress(address);
    const p = pending;
    setPending(null);
    setDevices([]);
    if (p) await runJob(p.job, address);
  }, [pending, runJob]);

  const picker = pending ? (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40"
      onClick={() => { setPending(null); setDevices([]); }}>
      <div className="w-full max-w-md bg-surface-container-lowest rounded-t-[24px] p-5 pb-safe space-y-3"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="font-h2 text-h2 text-on-surface">Pilih Printer</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Printer Bluetooth yang sudah dipasangkan di HP:
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {devices.map((d) => (
            <button key={d.address} onClick={() => pick(d.address)}
              className="w-full flex items-center gap-3 h-14 px-4 rounded-xl border border-outline-variant bg-surface-container-low active:scale-[0.98] transition-transform text-left">
              <Icon name="print" className="text-on-surface-variant" />
              <div className="flex-1 min-w-0">
                <p className="font-body-md text-body-md text-on-surface truncate">{d.name}</p>
                <p className="font-label-caps text-label-caps text-on-surface-variant">{d.address}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return { supported: isThermalSupported(), printing, triggerPrint, picker };
}
