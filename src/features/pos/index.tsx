import { useCallback, useMemo, useState } from "react";
import { PageHeader, Icon, ListSkeleton, ErrorState } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useProducts } from "@/hooks/use-products";
import { useSettings } from "@/hooks/use-settings";
import { useOutlets } from "@/hooks/use-outlets";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentSheet, type CartLine } from "./payment-sheet";
import { BarcodeScanner } from "./barcode-scanner";
import { printReceipt, type Receipt } from "@/lib/receipt";
import { apiFetch } from "@/lib/api-client";
import { printThermal, isThermalSupported } from "@/lib/thermal-printer";
import { haptic, hapticSuccess } from "@/lib/haptic";
import type { ProductWithCategory, ProductVariant } from "@/types";

function getFavKey(outletId: string): string {
  return `pos_favorites_${outletId}`;
}

function loadFavorites(outletId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(getFavKey(outletId)) || "[]");
  } catch { return []; }
}

function saveFavorites(outletId: string, ids: string[]): void {
  localStorage.setItem(getFavKey(outletId), JSON.stringify(ids));
}

export function PosPage(): JSX.Element {
  const { data: products, isLoading, isError, error } = useProducts();
  const { data: settings } = useSettings();
  const { outletId } = useAuth();
  const { data: outlets } = useOutlets();
  const activeOutlet = (outlets ?? []).find((o) => o.id === outletId);
  const [activeCat, setActiveCat] = useState("Semua");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, { qty: number; product: ProductWithCategory; variantId?: string; variantLabel?: string; variantPrice?: number; note?: string; modifiers?: { name: string; price: number }[] }>>({});
  const [showPayment, setShowPayment] = useState(false);
  const [success, setSuccess] = useState<Receipt | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [variantPicker, setVariantPicker] = useState<ProductWithCategory | null>(null);
  const [favIds, setFavIds] = useState<string[]>(() => loadFavorites(outletId ?? ""));

  const toggleFavorite = useCallback((productId: string) => {
    setFavIds((prev) => {
      const next = prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId];
      saveFavorites(outletId ?? "", next);
      return next;
    });
    haptic();
  }, [outletId]);

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
    .map(([_, item]) => ({ product: item.product, qty: item.qty, variantId: item.variantId, variantLabel: item.variantLabel, variantPrice: item.variantPrice, note: item.note, modifiers: item.modifiers }));
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => {
    const base = (l.variantPrice ?? Number(l.product.price));
    const modTotal = (l.modifiers ?? []).reduce((m, mod) => m + mod.price, 0);
    return s + (base + modTotal) * l.qty;
  }, 0);

  function addItem(product: ProductWithCategory, variant?: ProductVariant, mods?: { name: string; price: number }[]): void {
    haptic();
    const modKey = mods?.length ? `:m${mods.map((m) => m.name).sort().join(",")}` : "";
    const key = (variant ? `${product.id}:${variant.id}` : product.id) + modKey;
    setCart((c) => ({
      ...c,
      [key]: {
        qty: (c[key]?.qty ?? 0) + 1,
        product,
        variantId: variant?.id,
        variantLabel: variant?.label,
        variantPrice: variant ? Number(variant.price) : undefined,
        modifiers: mods?.length ? mods : undefined,
      },
    }));
  }

  function handleProductTap(product: ProductWithCategory): void {
    const hasVariants = (product.variants?.length ?? 0) > 0;
    const hasModifiers = (product.modifiers?.length ?? 0) > 0;
    if (hasVariants || hasModifiers) {
      setVariantPicker(product);
    } else {
      addItem(product);
    }
  }

  function handleBarcodeScan(code: string): void {
    setShowScanner(false);
    const match = active.find((p) => p.sku?.toLowerCase() === code.toLowerCase());
    if (match) handleProductTap(match);
    else setSearch(code);
  }
  const changeNote = useCallback((id: string, note: string) => setCart((c) => {
    const existing = c[id];
    if (!existing) return c;
    return { ...c, [id]: { ...existing, note } };
  }), []);

  const changeQty = (id: string, delta: number) => setCart((c) => {
    const existing = c[id];
    if (!existing) return c;
    const next = existing.qty + delta;
    const copy = { ...c };
    if (next <= 0) delete copy[id]; else copy[id] = { ...existing, qty: next };
    return copy;
  });

  function onSuccess(data: { transactionId: string; number: string; subtotal: number; discount: number; tax: number; total: number; method: string; received?: number; change?: number; customerName?: string; customerPhone?: string; lines: { name: string; qty: number; price: number }[] }): void {
    hapticSuccess();
    setShowPayment(false);
    setCart({});
    setSuccess({
      ...data,
      cafeName: settings?.cafeName ?? "Herbaspace",
      outletName: activeOutlet?.name,
      address: activeOutlet?.address ?? settings?.address ?? undefined,
      phone: activeOutlet?.phone ?? settings?.phone ?? undefined,
      receiptHeader: activeOutlet?.receiptHeader ?? settings?.receiptHeader ?? undefined,
      receiptFooter: activeOutlet?.receiptFooter ?? settings?.receiptFooter ?? undefined,
      datetime: new Date().toLocaleString("id-ID"),
    });
  }

  return (
    <>
      <PageHeader title="Kasir" />
      <div className="px-container-padding py-2 space-y-2.5 backdrop-blur-xl bg-background/80 sticky top-14 z-30">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-touch-target-min pl-11 pr-4 rounded-2xl bg-surface-container-low border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 transition-all" placeholder="Cari produk..." />
          </div>
          <button onClick={() => setShowScanner(true)}
            className="h-touch-target-min w-12 rounded-2xl bg-surface-container-low flex items-center justify-center shrink-0 active:scale-90 transition-transform">
            <Icon name="qr_code_scanner" className="text-on-surface-variant" />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {categories.map((c) => (
            <button key={c} onClick={() => setActiveCat(c)}
              className={`h-8 px-4 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap shrink-0 transition-all ${activeCat === c ? "bg-primary text-on-primary shadow-elevation-1" : "bg-surface-container-low text-on-surface-variant"}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Favorites quick access */}
      {favIds.length > 0 && !isLoading && (
        <div className="px-container-padding mt-1">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Icon name="star" filled className="text-[14px] text-amber-500" /> Favorit
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {favIds.map((fid) => {
              const p = active.find((pr) => pr.id === fid);
              if (!p) return null;
              const hasVariants = (p.variants?.length ?? 0) > 0;
              return (
                <button key={fid} onClick={() => handleProductTap(p)}
                  className="shrink-0 w-[100px] bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-elevation-1 active:scale-95 transition-transform text-left overflow-hidden">
                  <div className="aspect-square bg-surface-container flex items-center justify-center overflow-hidden">
                    {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : <Icon name="local_cafe" className="text-[24px] text-outline" />}
                  </div>
                  <div className="px-1.5 py-1">
                    <p className="font-body-md text-[11px] font-semibold text-on-surface leading-tight line-clamp-1">{p.name}</p>
                    <p className="font-body-md text-[10px] font-bold text-primary">{hasVariants ? `${formatRupiah(Math.min(...p.variants!.map((v) => Number(v.price))))}+` : formatRupiah(p.price)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-container-padding mt-1">
        {isLoading && <ListSkeleton rows={6} variant="grid" />}
        {isError && <ErrorState message={error instanceof Error ? error.message : "Gagal memuat produk"} />}
        {!isLoading && !isError && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {visible.map((p) => {
              const cartQty = Object.entries(cart)
                .filter(([key]) => key === p.id || key.startsWith(`${p.id}:`))
                .reduce((s, [, item]) => s + item.qty, 0);
              const hasVariants = (p.variants?.length ?? 0) > 0;
              const priceRange = hasVariants && p.variants!.length > 0
                ? { min: Math.min(...p.variants!.map((v) => Number(v.price))), max: Math.max(...p.variants!.map((v) => Number(v.price))) }
                : null;
              const isFav = favIds.includes(p.id);
              return (
                <div key={p.id} className="relative">
                  <button onClick={() => handleProductTap(p)}
                    className="w-full bg-surface-container-lowest rounded-xl shadow-elevation-1 border border-outline-variant/20 active:scale-[0.97] transition-transform text-left overflow-hidden">
                    {cartQty > 0 && <span className="absolute top-1.5 right-1.5 z-10 bg-primary text-on-primary w-6 h-6 rounded-full flex items-center justify-center font-label-caps text-label-caps shadow-elevation-2">{cartQty}</span>}
                    {hasVariants && <span className="absolute top-1.5 left-1.5 z-10 bg-secondary-container text-on-secondary-container px-2 h-5 rounded-full flex items-center font-label-caps text-[9px] shadow-elevation-1">{p.variants!.length} varian</span>}
                    <div className="aspect-[4/3] bg-surface-container flex items-center justify-center overflow-hidden">
                      {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : <Icon name="local_cafe" className="text-[36px] text-outline" />}
                    </div>
                    <div className="px-2.5 py-2">
                      <h3 className="font-body-md text-body-md font-semibold text-on-surface leading-tight line-clamp-2 text-[13px]">{p.name}</h3>
                      <p className="font-body-md text-body-md font-bold text-primary mt-0.5">
                        {priceRange ? `${formatRupiah(priceRange.min)}${priceRange.min !== priceRange.max ? ` - ${formatRupiah(priceRange.max)}` : ""}` : formatRupiah(p.price)}
                      </p>
                    </div>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                    className="absolute bottom-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center bg-surface-container/80 backdrop-blur-sm">
                    <Icon name="star" filled={isFav} className={`text-[18px] ${isFav ? "text-amber-500" : "text-on-surface-variant/40"}`} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {count > 0 && !showPayment && (
        <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 w-full max-w-3xl z-50 px-5">
          <button onClick={() => setShowPayment(true)}
            className="w-full bg-primary text-on-primary rounded-2xl h-14 flex items-center justify-between px-5 shadow-elevation-3 active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3"><Icon name="shopping_cart" filled /><span className="text-[14px] font-semibold">{count} Item</span></div>
            <div className="flex items-center gap-2"><span className="text-[14px] font-bold">{formatRupiah(total)}</span><Icon name="arrow_forward" /></div>
          </button>
        </div>
      )}

      {showPayment && (
        <PaymentSheet lines={lines} taxPercent={Number(settings?.taxPercent ?? 0)}
          onClose={() => setShowPayment(false)} onSuccess={onSuccess} onQty={changeQty} onNote={changeNote} />
      )}

      {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}
      {variantPicker && (
        <VariantPickerSheet
          product={variantPicker}
          onSelect={(variant, mods) => { addItem(variantPicker, variant, mods); setVariantPicker(null); }}
          onClose={() => setVariantPicker(null)}
        />
      )}
      {success && <SuccessOverlay receipt={success} onNew={() => setSuccess(null)} />}
    </>
  );
}

function VariantPickerSheet({ product, onSelect, onClose }: { product: ProductWithCategory; onSelect: (variant?: ProductVariant, mods?: { name: string; price: number }[]) => void; onClose: () => void }): JSX.Element {
  const variants = product.variants ?? [];
  const groups = product.variantGroups ?? [];
  const modifierGroups = (product.modifiers ?? []).map((m) => m.modifierGroup);
  const hasVariants = variants.length > 0;
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [selectedMods, setSelectedMods] = useState<Record<string, Set<string>>>({});

  const activeSelections = Object.values(selected).filter(Boolean);
  const filtered = variants.filter((v) => {
    const ids = v.optionIds as string[];
    return activeSelections.every((optId) => ids.includes(optId));
  });

  const matchedVariant = filtered.length === 1 ? filtered[0] : null;

  function toggleMod(groupId: string, optId: string, maxSelect: number) {
    setSelectedMods((prev) => {
      const cur = new Set(prev[groupId] ?? []);
      if (cur.has(optId)) { cur.delete(optId); } else {
        if (cur.size >= maxSelect) { const first = cur.values().next().value; if (first) cur.delete(first); }
        cur.add(optId);
      }
      return { ...prev, [groupId]: cur };
    });
  }

  function getSelectedModifiers(): { name: string; price: number }[] {
    const result: { name: string; price: number }[] = [];
    for (const mg of modifierGroups) {
      const sel = selectedMods[mg.id];
      if (!sel) continue;
      for (const opt of mg.options) {
        if (sel.has(opt.id)) result.push({ name: opt.name, price: Number(opt.price) });
      }
    }
    return result;
  }

  const modTotal = getSelectedModifiers().reduce((s, m) => s + m.price, 0);
  const basePrice = matchedVariant ? Number(matchedVariant.price) : Number(product.price);

  return (
    <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 max-w-3xl mx-auto bg-surface-container-lowest rounded-t-3xl p-5 pb-8 space-y-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-1 rounded-full bg-outline-variant/50" />
          <div className="flex items-center justify-between w-full">
            <h3 className="text-[17px] font-semibold text-on-surface">{product.name}</h3>
            <button onClick={onClose} className="p-1 text-on-surface-variant active:scale-90 transition-transform">
              <Icon name="close" />
            </button>
          </div>
        </div>

        {groups.map((g) => (
          <div key={g.id}>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-2">{g.name}</p>
            <div className="flex flex-wrap gap-2">
              {g.options.map((opt) => (
                <button key={opt.id} onClick={() => setSelected((s) => ({ ...s, [g.id]: s[g.id] === opt.id ? "" : opt.id }))}
                  className={`h-9 px-4 rounded-full font-body-md text-body-md transition-colors ${selected[g.id] === opt.id ? "bg-primary text-on-primary shadow-card" : "bg-surface-container text-on-surface-variant border border-outline-variant"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {groups.length === 0 && hasVariants && (
          <div className="space-y-2">
            {variants.map((v) => (
              <button key={v.id} onClick={() => onSelect(v, getSelectedModifiers().length ? getSelectedModifiers() : undefined)}
                className="w-full flex items-center justify-between bg-surface-container-lowest rounded-xl px-4 h-14 border border-outline-variant/30 active:scale-[0.98] transition-transform">
                <span className="font-body-md text-body-md font-semibold text-on-surface">{v.label}</span>
                <span className="font-body-md text-body-md font-bold text-primary">{formatRupiah(v.price)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Modifier groups */}
        {modifierGroups.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-outline-variant/30">
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
              <Icon name="add_circle" className="text-[14px]" /> Add-ons
            </p>
            {modifierGroups.map((mg) => (
              <div key={mg.id}>
                <p className="font-body-md text-body-md font-semibold text-on-surface mb-1.5">
                  {mg.name}
                  <span className="font-label-caps text-label-caps text-on-surface-variant ml-1">
                    ({mg.isRequired ? "wajib" : "opsional"}, maks {mg.maxSelect})
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {mg.options.map((opt) => {
                    const isSelected = selectedMods[mg.id]?.has(opt.id) ?? false;
                    return (
                      <button key={opt.id} onClick={() => toggleMod(mg.id, opt.id, mg.maxSelect)}
                        className={`h-9 px-3 rounded-full font-body-md text-body-md transition-colors ${isSelected ? "bg-secondary-container text-on-secondary-container shadow-card" : "bg-surface-container text-on-surface-variant border border-outline-variant"}`}>
                        {opt.name} {Number(opt.price) > 0 && <span className="text-primary">+{formatRupiah(opt.price)}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add to cart button */}
        {(hasVariants && groups.length > 0) ? (
          <div className="space-y-2 pt-2 border-t border-outline-variant/30">
            {matchedVariant ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-body-md text-body-md text-on-surface">{matchedVariant.label}</span>
                  <span className="font-display-price-mobile text-display-price-mobile text-primary">{formatRupiah(basePrice + modTotal)}</span>
                </div>
                <button onClick={() => onSelect(matchedVariant, getSelectedModifiers().length ? getSelectedModifiers() : undefined)}
                  className="w-full bg-primary text-on-primary rounded-xl h-12 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform shadow-elevation-2">
                  Tambah ke Keranjang
                </button>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {filtered.length > 1 ? `${filtered.length} varian tersedia — pilih opsi` : "Pilih semua opsi di atas"}
                </p>
              </div>
            )}
          </div>
        ) : !hasVariants && modifierGroups.length > 0 ? (
          <div className="pt-2 border-t border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-body-md text-body-md text-on-surface">{product.name}</span>
              <span className="font-display-price-mobile text-display-price-mobile text-primary">{formatRupiah(basePrice + modTotal)}</span>
            </div>
            <button onClick={() => onSelect(undefined, getSelectedModifiers().length ? getSelectedModifiers() : undefined)}
              className="w-full bg-primary text-on-primary rounded-xl h-12 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform shadow-elevation-2">
              Tambah ke Keranjang
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ["#1a6b4a", "#d4f5e4", "#956316", "#fff0d6", "#82d8aa", "#f0be6a"];

function SuccessOverlay({ receipt, onNew }: { receipt: Receipt; onNew: () => void }): JSX.Element {
  const [sharing, setSharing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const thermalOk = isThermalSupported();
  const hasPhone = !!receipt.customerPhone;

  const confetti = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.6}s`,
      duration: `${1.5 + Math.random() * 1}s`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 6,
      shape: i % 3,
    })), []);

  async function handleThermalPrint(): Promise<void> {
    setPrinting(true);
    try {
      await printThermal({
        cafeName: receipt.cafeName,
        number: receipt.number,
        datetime: receipt.datetime,
        lines: receipt.lines,
        subtotal: receipt.subtotal,
        discount: receipt.discount ?? 0,
        tax: receipt.tax,
        total: receipt.total,
        method: receipt.method,
        received: receipt.received,
        change: receipt.change,
        customerName: receipt.customerName,
      });
    } catch { /* ignore */ }
    setPrinting(false);
  }

  async function shareWA(): Promise<void> {
    if (!receipt.transactionId || !receipt.customerPhone) return;
    setSharing(true);
    try {
      const res = await apiFetch("share-receipt", { method: "POST", body: JSON.stringify({ transactionId: receipt.transactionId }) }) as { token: string };
      const link = `${window.location.origin}/receipt/${res.token}`;
      const text = `Struk ${receipt.number}\nTotal: ${formatRupiah(receipt.total)}\n\nLihat struk: ${link}\n(Link berlaku 24 jam)`;
      const phone = receipt.customerPhone.replace(/[^0-9]/g, "").replace(/^0/, "62");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
    } catch { /* ignore */ }
    setSharing(false);
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background px-6 max-w-3xl mx-auto overflow-hidden">
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confetti.map((c) => (
          <div key={c.id} className="absolute top-0 animate-confetti"
            style={{ left: c.left, animationDelay: c.delay, animationDuration: c.duration }}>
            {c.shape === 0 ? (
              <div style={{ width: c.size, height: c.size, background: c.color, borderRadius: "50%" }} />
            ) : c.shape === 1 ? (
              <div style={{ width: c.size, height: c.size * 1.4, background: c.color, borderRadius: 2 }} />
            ) : (
              <div style={{ width: 0, height: 0, borderLeft: `${c.size / 2}px solid transparent`, borderRight: `${c.size / 2}px solid transparent`, borderBottom: `${c.size}px solid ${c.color}` }} />
            )}
          </div>
        ))}
      </div>

      <div className="animate-celebration-pop w-20 h-20 rounded-full bg-primary-container flex items-center justify-center mb-4 shadow-elevation-3">
        <Icon name="check" filled className="text-on-primary text-[44px]" />
      </div>
      <h2 className="font-h1 text-h1 text-on-surface animate-celebration-pop" style={{ animationDelay: "0.1s", opacity: 0 }}>Pembayaran Berhasil</h2>
      <p className="font-body-md text-body-md text-on-surface-variant mt-1 animate-celebration-pop" style={{ animationDelay: "0.15s", opacity: 0 }}>{receipt.number}</p>
      <p className="font-display-price-mobile text-display-price-mobile text-primary mt-4 animate-celebration-pop" style={{ animationDelay: "0.2s", opacity: 0 }}>{formatRupiah(receipt.total)}</p>
      <div className="w-full space-y-3 mt-8 animate-celebration-pop" style={{ animationDelay: "0.3s", opacity: 0 }}>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => printReceipt(receipt)} className="h-12 rounded-xl border border-outline-variant bg-surface-container-lowest font-body-md text-body-md font-semibold text-on-surface flex items-center justify-center gap-1 shadow-elevation-1">
            <Icon name="print" />Struk
          </button>
          {thermalOk && (
            <button onClick={handleThermalPrint} disabled={printing}
              className="h-12 rounded-xl border border-outline-variant bg-surface-container-lowest font-body-md text-body-md font-semibold text-on-surface flex items-center justify-center gap-1 shadow-elevation-1 disabled:opacity-50">
              <Icon name="receipt_long" />{printing ? "..." : "Thermal"}
            </button>
          )}
          <button onClick={shareWA} disabled={sharing || !hasPhone}
            className={`h-12 rounded-xl border border-outline-variant bg-[#25D366] text-white font-body-md text-body-md font-semibold flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-elevation-1 disabled:opacity-50 ${!thermalOk ? "col-span-2" : ""}`}>
            <Icon name="share" />{sharing ? "..." : "WA"}
          </button>
        </div>
        <button onClick={onNew} className="w-full h-12 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-semibold shadow-elevation-2">Transaksi Baru</button>
      </div>
    </div>
  );
}
