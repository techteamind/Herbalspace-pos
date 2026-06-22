import { Icon } from "@/components/shared";
import { useOutlets } from "@/hooks/use-outlets";
import { useAuth } from "@/contexts/AuthContext";

export function OutletPicker(): JSX.Element {
  const { data: outlets, isLoading } = useOutlets();
  const { setOutletId } = useAuth();

  return (
    <div className="fixed inset-0 z-[90] bg-background flex flex-col items-center justify-center px-6 max-w-3xl mx-auto">
      <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mb-4">
        <Icon name="store" filled className="text-on-primary-container text-[32px]" />
      </div>
      <h1 className="font-h1 text-h1 text-on-surface">Pilih Outlet</h1>
      <p className="font-body-md text-body-md text-on-surface-variant mt-1 text-center">
        Pilih outlet yang ingin dikelola saat ini
      </p>

      <div className="w-full mt-8 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        )}
        {!isLoading && (outlets ?? []).filter((o) => o.isActive).length === 0 && (
          <div className="text-center py-8">
            <p className="font-body-md text-body-md text-on-surface-variant">Belum ada outlet aktif.</p>
          </div>
        )}
        {(outlets ?? []).filter((o) => o.isActive).map((outlet) => (
          <button key={outlet.id} onClick={() => setOutletId(outlet.id)}
            className="w-full bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex items-center gap-4 active:scale-[0.98] transition-transform text-left shadow-card">
            <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
              <Icon name="store" className="text-on-primary-container text-[24px]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">{outlet.name}</h3>
              {outlet.address && <p className="font-body-md text-body-md text-on-surface-variant truncate">{outlet.address}</p>}
            </div>
            <Icon name="chevron_right" className="text-on-surface-variant" />
          </button>
        ))}
        <button onClick={() => setOutletId("__all__")}
          className="w-full h-12 rounded-xl border border-outline-variant text-on-surface-variant font-body-md text-body-md font-semibold active:scale-[0.98] transition-transform mt-4">
          Lewati — Lihat Semua Outlet
        </button>
      </div>
    </div>
  );
}
