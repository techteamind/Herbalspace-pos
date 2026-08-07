import { useState } from "react";
import { Icon } from "@/components/shared";
import { useAuth } from "@/contexts/AuthContext";

// Layar kunci idle: sesi & shift TETAP terbuka, hanya UI diblok. User yang sedang
// aktif (kasir/manajer/owner) memasukkan PIN-nya untuk lanjut. "Keluar" → login email.
export function LockScreen(): JSX.Element {
  const { profileName, unlockWithPin, logout } = useAuth();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(): Promise<void> {
    if (pin.length < 4) return;
    setBusy(true); setErr("");
    try {
      await unlockWithPin(pin);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "PIN salah");
      setPin("");
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-low px-6 py-8">
      <div className="w-full max-w-xs bg-surface-container-lowest rounded-3xl shadow-elevation-2 p-6 space-y-4">
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center"><Icon name="lock" filled className="text-primary" /></div>
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Terkunci</p>
        </div>
        <h2 className="font-h2 text-h2 text-on-surface text-center">{profileName ?? "Masukkan PIN"}</h2>
        <p className="font-body-md text-body-md text-on-surface-variant text-center">Masukkan PIN untuk lanjut.</p>
        <div className="flex justify-center gap-3 my-1">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`w-3.5 h-3.5 rounded-full ${i < pin.length ? "bg-primary" : "bg-outline-variant/40"}`} />
          ))}
        </div>
        {err && <p className="text-error text-center font-body-md text-body-md">{err}</p>}
        <div className="grid grid-cols-3 gap-3">
          {["1","2","3","4","5","6","7","8","9"].map((d) => (
            <button key={d} onClick={() => setPin((p) => (p.length < 8 ? p + d : p))}
              className="h-16 rounded-2xl bg-surface-container text-on-surface text-[22px] font-semibold active:scale-95 transition-transform">{d}</button>
          ))}
          <button onClick={() => setPin("")} className="h-16 rounded-2xl text-on-surface-variant text-[15px] font-semibold">Hapus</button>
          <button onClick={() => setPin((p) => (p.length < 8 ? p + "0" : p))} className="h-16 rounded-2xl bg-surface-container text-on-surface text-[22px] font-semibold active:scale-95 transition-transform">0</button>
          <button onClick={submit} disabled={busy || pin.length < 4}
            className="h-16 rounded-2xl bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"><Icon name="check" /></button>
        </div>
        <button onClick={() => void logout()} className="w-full text-center text-[12px] text-on-surface-variant/70 py-1">Keluar (login email)</button>
      </div>
    </div>
  );
}
