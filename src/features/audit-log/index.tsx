import { PageHeader, Icon, ListSkeleton, ErrorState } from "@/components/shared";
import { useAuditLogs } from "@/hooks/use-audit-logs";

const ACTION_LABEL: Record<string, string> = {
  create: "Buat",
  void: "Void",
  delete: "Hapus",
  price_change: "Ubah Harga",
  open: "Buka",
  close: "Tutup",
};

const ENTITY_LABEL: Record<string, string> = {
  transaction: "Transaksi",
  product: "Produk",
  promo: "Promo",
  shift: "Shift",
};

const ENTITY_ICON: Record<string, string> = {
  transaction: "receipt",
  product: "inventory_2",
  promo: "local_offer",
  shift: "schedule",
};

export function AuditLogPage(): JSX.Element {
  const { data, isLoading, isError, error } = useAuditLogs();

  return (
    <>
      <PageHeader title="Audit Log" leftIcon="arrow_back" onLeft={() => window.history.back()} />
      <div className="px-container-padding py-4">
        {isLoading && <ListSkeleton rows={6} />}
        {isError && <ErrorState message={error instanceof Error ? error.message : "Gagal memuat"} />}
        {data && data.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant font-body-md text-body-md">Belum ada aktivitas tercatat.</div>
        )}
        {data && data.length > 0 && (
          <div className="space-y-2">
            {data.map((log) => (
              <div key={log.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name={ENTITY_ICON[log.entity] ?? "description"} className="text-on-secondary-container text-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-body-md text-body-md font-semibold text-on-surface">
                        {ACTION_LABEL[log.action] ?? log.action} {ENTITY_LABEL[log.entity] ?? log.entity}
                      </span>
                    </div>
                    {log.details && (
                      <p className="font-body-md text-body-md text-on-surface-variant mt-0.5 truncate">
                        {formatDetails(log.action, log.details)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-label-caps text-label-caps text-on-surface-variant">{log.userName ?? "System"}</span>
                      <span className="font-label-caps text-label-caps text-on-surface-variant">·</span>
                      <span className="font-label-caps text-label-caps text-on-surface-variant">
                        {new Date(log.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function formatDetails(action: string, details: Record<string, unknown>): string {
  if (action === "price_change") {
    return `${details.name}: Rp ${Number(details.oldPrice).toLocaleString("id-ID")} → Rp ${Number(details.newPrice).toLocaleString("id-ID")}`;
  }
  if (action === "void" && details.number) return `${details.number}${details.reason ? ` — ${details.reason}` : ""}`;
  if (details.name) return String(details.name);
  if (details.total) return `Total: Rp ${Number(details.total).toLocaleString("id-ID")}`;
  return JSON.stringify(details);
}
