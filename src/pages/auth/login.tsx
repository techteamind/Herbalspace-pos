import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseConfigured } from "@/lib/supabase";
import { Icon } from "@/components/shared";

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError("Email dan kata sandi harus diisi");
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setSubmitting(false);
    }
  };

  const busy = loading || submitting;

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 max-w-md mx-auto bg-gradient-to-b from-primary-fixed/30 to-background">
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center">
          <Icon name="eco" filled className="text-primary text-[28px]" />
        </div>
        <h1 className="font-h1 text-h1 text-primary mt-2">Herbaspace POS</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Sistem Kasir Pintar &amp; Efisien
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-lowest rounded-2xl p-6 shadow-card space-y-4"
      >
        <h2 className="font-h2 text-h2 text-on-surface">Masuk Akun</h2>

        {!supabaseConfigured && (
          <p className="font-body-md text-body-md bg-secondary-fixed text-on-secondary-fixed-variant rounded-lg p-3">
            Supabase Auth belum dikonfigurasi. Isi VITE_SUPABASE_URL &amp;
            VITE_SUPABASE_ANON_KEY di .env lalu restart server. Lihat docs/SETUP.md §5.
          </p>
        )}

        <div className="space-y-1">
          <label
            htmlFor="email"
            className="font-label-caps text-label-caps text-on-surface-variant uppercase"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            required
            className="w-full h-touch-target-min px-4 rounded-lg border border-outline-variant bg-surface-container-low focus:outline-none focus:border-primary font-body-md text-body-md"
            placeholder="nama@kafe.com"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="font-label-caps text-label-caps text-on-surface-variant uppercase"
          >
            Kata Sandi
          </label>
          <div className="relative">
            <input
              id="password"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
              className="w-full h-touch-target-min px-4 pr-12 rounded-lg border border-outline-variant bg-surface-container-low focus:outline-none focus:border-primary font-body-md text-body-md"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              <Icon name={show ? "visibility" : "visibility_off"} />
            </button>
          </div>
        </div>

        {(error || localError) && (
          <p className="font-body-md text-body-md text-error">
            {localError || error?.message}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-on-primary rounded-lg h-touch-target-min font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {busy ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
