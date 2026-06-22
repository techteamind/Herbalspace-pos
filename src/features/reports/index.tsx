import { useMemo, useState } from "react";
import { PageHeader, Icon, ListSkeleton } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useTransactions } from "@/hooks/use-transactions";
import { useExpenses } from "@/hooks/use-expenses";
import { useIngredients } from "@/hooks/use-ingredients";
import { useOutlets } from "@/hooks/use-outlets";
import { useAuth } from "@/contexts/AuthContext";
import { exportReportExcel, exportReportPdf, type ReportData } from "@/lib/export";

type Tab = "laba-rugi" | "neraca";
type Period = "Harian" | "Mingguan" | "Bulanan" | "Tahunan";
const PERIODS: Period[] = ["Harian", "Mingguan", "Bulanan", "Tahunan"];

function rangeFor(period: Period): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const from = new Date(to);
  if (period === "Harian") from.setDate(to.getDate() - 1);
  else if (period === "Mingguan") from.setDate(to.getDate() - 7);
  else if (period === "Bulanan") from.setMonth(to.getMonth() - 1);
  else from.setFullYear(to.getFullYear() - 1);
  return { from, to };
}

export function ReportsPage(): JSX.Element {
  const { outletId } = useAuth();
  const { data: outlets } = useOutlets();
  const activeOutlet = (outlets ?? []).find((o) => o.id === outletId);
  const outletLabel = activeOutlet?.name ?? "Semua Outlet";

  const [tab, setTab] = useState<Tab>("laba-rugi");
  const [period, setPeriod] = useState<Period>("Bulanan");
  const { from, to } = useMemo(() => rangeFor(period), [period]);

  const { data: trx, isLoading } = useTransactions({ from: from.toISOString(), to: to.toISOString(), limit: 500 });
  const { data: expenses } = useExpenses();
  const { data: ingredientList } = useIngredients();

  const paidTrx = (trx ?? []).filter((t) => t.status === "paid");
  const omzet = paidTrx.reduce((s, t) => s + Number(t.total), 0);
  const hpp = paidTrx.reduce((s, t) => s + Number(t.cogsTotal), 0);
  const totalDiscount = paidTrx.reduce((s, t) => s + Number(t.discount), 0);
  const labaKotor = omzet - hpp;

  const periodExpenses = (expenses ?? []).filter((e) => {
    const d = new Date(e.spentAt);
    return d >= from && d < to;
  });
  const expenseTotal = periodExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const labaBersih = labaKotor - expenseTotal;

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    periodExpenses.forEach((e) => {
      const cat = e.category?.name ?? "Lainnya";
      map.set(cat, (map.get(cat) ?? 0) + Number(e.amount));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [periodExpenses]);

  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    paidTrx.forEach((t) => t.items.forEach((it) => {
      map.set(it.productName, (map.get(it.productName) ?? 0) + Number(it.lineTotal));
    }));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [paidTrx]);

  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    paidTrx.forEach((t) => t.payments?.forEach((p) => {
      const method = p.method ?? "other";
      map.set(method, (map.get(method) ?? 0) + Number(p.amount));
    }));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [paidTrx]);

  const METHOD_LABEL: Record<string, string> = { cash: "Tunai", qris: "QRIS", card: "Kartu", transfer: "Transfer" };

  // Neraca
  const stockValue = (ingredientList ?? []).reduce((s, i) => s + Number(i.currentStock) * Number(i.lastCost), 0);

  const reportData: ReportData = {
    period,
    summary: { omzet, hpp, labaKotor, pengeluaran: expenseTotal, labaBersih },
    topProducts: topProducts.map(([name, value]) => ({ name, value })),
  };

  return (
    <>
      <PageHeader title="Laporan" />
      {outletId && (
        <div className="px-container-padding -mt-2 mb-2">
          <span className="inline-flex items-center gap-1 font-label-caps text-label-caps font-semibold text-primary bg-primary-container/40 px-2.5 py-1 rounded-full">
            <Icon name="store" className="text-[14px]" />{outletLabel}
          </span>
        </div>
      )}
      <div className="px-container-padding space-y-4">
        {/* Tab */}
        <div className="flex bg-surface-container rounded-xl p-1">
          {([["laba-rugi", "Laba Rugi"], ["neraca", "Neraca"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 h-10 rounded-lg font-body-md text-body-md font-semibold transition-colors ${tab === key ? "bg-primary-container text-on-primary shadow-card" : "text-on-surface-variant"}`}>{label}</button>
          ))}
        </div>

        {/* Period filter */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {PERIODS.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`h-9 px-4 rounded-full font-label-caps text-label-caps whitespace-nowrap shrink-0 ${period === p ? "bg-primary-container text-on-primary-container shadow-card" : "bg-surface-container text-on-surface-variant border border-outline-variant"}`}>{p}</button>
          ))}
        </div>

        {isLoading ? <ListSkeleton rows={3} /> : tab === "laba-rugi" ? (
          <>
            <div className="grid md:grid-cols-2 gap-4">
            {/* Revenue section */}
            <Section title="Pendapatan">
              <Row label="Penjualan Kotor" value={formatRupiah(omzet + totalDiscount)} />
              {totalDiscount > 0 && <Row label="Total Diskon" value={`-${formatRupiah(totalDiscount)}`} className="text-error" />}
              <Row label="Pendapatan Bersih" value={formatRupiah(omzet)} bold />
              <Row label={`Transaksi (${paidTrx.length} struk)`} value="" sub />
            </Section>

            {/* COGS + Expense */}
            <Section title="Harga Pokok Penjualan (HPP)">
              <Row label="Total HPP" value={formatRupiah(hpp)} />
            </Section>
            </div>

            {/* Gross profit */}
            <Card label="Laba Kotor" value={formatRupiah(labaKotor)} positive={labaKotor >= 0} />

            {/* Expense breakdown */}
            <Section title="Pengeluaran Operasional">
              {expenseByCategory.length === 0 ? (
                <p className="font-body-md text-body-md text-on-surface-variant">Belum ada pengeluaran.</p>
              ) : (
                <>
                  {expenseByCategory.map(([cat, val]) => (
                    <Row key={cat} label={cat} value={formatRupiah(val)} />
                  ))}
                  <Row label="Total Pengeluaran" value={formatRupiah(expenseTotal)} bold className="text-error" />
                </>
              )}
            </Section>

            {/* Net profit */}
            <div className="bg-primary-container text-on-primary rounded-xl p-4 shadow-card">
              <p className="font-label-caps text-label-caps text-primary-fixed uppercase">Laba Bersih</p>
              <p className="font-display-price-mobile text-display-price-mobile mt-1">{formatRupiah(labaBersih)}</p>
              <p className="font-body-md text-body-md text-primary-fixed mt-1 opacity-80">
                Margin: {omzet > 0 ? `${Math.round(labaBersih / omzet * 100)}%` : "—"}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
            {/* Payment breakdown */}
            {paymentBreakdown.length > 0 && (
              <Section title="Per Metode Pembayaran">
                {paymentBreakdown.map(([method, val]) => (
                  <Row key={method} label={METHOD_LABEL[method] ?? method} value={formatRupiah(val)} />
                ))}
              </Section>
            )}

            {/* Top products */}
            <Section title="Produk Teratas">
              {topProducts.length === 0 ? (
                <p className="font-body-md text-body-md text-on-surface-variant">Belum ada transaksi.</p>
              ) : topProducts.map(([name, value], i) => (
                <div key={name} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-label-caps text-label-caps text-[11px] ${i === 0 ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>{i + 1}</span>
                    <span className="font-body-md text-body-md text-on-surface">{name}</span>
                  </div>
                  <span className="font-body-md text-body-md font-semibold text-on-surface-variant">{formatRupiah(value)}</span>
                </div>
              ))}
            </Section>
            </div>

            {/* Export */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => exportReportPdf(reportData)} className="h-12 rounded-xl border border-outline-variant bg-surface-container-lowest flex items-center justify-center gap-2 font-body-md text-body-md font-semibold text-on-surface active:scale-95 transition-transform">
                <Icon name="picture_as_pdf" className="text-error" />PDF
              </button>
              <button onClick={() => exportReportExcel(reportData)} className="h-12 rounded-xl border border-outline-variant bg-surface-container-lowest flex items-center justify-center gap-2 font-body-md text-body-md font-semibold text-on-surface active:scale-95 transition-transform">
                <Icon name="table_view" className="text-primary" />Excel
              </button>
            </div>
          </>
        ) : (
          /* Neraca tab */
          <>
            <Section title="Aset">
              <Row label="Nilai Stok Bahan Baku" value={formatRupiah(stockValue)} sub />
              <p className="font-label-caps text-label-caps text-on-surface-variant">
                {(ingredientList ?? []).length} jenis bahan × harga terakhir
              </p>
              <Row label="Total Aset" value={formatRupiah(stockValue)} bold />
            </Section>

            <Section title="Pendapatan Periode Ini">
              <Row label="Omzet" value={formatRupiah(omzet)} />
              <Row label="HPP" value={`-${formatRupiah(hpp)}`} className="text-error" />
              <Row label="Laba Kotor" value={formatRupiah(labaKotor)} bold />
            </Section>

            <Section title="Pengeluaran Periode Ini">
              {expenseByCategory.length === 0 ? (
                <p className="font-body-md text-body-md text-on-surface-variant">Belum ada pengeluaran.</p>
              ) : expenseByCategory.map(([cat, val]) => (
                <Row key={cat} label={cat} value={`-${formatRupiah(val)}`} className="text-error" />
              ))}
              <Row label="Total Pengeluaran" value={formatRupiah(expenseTotal)} bold className="text-error" />
            </Section>

            <div className={`rounded-xl p-4 shadow-card ${labaBersih >= 0 ? "bg-primary-container text-on-primary" : "bg-error-container text-on-error-container"}`}>
              <p className="font-label-caps text-label-caps uppercase opacity-80">Saldo Bersih Periode</p>
              <p className="font-display-price-mobile text-display-price-mobile mt-1">{formatRupiah(labaBersih)}</p>
            </div>

            <Card label="Total Ekuitas (Aset + Laba)" value={formatRupiah(stockValue + labaBersih)} positive={stockValue + labaBersih >= 0} />
          </>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 shadow-card border border-outline-variant/40 space-y-2">
      <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">{title}</h3>
      {children}
    </div>
  );
}

function Card({ label, value, positive }: { label: string; value: string; positive: boolean }): JSX.Element {
  return (
    <div className={`rounded-xl p-4 shadow-card ${positive ? "bg-primary-container/60" : "bg-error-container/60"}`}>
      <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">{label}</p>
      <p className={`font-body-lg text-body-lg font-bold mt-1 ${positive ? "text-primary" : "text-error"}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, bold, sub, className }: { label: string; value: string; bold?: boolean; sub?: boolean; className?: string }): JSX.Element {
  return (
    <div className={`flex justify-between items-center ${bold ? "pt-1 border-t border-outline-variant/40" : ""}`}>
      <span className={`font-body-md text-body-md ${sub ? "text-on-surface-variant text-[12px]" : "text-on-surface-variant"}`}>{label}</span>
      <span className={`font-body-md text-body-md ${bold ? "font-bold" : "font-medium"} ${className ?? "text-on-surface"}`}>{value}</span>
    </div>
  );
}
