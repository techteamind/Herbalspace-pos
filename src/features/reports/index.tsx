import { useMemo, useState } from "react";
import { PageHeader, Icon, ListSkeleton, useToast } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useReport } from "@/hooks/use-reports";
import { useOutlets } from "@/hooks/use-outlets";
import { useAuth } from "@/contexts/AuthContext";
import { exportReportExcel, exportReportPdf, type ReportData } from "@/lib/export";

type Tab = "laba-rugi" | "neraca";
type Period = "Harian" | "Mingguan" | "Bulanan" | "Tahunan" | "Custom";
const PERIODS: Period[] = ["Harian", "Mingguan", "Bulanan", "Tahunan", "Custom"];
const PERIOD_LABEL: Record<Period, string> = { Harian: "Harian", Mingguan: "Mingguan", Bulanan: "Bulanan", Tahunan: "Tahunan", Custom: "Pilih Tanggal" };
const TODAY_WIB = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

// Rentang bebas dari dua tanggal (YYYY-MM-DD) dengan batas hari WIB — to eksklusif
// (tengah malam WIB hari SETELAH tanggal akhir), konsisten dgn rangeFor & penomoran.
function wibRange(fromStr: string, toStr: string): { from: Date; to: Date } {
  const WIB_MS = 7 * 3600_000;
  const [fy, fm, fd] = fromStr.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = toStr.split("-").map(Number) as [number, number, number];
  const from = new Date(Date.UTC(fy, fm - 1, fd) - WIB_MS);
  const to = new Date(Date.UTC(ty, tm - 1, td + 1) - WIB_MS);
  return { from, to };
}

// Batas hari dihitung dalam WIB (bukan zona device) supaya konsisten dgn dashboard
// & penomoran struk — sale jam 23:30 WIB tak bocor ke hari lain kalau device UTC.
// Indonesia tanpa DST → offset tetap +7 jam, aman dipakai aritmetika hari.
function rangeFor(period: Period): { from: Date; to: Date } {
  const WIB_MS = 7 * 3600_000;
  const wibNow = new Date(Date.now() + WIB_MS);
  // instan UTC dari tengah malam WIB "besok" (batas atas eksklusif hari ini)
  const to = new Date(Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate() + 1) - WIB_MS);
  const from = new Date(to);
  if (period === "Harian") from.setUTCDate(from.getUTCDate() - 1);
  else if (period === "Mingguan") from.setUTCDate(from.getUTCDate() - 7);
  else if (period === "Bulanan") from.setUTCDate(from.getUTCDate() - 30);
  else from.setUTCFullYear(from.getUTCFullYear() - 1);
  return { from, to };
}

export function ReportsPage(): JSX.Element {
  const { outletId } = useAuth();
  const { data: outlets } = useOutlets();
  const activeOutlet = (outlets ?? []).find((o) => o.id === outletId);
  const outletLabel = activeOutlet?.name ?? "Semua Outlet";

  const toast = useToast();
  const [tab, setTab] = useState<Tab>("laba-rugi");
  const [period, setPeriod] = useState<Period>("Bulanan");
  const [customFrom, setCustomFrom] = useState(TODAY_WIB);
  const [customTo, setCustomTo] = useState(TODAY_WIB);
  const onExportErr = (e: unknown) => toast(e instanceof Error ? e.message : "Gagal ekspor laporan", "error");
  const { from, to } = useMemo(
    () => (period === "Custom" ? wibRange(customFrom, customTo) : rangeFor(period)),
    [period, customFrom, customTo],
  );

  const { data: report, isLoading } = useReport(from.toISOString(), to.toISOString());

  const omzet = report?.omzet ?? 0;
  const hpp = report?.hpp ?? 0;
  const totalDiscount = report?.totalDiscount ?? 0;
  const taxService = report?.taxService ?? 0;
  const trxCount = report?.trxCount ?? 0;
  // Pajak & service charge = titipan (bukan pendapatan toko) → keluarkan dari laba.
  const netSales = omzet - taxService;
  const labaKotor = netSales - hpp;
  const expenseTotal = report?.expenseTotal ?? 0;
  const labaBersih = labaKotor - expenseTotal;

  // JSX di bawah memakai bentuk tuple [label, nilai] — pertahankan agar tak berubah.
  const expenseByCategory = (report?.expenseByCategory ?? []).map((e) => [e.category, e.total] as [string, number]);
  const topProducts = (report?.topProducts ?? []).map((t) => [t.name, t.total] as [string, number]);
  const paymentBreakdown = (report?.paymentBreakdown ?? []).map((p) => [p.method, p.total] as [string, number]);

  const METHOD_LABEL: Record<string, string> = { cash: "Tunai", qris: "QRIS", card: "Kartu", transfer: "Transfer" };

  // Neraca — nilai stok dihitung di server (bahan baku + barang jadi).
  const stockValue = report?.stockValue ?? 0;
  const productStockValue = report?.productStockValue ?? 0;
  const totalAset = stockValue + productStockValue;

  const fmtD = (dt: Date) => dt.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
  const reportData: ReportData = {
    period,
    periodRange: `${fmtD(from)} - ${fmtD(new Date(to.getTime() - 86400_000))}`,
    outletName: activeOutlet?.name,
    summary: {
      grossSales: omzet + totalDiscount,
      discount: totalDiscount,
      netSales: omzet,
      taxService,
      hpp,
      grossProfit: labaKotor,
      expense: expenseTotal,
      netProfit: labaBersih,
      trxCount,
    },
    payments: (report?.paymentBreakdown ?? []).map((p) => ({ label: METHOD_LABEL[p.method] ?? p.method, trx: p.trx, total: p.total })),
    categories: (report?.categoryBreakdown ?? []).map((c) => ({ name: c.category, qty: c.qty, total: c.total, hpp: c.hpp })),
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
              className={`flex-1 h-10 rounded-lg font-body-md text-body-md font-semibold transition-colors ${tab === key ? "bg-primary-container text-on-primary-container shadow-card" : "text-on-surface-variant"}`}>{label}</button>
          ))}
        </div>

        {/* Period filter */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {PERIODS.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`h-9 px-4 rounded-full font-label-caps text-label-caps whitespace-nowrap shrink-0 ${period === p ? "bg-primary-container text-on-primary-container shadow-card" : "bg-surface-container text-on-surface-variant border border-outline-variant"}`}>{PERIOD_LABEL[p]}</button>
          ))}
        </div>

        {/* Rentang tanggal bebas */}
        {period === "Custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)}
              className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary" />
            <span className="text-on-surface-variant font-body-md text-body-md shrink-0">s/d</span>
            <input type="date" value={customTo} min={customFrom} max={TODAY_WIB} onChange={(e) => setCustomTo(e.target.value)}
              className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary" />
          </div>
        )}

        {isLoading ? <ListSkeleton rows={3} /> : tab === "laba-rugi" ? (
          <>
            <div className="grid md:grid-cols-2 gap-4">
            {/* Revenue section */}
            <Section title="Pendapatan">
              <Row label="Penjualan Kotor" value={formatRupiah(netSales + totalDiscount)} />
              {totalDiscount > 0 && <Row label="Total Diskon" value={`-${formatRupiah(totalDiscount)}`} className="text-error" />}
              <Row label="Pendapatan Bersih" value={formatRupiah(netSales)} bold />
              {taxService > 0 && <Row label="Pajak & Service (titipan, di luar laba)" value={formatRupiah(taxService)} sub />}
              <Row label={`Transaksi (${trxCount} struk)`} value="" sub />
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
            <div className={`rounded-xl p-4 shadow-card ${labaBersih >= 0 ? "bg-primary-container text-on-primary-container" : "bg-error-container text-on-error-container"}`}>
              <p className={`font-label-caps text-label-caps uppercase ${labaBersih >= 0 ? "text-primary" : "text-error"}`}>Laba Bersih</p>
              <p className="font-display-price-mobile text-display-price-mobile mt-1">{formatRupiah(labaBersih)}</p>
              <p className="font-body-md text-body-md mt-1 opacity-80">
                Margin: {netSales > 0 ? `${Math.round(labaBersih / netSales * 100)}%` : "—"}
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
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-label-caps text-label-caps text-[11px] ${i === 0 ? "bg-primary-container text-on-primary-container" : "bg-surface-container text-on-surface-variant"}`}>{i + 1}</span>
                    <span className="font-body-md text-body-md text-on-surface">{name}</span>
                  </div>
                  <span className="font-body-md text-body-md font-semibold text-on-surface-variant">{formatRupiah(value)}</span>
                </div>
              ))}
            </Section>
            </div>

            {/* Export */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { exportReportPdf(reportData).catch(onExportErr); }} className="h-12 rounded-xl border border-outline-variant bg-surface-container-lowest flex items-center justify-center gap-2 font-body-md text-body-md font-semibold text-on-surface active:scale-95 transition-transform">
                <Icon name="picture_as_pdf" className="text-error" />PDF
              </button>
              <button onClick={() => { exportReportExcel(reportData).catch(onExportErr); }} className="h-12 rounded-xl border border-outline-variant bg-surface-container-lowest flex items-center justify-center gap-2 font-body-md text-body-md font-semibold text-on-surface active:scale-95 transition-transform">
                <Icon name="table_view" className="text-primary" />Excel
              </button>
            </div>
          </>
        ) : (
          /* Neraca tab */
          <>
            <Section title="Aset">
              <Row label="Nilai Stok Bahan Baku" value={formatRupiah(stockValue)} sub />
              <Row label="Nilai Stok Produk" value={formatRupiah(productStockValue)} sub />
              <p className="font-label-caps text-label-caps text-on-surface-variant">
                stok × HPP (bahan baku + barang jadi)
              </p>
              <Row label="Total Aset" value={formatRupiah(totalAset)} bold />
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

            <div className={`rounded-xl p-4 shadow-card ${labaBersih >= 0 ? "bg-primary-container text-on-primary-container" : "bg-error-container text-on-error-container"}`}>
              <p className="font-label-caps text-label-caps uppercase opacity-80">Saldo Bersih Periode</p>
              <p className="font-display-price-mobile text-display-price-mobile mt-1">{formatRupiah(labaBersih)}</p>
            </div>

            <Card label="Total Ekuitas (Aset + Laba)" value={formatRupiah(totalAset + labaBersih)} positive={totalAset + labaBersih >= 0} />
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
