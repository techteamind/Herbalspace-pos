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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse text-gray-400">Memuat struk...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-red-500 text-[32px]">error</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Tidak Tersedia</h1>
      <p className="text-gray-500">{error}</p>
    </div>
  );

  if (!data) return <></>;

  const tx = data.transaction;
  const discount = Number(tx.discount);
  const date = new Date(tx.createdAt).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-6 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-green-800 text-white px-5 py-4 text-center">
          <h1 className="text-lg font-bold">{data.storeName}</h1>
          {data.storeAddress && <p className="text-green-200 text-sm mt-0.5">{data.storeAddress}</p>}
          {data.storePhone && <p className="text-green-200 text-sm">{data.storePhone}</p>}
          {data.receiptHeader && <p className="text-green-100 text-xs mt-1">{data.receiptHeader}</p>}
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Meta */}
          <div className="flex justify-between text-sm text-gray-500">
            <span>{tx.number}</span>
            <span>{date}</span>
          </div>
          {tx.customer && <p className="text-sm text-gray-600">Pelanggan: {tx.customer.name}</p>}

          {/* Items */}
          <div className="space-y-2">
            {tx.items.map((it, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <span className="text-gray-900">{it.productName}</span>
                  <span className="text-gray-400 ml-1">{it.quantity}x {formatRupiah(it.unitPrice)}</span>
                </div>
                <span className="text-gray-900 font-medium">{formatRupiah(it.lineTotal)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t pt-3 space-y-1 text-sm">
            <Row label="Subtotal" value={formatRupiah(tx.subtotal)} />
            {discount > 0 && <Row label="Diskon" value={`-${formatRupiah(discount)}`} className="text-red-500" />}
            {Number(tx.taxAmount) > 0 && <Row label="Pajak" value={formatRupiah(tx.taxAmount)} />}
            <div className="flex justify-between items-center pt-2 border-t text-base font-bold text-gray-900">
              <span>Total</span>
              <span className="text-green-700">{formatRupiah(tx.total)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="text-sm text-gray-500">
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

          {tx.cashier && <p className="text-xs text-gray-400 text-center">Kasir: {tx.cashier.fullName}</p>}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-5 py-3 text-center text-xs text-gray-400 border-t">
          {data.receiptFooter ? <p>{data.receiptFooter}</p> : <p>Terima kasih atas kunjungan Anda!</p>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }): JSX.Element {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={className ?? "text-gray-900"}>{value}</span>
    </div>
  );
}
