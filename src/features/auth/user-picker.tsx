import { useEffect, useMemo, useState } from "react";
import { Icon, useToast } from "@/components/shared";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api-client";
import type { PinUser } from "@/types/auth";

interface Staff { id: string; fullName: string; role: "owner" | "manager" | "cashier"; isActive: boolean; hasPin: boolean }
const ROLE_LABEL: Record<string, string> = { owner: "Owner", manager: "Manajer", cashier: "Kasir" };

// Gerbang "pilih user + PIN" untuk device bersama. Muncul saat device sudah login
// (owner) tapi belum ada kasir aktif. Pilih nama → PIN → modal kas → shift kebuka.
export function UserPickerGate(): JSX.Element {
  const { user, pinLogin, commitActive, enterAsBase, logout } = useAuth();
  const toast = useToast();
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [picked, setPicked] = useState<Staff | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cashStep, setCashStep] = useState(false);   // langkah modal kas
  const [openingCash, setOpeningCash] = useState("");
  const [loggedInUser, setLoggedInUser] = useState<PinUser | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    apiFetch<Staff[]>("employees")
      .then((rows) => setStaff(rows.filter((r) => r.isActive)))
      .catch(() => setStaff([]));
  }, []);

  const deviceStaff = useMemo(() => (staff ?? []).find((s) => s.id === user?.id), [staff, user]);
  const cashiers = useMemo(() => (staff ?? []).filter((s) => s.role === "cashier"), [staff]);
  // Landing PIN hanya untuk kasir. Owner/manajer sudah terautentikasi via email →
  // langsung masuk sebagai dirinya, tak perlu pilih-user/PIN.
  useEffect(() => {
    if (deviceStaff && deviceStaff.role !== "cashier") enterAsBase();
  }, [deviceStaff, enterAsBase]);

  function selectStaff(s: Staff): void {
    if (!s.hasPin) { toast("PIN belum diatur untuk " + s.fullName + ". Owner atur dulu di menu Karyawan.", "error"); return; }
    setPicked(s); setPin(""); setErr("");
  }

  async function submitPin(): Promise<void> {
    if (!picked || pin.length < 4) return;
    setBusy(true); setErr("");
    try {
      const u = await pinLogin(picked.id, pin);
      // Sudah punya shift terbuka sendiri (mis. lanjut setelah auto-kunci) → langsung
      // masuk, jangan tanya kas awal lagi. Shift orang lain diabaikan (biar handover).
      const active = await apiFetch<{ cashierId: string } | null>("shifts?active=true").catch(() => null);
      if (active && active.cashierId === u.id) { commitActive(); return; }
      // Hanya kasir yang buka kasir (isi kas awal). Manajer/owner langsung masuk (lihat laporan).
      if (u.role !== "cashier") { commitActive(); return; }
      setLoggedInUser(u);
      setCashStep(true);            // kasir → modal kas untuk buka shift
    } catch (e) {
      setErr(e instanceof Error ? e.message : "PIN salah");
      setPin("");
    }
    setBusy(false);
  }

  async function startShift(): Promise<void> {
    setBusy(true);
    try {
      await apiFetch("shifts", { method: "POST", body: JSON.stringify({ openingCash: Number(openingCash) || 0 }) });
    } catch (e) {
      // shift gagal (mis. owner tanpa outlet) — tetap masuk, beri tahu.
      toast(e instanceof Error ? e.message : "Shift tak terbuka otomatis", "info");
    }
    commitActive();               // masuk aplikasi sebagai user itu
  }

  // ---- Langkah modal kas (khusus kasir; manajer/owner sudah langsung masuk) ----
  if (cashStep && loggedInUser) {
    return (
      <Shell>
        <h2 className="font-h2 text-h2 text-on-surface text-center">Halo, {loggedInUser.name} 👋</h2>
        <p className="font-body-md text-body-md text-on-surface-variant text-center">Modal awal kas di laci (boleh dikosongkan / 0).</p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">Rp</span>
          <input autoFocus inputMode="numeric" value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="0"
            className="w-full h-14 pl-12 pr-4 rounded-xl border border-outline-variant bg-surface-container-low focus:outline-none focus:border-primary font-body-lg text-body-lg text-right" />
        </div>
        <button onClick={startShift} disabled={busy}
          className="w-full h-14 rounded-xl bg-primary text-on-primary font-body-lg text-body-lg font-semibold disabled:opacity-60">
          {busy ? "Membuka shift…" : "Mulai Shift"}
        </button>
      </Shell>
    );
  }

  // ---- Langkah PIN pad ----
  if (picked) {
    return (
      <Shell>
        <button onClick={() => setPicked(null)} className="self-start text-on-surface-variant flex items-center gap-1"><Icon name="arrow_back" />Kembali</button>
        <h2 className="font-h2 text-h2 text-on-surface text-center">{picked.fullName}</h2>
        <p className="font-label-caps text-label-caps text-on-surface-variant text-center uppercase">{ROLE_LABEL[picked.role]}</p>
        <div className="flex justify-center gap-3 my-2">
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
          <button onClick={submitPin} disabled={busy || pin.length < 4}
            className="h-16 rounded-2xl bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"><Icon name="check" /></button>
        </div>
      </Shell>
    );
  }

  // ---- Daftar user ----
  return (
    <Shell wide>
      <div className="flex items-center gap-2 justify-center">
        <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center"><Icon name="eco" filled className="text-primary" /></div>
        <h1 className="font-h1 text-h1 text-primary">Herbaspace POS</h1>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant text-center">Pilih nama Anda untuk mulai bekerja</p>
      {staff === null ? (
        <p className="text-center text-on-surface-variant py-6">Memuat…</p>
      ) : cashiers.length === 0 ? (
        <p className="text-center text-on-surface-variant py-6">Belum ada akun kasir. Owner tambahkan kasir di menu Karyawan.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {cashiers.map((s) => (
            <button key={s.id} onClick={() => selectStaff(s)}
              className={`p-4 rounded-2xl border text-left active:scale-[0.98] transition-transform ${s.hasPin ? "bg-surface-container-lowest border-outline-variant shadow-card" : "bg-surface-container-low border-outline-variant/40 opacity-60"}`}>
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center mb-2">
                <span className="font-h2 text-h2 text-on-primary">{s.fullName[0]?.toUpperCase()}</span>
              </div>
              <p className="font-body-md text-body-md font-semibold text-on-surface truncate">{s.fullName}</p>
              <p className="font-label-caps text-label-caps text-on-surface-variant">{ROLE_LABEL[s.role]}{!s.hasPin ? " · PIN belum diatur" : ""}</p>
            </button>
          ))}
        </div>
      )}
      {/* Jalan pintas "tanpa PIN" HANYA untuk setup awal: begitu akun device
          punya PIN, tombol hilang → owner pun wajib PIN (tak ada bypass). */}
      {deviceStaff && !deviceStaff.hasPin && (
        <div className="space-y-1">
          <button onClick={enterAsBase} className="w-full h-11 rounded-xl border border-outline-variant text-on-surface font-body-md text-body-md font-semibold">
            Masuk sebagai {deviceStaff.fullName} (tanpa PIN)
          </button>
          <p className="text-[11px] text-on-surface-variant/80 text-center px-2">
            Atur PIN Anda di menu Karyawan agar tombol ini hilang & akses owner terkunci.
          </p>
        </div>
      )}
      <button onClick={() => setConfirmLogout(true)} className="w-full text-center text-[12px] text-on-surface-variant/70 py-1">Ganti akun / keluar device</button>
      {confirmLogout && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-6" onClick={() => setConfirmLogout(false)}>
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-h2 text-h2 text-on-surface">Keluar dari device?</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Semua staf tak bisa memakai kasir ini sampai owner login ulang pakai <b>email &amp; password</b>. Lanjutkan?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmLogout(false)} className="flex-1 h-12 rounded-xl border border-outline-variant font-body-md text-body-md font-semibold text-on-surface">Batal</button>
              <button onClick={() => void logout()} className="flex-1 h-12 rounded-xl bg-error text-on-error font-body-md text-body-md font-semibold">Keluar</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-low px-6 py-8">
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-xs"} bg-surface-container-lowest rounded-3xl shadow-elevation-2 p-6 space-y-4`}>
        {children}
      </div>
    </div>
  );
}
