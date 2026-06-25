import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { printReceipt } from "@/lib/receipt";
import { useSettings } from "@/hooks/use-settings";
import { useVoidTransaction } from "@/hooks/use-transactions";
import { useAuth } from "@/contexts/AuthContext";
import { useOutlets } from "@/hooks/use-outlets";
import { apiFetch } from "@/lib/api-client";
import type { TransactionWithItems } from "@/types";

const METHOD_LABEL: Record<string, string> = { cash: "Tunai", qris: "QRIS", card: "Kartu", transfer: "Transfer" };

interface Props {
  txn: TransactionWithItems;
  onClose: () => void;
}

export function TransactionDetail({ txn, onClose }: Props): JSX.Element {
  const { data: settings } = useSettings();
  const voidMutation = useVoidTransaction();
  const { role, outletId } = useAuth();
  const { data: outlets } = useOutlets();
  const outletName = (outlets ?? []).find((o) => o.id === (txn.outletId ?? outletId))?.name;
  const canVoid = role === "owner" || role === "manager";
  const [sharing, setSharing] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const subtotal = Number(txn.subtotal);
  const discount = Number(txn.discount);
  const tax = Number(txn.taxAmount);
  const payment = txn.payments[0];
  const isVoid = txn.status === "void";

  function handlePrint(): void {
    printReceipt({
      transactionId: txn.id,
      number: txn.number,
      storeName: settings?.storeName ?? "Herbaspace",
      outletName,
      datetime: new Date(txn.createdAt).toLocaleString("id-ID"),
      lines: txn.items.map((i) => ({ name: i.productName, qty: i.quantity, price: Number(i.unitPrice) })),
      subtotal,
      discount: discount || undefined,
      tax,
      total: Number(txn.total),
      method: payment?.method ?? "cash",
      received: payment?.amountReceived ? Number(payment.amountReceived) : undefined,
      change: payment?.changeAmount ? Number(payment.changeAmount) : undefined,
      customerName: txn.customer?.name,
    });
  }

  async function shareWA(): Promise<void> {
    setSharing(true);
    try {
      const res = await apiFetch("share-receipt", { method: "POST", body: JSON.stringify({ transactionId: txn.id }) }) as { token: string };
      const link = `${window.location.origin}/receipt/${res.token}`;
      const text = `Struk ${txn.number}\nTotal: ${formatRupiah(txn.total)}\n\nLihat struk: ${link}\n(Link berlaku 24 jam)`;
      const phone = txn.customer?.phone?.replace(/[^0-9]/g, "").replace(/^0/, "62") ?? "";
      const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
    } catch { /* ignore */ }
    setSharing(false);
  }

  async function handleVoid(): Promise<void> {
    await voidMutation.mutateAsync({ id: txn.id, reason: voidReason || undefined });
    onClose();
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      initial={{ backgroundColor: "rgba(0,0,0,0)" }}
      animate={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      exit={{ backgroundColor: "rgba(0,0,0,0)" }}
      transition={{ duration: 0.2 }}
      onClick={onClose}>
      <motion.div
        className="w-full max-w-3xl bg-surface-container-lowest rounded-t-[24px] p-5 pb-safe space-y-4 max-h-[90vh] overflow-y-auto"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="font-h2 text-h2 text-on-surface">Detail Transaksi</h2>
          <button onClick={onClose} className="text-on-surface-variant"><Icon name="close" /></button>
        </div>

        {isVoid && (
          <div className="bg-error-container/40 border border-error/30 rounded-xl p-3 flex items-center gap-2">
            <Icon name="block" className="text-error" />
            <span className="font-body-md text-body-md text-error font-semibold">Transaksi ini sudah di-void</span>
          </div>
        )}

        <div className="bg-surface-container rounded-xl p-3 space-y-1">
          <Row label="No. Transaksi" value={txn.number} />
          <Row label="Tanggal" value={new Date(txn.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
          <Row label="Kasir" value={txn.cashier?.fullName ?? "-"} />
          <Row label="Pelanggan" value={txn.customer?.name ?? "Umum"} />
          <Row label="Status" value={txn.status === "paid" ? "Lunas" : txn.status === "void" ? "Void" : "Pending"} />
        </div>

        <div className="space-y-2">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Item</p>
          {txn.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <p className="font-body-md text-body-md text-on-surface">{item.productName}</p>
                <p className="font-label-caps text-label-caps text-on-surface-variant">{item.quantity}x {formatRupiah(item.unitPrice)}</p>
              </div>
              <span className="font-body-md text-body-md font-semibold text-on-surface">{formatRupiah(item.lineTotal)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-outline-variant/40 pt-3 space-y-1">
          <Row label="Subtotal" value={formatRupiah(subtotal)} />
          {discount > 0 && <Row label="Diskon" value={`-${formatRupiah(discount)}`} valueClass="text-error" />}
          {tax > 0 && <Row label="Pajak" value={formatRupiah(tax)} />}
          <div className="flex justify-between items-center pt-1">
            <span className="font-body-lg text-body-lg font-semibold text-on-surface">Total</span>
            <span className={`font-h2 text-h2 ${isVoid ? "text-error line-through" : "text-primary"}`}>{formatRupiah(txn.total)}</span>
          </div>
          {payment && (
            <>
              <Row label={`Bayar (${METHOD_LABEL[payment.method] ?? payment.method})`} value={formatRupiah(payment.amountReceived ?? payment.amount)} />
              {Number(payment.changeAmount ?? 0) > 0 && <Row label="Kembalian" value={formatRupiah(payment.changeAmount!)} />}
            </>
          )}
        </div>

        {!isVoid && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handlePrint}
              className="h-12 rounded-xl border border-outline-variant bg-surface-container-lowest font-body-md text-body-md font-semibold text-on-surface flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <Icon name="print" />Cetak Struk
            </button>
            <button onClick={shareWA} disabled={sharing}
              className="h-12 rounded-xl bg-[#25D366] text-white font-body-md text-body-md font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
              <Icon name="share" />{sharing ? "..." : "WhatsApp"}
            </button>
          </div>
        )}

        {!isVoid && !showVoidConfirm && canVoid && (
          <button onClick={() => setShowVoidConfirm(true)}
            className="w-full h-12 rounded-xl border border-error/40 text-error font-body-md text-body-md font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            <Icon name="block" />Void Transaksi
          </button>
        )}

        {showVoidConfirm && (
          <div className="bg-error-container/20 border border-error/30 rounded-xl p-4 space-y-3">
            <p className="font-body-md text-body-md text-error font-semibold">Yakin void transaksi ini?</p>
            <p className="font-label-caps text-label-caps text-on-surface-variant">Stok bahan baku akan dikembalikan. Tindakan ini tidak bisa dibatalkan.</p>
            <input value={voidReason} onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Alasan void (opsional)"
              className="w-full h-12 px-3 rounded-xl border border-error/30 bg-surface-container-lowest focus:outline-none focus:border-error font-body-md text-body-md" />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowVoidConfirm(false)}
                className="h-12 rounded-xl border border-outline-variant font-body-md text-body-md font-semibold text-on-surface-variant">
                Batal
              </button>
              <button onClick={handleVoid} disabled={voidMutation.isPending}
                className="h-12 rounded-xl bg-error text-on-error font-body-md text-body-md font-semibold disabled:opacity-50">
                {voidMutation.isPending ? "Proses..." : "Ya, Void"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }): JSX.Element {
  return (
    <div className="flex justify-between items-center">
      <span className="font-body-md text-body-md text-on-surface-variant">{label}</span>
      <span className={`font-body-md text-body-md ${valueClass ?? "text-on-surface"}`}>{value}</span>
    </div>
  );
}
