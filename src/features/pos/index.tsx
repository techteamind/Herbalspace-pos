import { useMemo, useState } from "react";
import { PageHeader, Icon, ListSkeleton, ErrorState } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useProducts } from "@/hooks/use-products";
import { useSettings } from "@/hooks/use-settings";
import { PaymentSheet, type CartLine } from "./payment-sheet";
import { printReceipt, type Receipt } from "@/lib/receipt";

export function PosPage(): JSX.Element {
  const { data: products, isLoading, isError, error } = useProducts();
  const { data: settings } = useSettings();
  const [activeCat, setActiveCat] = useState("Semua");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showPayment, setShowPayment] = useState(false);
  const [success, setSuccess] = useState<Receipt | null>(null);

  const active = (products ?? []).filter((p) => p.isActive);
  const categories = useMemo(() => {
    const set = new Set<string>();
    active.forEach((p) => { if (p.category) set.add(p.category.name); });
    return ["Semua", ...set];
  }, [active]);

  const visible = active.filter((p) =>
    (activeCat === "Semua" || p.category?.name === activeCat) &&
    p.name.toLowerCase().includes(search.toLowerCase()));

  const lines: CartLine[] = Object.entries(cart)
    .map(([id, qty]) => { const product = active.find((p) => p.id === id); return product ? { product, qty } : null; })
    .filter((x): x is CartLine => x !== null);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + Number(l.product.price) * l.qty, 0);

  const addItem = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const changeQty = (id: string, delta: number) => setCart((c) => {
    const next = (c[id] ?? 0) + delta;
    const copy = { ...c };
    if (next <= 0) delete copy[id]; else copy[id] = next;
    return copy;
  });

  function onSuccess(data: { number: string; subtotal: number; tax: number; total: number; method: string; received?: number; change?: number; lines: { name: string; qty: number; price: number }[] }): void {
    setShowPayment(false);
    setCart({});
    setSuccess({
      ...data,
      cafeName: settings?.cafeName ?? "Herbaspace",
      datetime: new Date().toLocaleString("id-ID"),
    });
  }

  return (
    <>
      <PageHeader title="Kasir" rightIcon="qr_code_scanner" />
      <div className="px-container-padding py-2 space-y-3 bg-surface sticky top-20 z-30">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-touch-target-min pl-10 pr-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-body-md" placeholder="Cari produk..." />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {categories.map((c) => (
            <button key={c} onClick={() => setActiveCat(c)}
              className={`h-8 px-4 rounded-full font-label-caps text-label-caps whitespace-nowrap shrink-0 ${activeCat === c ? "bg-primary-container text-on-primary-container shadow-card" : "bg-surface-container text-on-surface-variant border border-outline-variant"}`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="px-container-padding mt-1">
        {isLoading && <ListSkeleton rows={4} />}
        {isError && <ErrorState message={error instanceof Error ? error.message : "Gagal memuat produk"} />}
        {!isLoading && !isError && (
          <div className="grid grid-cols-2 gap-3">
            {visible.map((p) => (
              <button key={p.id} onClick={() => addItem(p.id)}
                className="bg-surface-container-lowest rounded-xl shadow-card border border-transparent active:scale-[0.97] transition-transform text-left overflow-hidden relative">
                {cart[p.id] && <span className="absolute top-2 right-2 z-10 bg-primary text-on-primary w-6 h-6 rounded-full flex items-center justify-center font-label-caps text-label-caps">{cart[p.id]}</span>}
                <div className="aspect-square bg-surface-container flex items-center justify-center overflow-hidden">
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : <Icon name="local_cafe" className="text-[40px] text-outline" />}
                </div>
                <div className="p-3">
                  <h3 className="font-body-md text-body-md font-semibold text-on-surface leading-tight">{p.name}</h3>
                  <p className="font-body-lg text-body-lg font-bold text-primary mt-1">{formatRupiah(p.price)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {count > 0 && !showPayment && (
        <div className="fixed bottom-0 left-0 w-full max-w-md mx-auto z-50 px-container-padding pb-safe pt-2 bg-gradient-to-t from-background via-background to-transparent" style={{ left: "50%", transform: "translateX(-50%)" }}>
          <button onClick={() => setShowPayment(true)}
            className="w-full bg-secondary-container text-on-secondary-container rounded-xl h-14 flex items-center justify-between px-4 shadow-card active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3"><Icon name="shopping_cart" filled /><span className="font-body-lg text-body-lg font-semibold">{count} Item</span></div>
            <div className="flex items-center gap-2"><span className="font-body-lg text-body-lg font-bold">{formatRupiah(total)}</span><Icon name="arrow_forward" /></div>
          </button>
        </div>
      )}

      {showPayment && (
        <PaymentSheet lines={lines} taxPercent={Number(settings?.taxPercent ?? 0)}
          onClose={() => setShowPayment(false)} onSuccess={onSuccess} onQty={changeQty} />
      )}

      {success && <SuccessOverlay receipt={success} onNew={() => setSuccess(null)} />}
    </>
  );
}

function SuccessOverlay({ receipt, onNew }: { receipt: Receipt; onNew: () => void }): JSX.Element {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background px-6 max-w-md mx-auto">
      <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center mb-4">
        <Icon name="check" filled className="text-on-primary text-[44px]" />
      </div>
      <h2 className="font-h1 text-h1 text-on-surface">Pembayaran Berhasil</h2>
      <p className="font-body-md text-body-md text-on-surface-variant mt-1">{receipt.number}</p>
      <p className="font-display-price-mobile text-display-price-mobile text-primary mt-4">{formatRupiah(receipt.total)}</p>
      <div className="w-full grid grid-cols-2 gap-3 mt-8">
        <button onClick={() => printReceipt(receipt)} className="h-12 rounded-xl border border-outline-variant bg-surface-container-lowest font-body-md text-body-md font-semibold text-on-surface flex items-center justify-center gap-2">
          <Icon name="print" />Cetak Struk
        </button>
        <button onClick={onNew} className="h-12 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-semibold">Transaksi Baru</button>
      </div>
    </div>
  );
}
