import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { formatRupiah } from "@/lib/utils";

interface SharedReceiptData {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  receiptHeader: string;
  receiptFooter: string;
  transaction: {
    number: string;
    subtotal: string;
    discount: string;
    taxAmount: string;
    total: string;
    createdAt: string;
    customer: { name: string } | null;
    cashier: { fullName: string } | null;
    items: { productName: string; quantity: number; unitPrice: string; lineTotal: string }[];
    payments: { method: string; amount: string; amountReceived: string | null; changeAmount: string | null }[];
  };
  expiresAt: string;
}

const METHOD_LABEL: Record<string, string> = { cash: "Tunai", qris: "QRIS", card: "Kartu", transfer: "Transfer" };

export function SharedReceiptPage(): JSX.Element {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedReceiptData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/share-receipt?token=${token}`)
      .then(async (r) => {
        if (r.status === 410) { setError("Link struk sudah kedaluwarsa (lebih dari 24 jam)."); return; }
        if (!r.ok) { setError("Struk tidak ditemukan."); return; }
        setData(await r.json());
      })
      .catch(() => setError("Gagal memuat struk."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-low">
      <div className="animate-pulse text-on-surface-variant">Memuat struk...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container-low px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-error text-[32px]">error</span>
      </div>
      <h1 className="text-xl font-bold text-on-surface mb-2">Tidak Tersedia</h1>
      <p className="text-on-surface-variant">{error}</p>
    </div>
  );

  if (!data) return <></>;

  const tx = data.transaction;
  const discount = Number(tx.discount);
  const date = new Date(tx.createdAt).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-surface-container-low flex justify-center py-6 px-4">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-on-primary px-5 py-4 text-center">
          <h1 className="text-lg font-bold">{data.storeName}</h1>
          {data.storeAddress && <p className="text-on-primary/70 text-sm mt-0.5">{data.storeAddress}</p>}
          {data.storePhone && <p className="text-on-primary/70 text-sm">{data.storePhone}</p>}
          {data.receiptHeader && <p className="text-on-primary/60 text-xs mt-1">{data.receiptHeader}</p>}
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Meta */}
          <div className="flex justify-between text-sm text-on-surface-variant">
            <span>{tx.number}</span>
            <span>{date}</span>
          </div>
          {tx.customer && <p className="text-sm text-on-surface-variant">Pelanggan: {tx.customer.name}</p>}

          {/* Items */}
          <div className="space-y-2">
            {tx.items.map((it, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <span className="text-on-surface">{it.productName}</span>
                  <span className="text-on-surface-variant/60 ml-1">{it.quantity}x {formatRupiah(it.unitPrice)}</span>
                </div>
                <span className="text-on-surface font-medium">{formatRupiah(it.lineTotal)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-outline-variant/30 pt-3 space-y-1 text-sm">
            <Row label="Subtotal" value={formatRupiah(tx.subtotal)} />
            {discount > 0 && <Row label="Diskon" value={`-${formatRupiah(discount)}`} className="text-error" />}
            {Number(tx.taxAmount) > 0 && <Row label="Pajak" value={formatRupiah(tx.taxAmount)} />}
            <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30 text-base font-bold text-on-surface">
              <span>Total</span>
              <span className="text-primary">{formatRupiah(tx.total)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="text-sm text-on-surface-variant">
            {tx.payments.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span>{METHOD_LABEL[p.method] ?? p.method}</span>
                <span>{formatRupiah(p.amount)}</span>
              </div>
            ))}
            {tx.payments[0]?.amountReceived && Number(tx.payments[0].amountReceived) > 0 && (
              <>
                <Row label="Dibayar" value={formatRupiah(tx.payments[0].amountReceived)} />
                <Row label="Kembalian" value={formatRupiah(tx.payments[0].changeAmount ?? "0")} />
              </>
            )}
          </div>

          {tx.cashier && <p className="text-xs text-on-surface-variant/60 text-center">Kasir: {tx.cashier.fullName}</p>}
        </div>

        {/* Footer */}
        <div className="bg-surface-container-low px-5 py-3 text-center text-xs text-on-surface-variant/60 border-t border-outline-variant/30">
          {data.receiptFooter ? <p>{data.receiptFooter}</p> : <p>Terima kasih atas kunjungan Anda!</p>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }): JSX.Element {
  return (
    <div className="flex justify-between">
      <span className="text-on-surface-variant">{label}</span>
      <span className={className ?? "text-on-surface"}>{value}</span>
    </div>
  );
}
