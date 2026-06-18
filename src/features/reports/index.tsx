import { useMemo, useState } from "react";
import { PageHeader, Icon, ListSkeleton } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useTransactions } from "@/hooks/use-transactions";
import { useExpenses } from "@/hooks/use-expenses";
import { exportReportExcel, exportReportPdf, type ReportData } from "@/lib/export";

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
  const [period, setPeriod] = useState<Period>("Bulanan");
  const { from, to } = useMemo(() => rangeFor(period), [period]);

  const { data: trx, isLoading } = useTransactions({ from: from.toISOString(), to: to.toISOString(), limit: 200 });
  const { data: expenses } = useExpenses();

  const omzet = (trx ?? []).filter((t) => t.status === "paid").reduce((s, t) => s + Number(t.total), 0);
  const hpp = (trx ?? []).filter((t) => t.status === "paid").reduce((s, t) => s + Number(t.cogsTotal), 0);
  const labaKotor = omzet - hpp;
  const expenseTotal = (expenses ?? [])
    .filter((e) => { const d = new Date(e.spentAt); return d >= from && d < to; })
    .reduce((s, e) => s + Number(e.amount), 0);
  const labaBersih = labaKotor - expenseTotal;

  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    (trx ?? []).forEach((t) => t.items.forEach((it) => {
      map.set(it.productName, (map.get(it.productName) ?? 0) + Number(it.lineTotal));
    }));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [trx]);

  const reportData: ReportData = {
    period,
    summary: { omzet, hpp, labaKotor, pengeluaran: expenseTotal, labaBersih },
    topProducts: topProducts.map(([name, value]) => ({ name, value })),
  };

  return (
    <>
      <PageHeader title="Laporan" rightIcon="ios_share" />
      <div className="px-container-padding space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {PERIODS.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`h-9 px-4 rounded-full font-label-caps text-label-caps whitespace-nowrap shrink-0 ${period === p ? "bg-primary-container text-on-primary-container shadow-card" : "bg-surface-container text-on-surface-variant border border-outline-variant"}`}>{p}</button>
          ))}
        </div>

        {isLoading ? <ListSkeleton rows={2} /> : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Omzet" value={formatRupiah(omzet)} />
              <Metric label="HPP" value={formatRupiah(hpp)} />
              <Metric label="Laba Kotor" value={formatRupiah(labaKotor)} valueClass="text-primary" />
              <Metric label="Pengeluaran" value={formatRupiah(expenseTotal)} valueClass="text-error" />
            </div>

            <div className="bg-primary-container text-on-primary rounded-xl p-4 shadow-card">
              <p className="font-label-caps text-label-caps text-primary-fixed uppercase">Laba Bersih</p>
              <p className="font-display-price-mobile text-display-price-mobile mt-1">{formatRupiah(labaBersih)}</p>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-card border border-outline-variant/40">
              <h3 className="font-body-lg text-body-lg font-semibold text-on-surface mb-3">Produk Teratas</h3>
              {topProducts.length === 0 ? (
                <p className="font-body-md text-body-md text-on-surface-variant">Belum ada transaksi pada periode ini.</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map(([name, value]) => (
                    <div key={name} className="flex justify-between items-center">
                      <span className="font-body-md text-body-md text-on-surface">{name}</span>
                      <span className="font-body-md text-body-md font-semibold text-on-surface-variant">{formatRupiah(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => exportReportPdf(reportData)} className="h-12 rounded-xl border border-outline-variant bg-surface-container-lowest flex items-center justify-center gap-2 font-body-md text-body-md font-semibold text-on-surface active:scale-95 transition-transform">
                <Icon name="picture_as_pdf" className="text-error" />PDF
              </button>
              <button onClick={() => exportReportExcel(reportData)} className="h-12 rounded-xl border border-outline-variant bg-surface-container-lowest flex items-center justify-center gap-2 font-body-md text-body-md font-semibold text-on-surface active:scale-95 transition-transform">
                <Icon name="table_view" className="text-primary" />Excel
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Metric({ label, value, valueClass = "text-on-surface" }: { label: string; value: string; valueClass?: string }): JSX.Element {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 shadow-card border border-outline-variant/40">
      <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">{label}</p>
      <p className={`font-body-lg text-body-lg font-bold mt-1 ${valueClass}`}>{value}</p>
    </div>
  );
}
