export default function LogoPreviewPage() {
  const colors = ["Ink", "Amber", "Blue", "Emerald", "Violet", "White"] as const;

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Logo preview</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Prévisualisation interne des variantes de logo et de leur lisibilité.
      </p>

      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <article className="rounded-xl border border-border bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Industrial</h2>
        </article>
        <article className="rounded-xl border border-border bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Arrondi</h2>
        </article>
        <article className="rounded-xl border border-border bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Minimal</h2>
        </article>
        <article className="rounded-xl border border-border bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Géométrique</h2>
        </article>
      </section>

      <section className="mt-10 rounded-xl border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-ink">Contrôles</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink"
            >
              {color}
            </button>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-neutral-600">
            Taille
            <input
              type="range"
              min={12}
              max={96}
              defaultValue={36}
              className="mt-2 block w-full"
            />
          </label>
          <label className="text-sm text-neutral-600">
            Épaisseur
            <input
              type="range"
              min={1}
              max={12}
              defaultValue={4}
              className="mt-2 block w-full"
            />
          </label>
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-ink">Aperçu navbar</h2>
        <p className="mt-2 text-sm text-neutral-500">
          Vérification visuelle du rendu du logo en navigation sticky.
        </p>
      </section>

      <section className="mt-10 rounded-xl border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-ink">Test petites tailles</h2>
        <p className="mt-2 text-sm text-neutral-500">
          Contrôle de lisibilité sur favicon et usages compacts.
        </p>
      </section>
    </div>
  );
}
