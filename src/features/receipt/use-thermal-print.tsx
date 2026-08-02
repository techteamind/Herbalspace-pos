import { useCallback, useState } from "react";
import { Icon, useToast } from "@/components/shared";
import {
  isThermalSupported, listBondedPrinters, getSavedPrinterAddress,
  setSavedPrinterAddress, printThermal, type ThermalReceiptData, type BondedPrinter,
} from "@/lib/thermal-printer";

/**
 * Alur cetak thermal yang dipakai bersama (POS success + detail transaksi):
 * pilih printer sekali (disimpan), lalu cetak. Jika koneksi gagal, alamat tersimpan
 * dibuang supaya pemakaian berikutnya memilih ulang.
 */
export function useThermalPrint(): {
  supported: boolean;
  printing: boolean;
  triggerPrint: (data: ThermalReceiptData) => Promise<void>;
  picker: JSX.Element | null;
} {
  const toast = useToast();
  const [printing, setPrinting] = useState(false);
  const [devices, setDevices] = useState<BondedPrinter[]>([]);
  const [pending, setPending] = useState<ThermalReceiptData | null>(null);

  const doPrint = useCallback(async (data: ThermalReceiptData, address?: string): Promise<void> => {
    setPrinting(true);
    try {
      await printThermal(data, address);
      toast("Struk tercetak", "success");
    } catch (e) {
      setSavedPrinterAddress(null); // paksa pilih ulang printer di percobaan berikutnya
      toast(e instanceof Error ? e.message : "Gagal mencetak struk", "error");
    }
    setPrinting(false);
  }, [toast]);

  const triggerPrint = useCallback(async (data: ThermalReceiptData): Promise<void> => {
    if (getSavedPrinterAddress()) { await doPrint(data); return; }
    setPrinting(true);
    try {
      const list = await listBondedPrinters();
      setPrinting(false);
      if (!list.length) {
        toast("Belum ada printer terpasang. Pasangkan printer di Pengaturan Bluetooth HP dulu.", "error");
        return;
      }
      setDevices(list);
      setPending(data);
    } catch (e) {
      setPrinting(false);
      toast(e instanceof Error ? e.message : "Gagal mengakses Bluetooth", "error");
    }
  }, [doPrint, toast]);

  const pick = useCallback(async (address: string): Promise<void> => {
    setSavedPrinterAddress(address);
    const data = pending;
    setPending(null);
    setDevices([]);
    if (data) await doPrint(data, address);
  }, [pending, doPrint]);

  const picker = pending ? (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40"
      onClick={() => { setPending(null); setDevices([]); }}>
      <div className="w-full max-w-md bg-surface-container-lowest rounded-t-[24px] p-5 pb-safe space-y-3"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="font-h2 text-h2 text-on-surface">Pilih Printer</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Printer thermal yang sudah dipasangkan di HP:
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
