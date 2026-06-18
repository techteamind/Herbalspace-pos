import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader, Icon, ListSkeleton } from "@/components/shared";
import { formatRupiah } from "@/lib/utils";
import { useProducts } from "@/hooks/use-products";
import { useIngredients } from "@/hooks/use-ingredients";
import { useRecipe, useSaveRecipe } from "@/hooks/use-recipes";

interface Line { ingredientId: string; quantity: number; }

export function RecipeEditorPage(): JSX.Element {
  const navigate = useNavigate();
  const { id = "" } = useParams();

  const { data: products } = useProducts();
  const { data: ingredients } = useIngredients();
  const { data: recipe, isLoading } = useRecipe(id);
  const saveRecipe = useSaveRecipe(id);

  const product = (products ?? []).find((p) => p.id === id);
  const [lines, setLines] = useState<Line[]>([]);
  const [ready, setReady] = useState(false);
  const [picker, setPicker] = useState("");

  useEffect(() => {
    if (recipe && !ready) {
      setLines(recipe.map((r) => ({ ingredientId: r.ingredientId, quantity: Number(r.quantity) })));
      setReady(true);
    }
  }, [recipe, ready]);

  const ingMap = useMemo(() => new Map((ingredients ?? []).map((i) => [i.id, i])), [ingredients]);
  const available = (ingredients ?? []).filter((i) => !lines.some((l) => l.ingredientId === i.id));

  const hpp = lines.reduce((s, l) => s + l.quantity * Number(ingMap.get(l.ingredientId)?.lastCost ?? 0), 0);
  const price = Number(product?.price ?? 0);
  const margin = price > 0 ? Math.round(((price - hpp) / price) * 100) : 0;

  function setQty(ingredientId: string, q: number): void {
    setLines((ls) => ls.map((l) => l.ingredientId === ingredientId ? { ...l, quantity: q } : l));
  }
  function remove(ingredientId: string): void {
    setLines((ls) => ls.filter((l) => l.ingredientId !== ingredientId));
  }
  function addIngredient(ingredientId: string): void {
    if (!ingredientId) return;
    setLines((ls) => [...ls, { ingredientId, quantity: 0 }]);
    setPicker("");
  }
  async function save(): Promise<void> {
    await saveRecipe.mutateAsync(lines.filter((l) => l.quantity > 0));
    navigate(-1);
  }

  return (
    <>
      <PageHeader title="Resep Produk" leftIcon="arrow_back" onLeft={() => navigate(-1)} />
      <div className="px-container-padding py-3 bg-surface-container-low">
        <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Resep untuk</p>
        <h2 className="font-h2 text-h2 text-on-surface">{product?.name ?? "Produk"}</h2>
      </div>

      <div className="px-container-padding py-3 space-y-2">
        {isLoading && <ListSkeleton rows={3} />}
        {!isLoading && lines.map((l) => {
          const ing = ingMap.get(l.ingredientId);
          return (
            <div key={l.ingredientId} className="bg-surface-container-lowest p-3 rounded-xl shadow-card flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-body-md text-body-md font-semibold text-on-surface truncate">{ing?.name ?? "—"}</h3>
                <p className="font-label-caps text-label-caps text-on-surface-variant">{formatRupiah(ing?.lastCost ?? 0)} / {ing?.unit.code}</p>
              </div>
              <div className="flex items-center gap-1 border border-outline-variant rounded-lg px-2 h-9 bg-surface">
                <input inputMode="decimal" value={l.quantity || ""} onChange={(e) => setQty(l.ingredientId, Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
                  className="w-14 text-right bg-transparent focus:outline-none font-body-md text-body-md font-semibold" placeholder="0" />
                <span className="font-body-md text-body-md text-on-surface-variant">{ing?.unit.code}</span>
              </div>
              <button onClick={() => remove(l.ingredientId)} className="text-error p-1"><Icon name="delete" /></button>
            </div>
          );
        })}

        {available.length > 0 && (
          <div className="relative">
            <select value={picker} onChange={(e) => addIngredient(e.target.value)}
              className="w-full h-12 rounded-xl border-2 border-dashed border-primary/40 bg-transparent text-primary font-body-md text-body-md font-semibold px-4 appearance-none">
              <option value="">+ Tambah Bahan</option>
              {available.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <Icon name="add" className="absolute right-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full max-w-md mx-auto pb-safe bg-background" style={{ left: "50%", transform: "translateX(-50%)" }}>
        <div className="mx-container-padding mb-2 bg-surface-container-lowest rounded-xl p-4 shadow-card border border-outline-variant/40 flex justify-between items-center">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">HPP per porsi</p>
            <p className="font-h2 text-h2 text-primary">{formatRupiah(hpp)}</p>
          </div>
          <div className="text-right">
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Margin</p>
            <p className={`font-h2 text-h2 ${margin >= 0 ? "text-on-surface" : "text-error"}`}>{margin}%</p>
          </div>
        </div>
        <div className="px-container-padding pt-1">
          <button onClick={save} disabled={saveRecipe.isPending}
            className="w-full bg-primary text-on-primary rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform shadow-card disabled:opacity-60">
            {saveRecipe.isPending ? "Menyimpan..." : "Simpan Resep"}
          </button>
        </div>
      </div>
    </>
  );
}
