import { type ReactNode, useState } from "react";
import { PageHeader, Icon, FormSheet, Field, inputCls } from "@/components/shared";
import { supabase } from "@/lib/supabase";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";

type Sheet = null | "profile" | "tax" | "payment" | "receipt";

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">{title}</h3>
      <div className="bg-surface-container-lowest rounded-xl shadow-card divide-y divide-outline-variant/30">{children}</div>
    </div>
  );
}
function Row({ icon, label, value, onClick }: { icon: string; label: string; value?: string; onClick?: () => void }): JSX.Element {
  return (
    <button onClick={onClick} className="flex items-center gap-3 px-4 h-14 w-full text-left active:bg-surface-container transition-colors">
      <Icon name={icon} className="text-on-surface-variant" />
      <span className="flex-1 text-sm text-on-surface">{label}</span>
      {value && <span className="text-sm text-on-surface-variant max-w-[50%] truncate text-right">{value}</span>}
      <Icon name="chevron_right" className="text-on-surface-variant opacity-50" />
    </button>
  );
}

const PAY_OPTIONS = [
  { key: "cash", label: "Tunai" },
  { key: "qris", label: "QRIS" },
  { key: "card", label: "Kartu Debit/Kredit" },
  { key: "transfer", label: "Transfer Bank" },
] as const;

export function SettingsPage(): JSX.Element {
  const { data: s } = useSettings();
  const update = useUpdateSettings();
  const [sheet, setSheet] = useState<Sheet>(null);

  const [cafeName, setCafeName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [serviceCharge, setServiceCharge] = useState("");
  const [payMethods, setPayMethods] = useState<string[]>([]);
  const [receiptHeader, setReceiptHeader] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");

  function openSheet(which: Sheet) {
    if (!s) return;
    if (which === "profile") {
      setCafeName(s.cafeName);
      setAddress(s.address ?? "");
      setPhone(s.phone ?? "");
    } else if (which === "tax") {
      setTaxPercent(String(Number(s.taxPercent)));
      setServiceCharge(String(Number(s.serviceChargePercent)));
    } else if (which === "payment") {
      setPayMethods([...(s.enabledPaymentMethods ?? ["cash", "qris"])]);
    } else if (which === "receipt") {
      setReceiptHeader(s.receiptHeader ?? "");
      setReceiptFooter(s.receiptFooter ?? "");
    }
    setSheet(which);
  }

  function togglePayMethod(key: string) {
    setPayMethods((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key],
    );
  }

  async function saveProfile() {
    await update.mutateAsync({ cafeName, address, phone });
    setSheet(null);
  }
  async function saveTax() {
    await update.mutateAsync({ taxPercent: taxPercent, serviceChargePercent: serviceCharge });
    setSheet(null);
  }
  async function savePayment() {
    if (payMethods.length === 0) return;
    await update.mutateAsync({ enabledPaymentMethods: payMethods });
    setSheet(null);
  }
  async function saveReceipt() {
    await update.mutateAsync({ receiptHeader, receiptFooter });
    setSheet(null);
  }

  const methods = (s?.enabledPaymentMethods ?? ["cash", "qris"])
    .map((m) => ({ cash: "Tunai", qris: "QRIS", card: "Kartu", transfer: "Transfer" }[m] ?? m))
    .join(", ");

  return (
    <>
      <PageHeader title="Pengaturan" />
      <div className="px-container space-y-5 pb-8">
        <Section title="Profil Toko">
          <Row icon="storefront" label="Nama & Alamat" value={s?.cafeName ?? "Herbaspace"} onClick={() => openSheet("profile")} />
          <Row icon="call" label="Telepon" value={s?.phone ?? "—"} onClick={() => openSheet("profile")} />
        </Section>
        <Section title="Pajak & Biaya">
          <Row icon="percent" label="Pajak / PB1" value={`${Number(s?.taxPercent ?? 0)}%`} onClick={() => openSheet("tax")} />
          <Row icon="room_service" label="Service Charge" value={`${Number(s?.serviceChargePercent ?? 0)}%`} onClick={() => openSheet("tax")} />
        </Section>
        <Section title="Pembayaran">
          <Row icon="payments" label="Metode Aktif" value={methods} onClick={() => openSheet("payment")} />
        </Section>
        <Section title="Struk">
          <Row icon="receipt_long" label="Header & Footer" onClick={() => openSheet("receipt")} />
        </Section>

        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full h-12 rounded-xl border border-error/40 text-error text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <Icon name="logout" />Keluar
        </button>
      </div>

      {sheet === "profile" && (
        <FormSheet title="Profil Toko" onClose={() => setSheet(null)}>
          <Field label="Nama Toko">
            <input className={inputCls} value={cafeName} onChange={(e) => setCafeName(e.target.value)} />
          </Field>
          <Field label="Alamat">
            <textarea className={`${inputCls} h-20 py-3`} value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field label="Telepon">
            <input className={inputCls} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <button onClick={saveProfile} disabled={update.isPending || !cafeName.trim()}
            className="w-full h-touch bg-primary text-on-primary font-semibold rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform">
            {update.isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </FormSheet>
      )}

      {sheet === "tax" && (
        <FormSheet title="Pajak & Biaya" onClose={() => setSheet(null)}>
          <Field label="Pajak / PB1 (%)">
            <input className={inputCls} type="number" min="0" max="100" step="0.1" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
          </Field>
          <Field label="Service Charge (%)">
            <input className={inputCls} type="number" min="0" max="100" step="0.1" value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)} />
          </Field>
          <button onClick={saveTax} disabled={update.isPending}
            className="w-full h-touch bg-primary text-on-primary font-semibold rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform">
            {update.isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </FormSheet>
      )}

      {sheet === "payment" && (
        <FormSheet title="Metode Pembayaran" onClose={() => setSheet(null)}>
          <div className="space-y-2">
            {PAY_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-center gap-3 px-4 h-12 rounded-lg border border-outline-variant cursor-pointer active:bg-surface-container transition-colors">
                <input
                  type="checkbox"
                  checked={payMethods.includes(opt.key)}
                  onChange={() => togglePayMethod(opt.key)}
                  className="w-5 h-5 accent-primary"
                />
                <span className="text-sm text-on-surface">{opt.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-on-surface-variant">Minimal 1 metode harus aktif.</p>
          <button onClick={savePayment} disabled={update.isPending || payMethods.length === 0}
            className="w-full h-touch bg-primary text-on-primary font-semibold rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform">
            {update.isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </FormSheet>
      )}

      {sheet === "receipt" && (
        <FormSheet title="Struk" onClose={() => setSheet(null)}>
          <Field label="Header Struk">
            <textarea className={`${inputCls} h-20 py-3`} value={receiptHeader} onChange={(e) => setReceiptHeader(e.target.value)}
              placeholder="Terima kasih atas kunjungan Anda!" />
          </Field>
          <Field label="Footer Struk">
            <textarea className={`${inputCls} h-20 py-3`} value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="Barang yang sudah dibeli tidak dapat dikembalikan." />
          </Field>
          <button onClick={saveReceipt} disabled={update.isPending}
            className="w-full h-touch bg-primary text-on-primary font-semibold rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform">
            {update.isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </FormSheet>
      )}
    </>
  );
}
