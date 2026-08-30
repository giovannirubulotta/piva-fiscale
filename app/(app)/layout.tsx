import { createClient } from "@/lib/supabase/server";
import { esci } from "@/app/login/actions";
import { BarraInferiore, MenuCompleto } from "@/components/NavPrincipale";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const annoCorrente = new Date().getFullYear();

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen">
      <a href="#contenuto" className="salta-al-contenuto">
        Salta al contenuto
      </a>

      {/* Intestazione mobile: il menu completo sta dietro <details>/<summary>
          nativi, stesso pattern di InfoCampo — niente JS per aprire e chiudere,
          funziona da tastiera e con screen reader senza ARIA aggiunta a mano.
          Le quattro voci quotidiane non stanno qui ma nella barra inferiore. */}
      <details className="group md:hidden border-b border-line bg-surface sticky top-0 z-30">
        <summary className="marker:hidden [&::-webkit-details-marker]:hidden flex items-center justify-between px-4 py-3 cursor-pointer select-none">
          <div>
            <div className="text-xs tracking-[0.2em] text-accent font-medium">GAR</div>
            <div className="text-xs text-ink-muted">Fiscale P.IVA</div>
          </div>
          <span className="text-xs text-ink-muted border border-line rounded-lg px-3 py-1.5 group-open:hidden">
            Altro
          </span>
          <span className="text-xs text-ink-muted border border-line rounded-lg px-3 py-1.5 hidden group-open:inline">
            Chiudi
          </span>
        </summary>
        <nav
          aria-label="Navigazione principale"
          className="px-3 pb-3 pt-3 border-t border-line bg-surface max-h-[70vh] overflow-y-auto"
        >
          <MenuCompleto compatto />
          <div className="mt-3 pt-3 border-t border-line flex flex-col gap-0.5">
            <a
              href={`/api/esportazione?anno=${annoCorrente}`}
              className="rounded-lg px-3 py-2.5 text-sm text-ink-muted hover:text-ink hover:bg-surface-2 transition"
            >
              Archivio {annoCorrente} (.zip)
            </a>
            <div className="flex items-center justify-between gap-2 pt-2">
              <span className="px-3 text-xs text-ink-faint truncate">{user?.email}</span>
              <form action={esci}>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg px-3 py-2 text-sm text-ink-muted hover:text-ink hover:bg-surface-2 transition"
                >
                  Esci
                </button>
              </form>
            </div>
          </div>
        </nav>
      </details>

      {/* Barra laterale desktop */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-line bg-surface flex-col">
        <div className="px-5 py-5 border-b border-line">
          <div className="text-xs tracking-[0.2em] text-accent font-medium">GAR</div>
          <div className="text-sm text-ink-muted mt-0.5">Fiscale P.IVA</div>
        </div>
        <nav aria-label="Navigazione principale" className="flex-1 px-3 py-4 overflow-y-auto">
          <MenuCompleto />
          <a
            href={`/api/esportazione?anno=${annoCorrente}`}
            className="mt-4 block rounded-lg px-3 py-2 text-sm text-ink-muted hover:text-ink hover:bg-surface-2 transition"
          >
            Archivio {annoCorrente} (.zip)
          </a>
        </nav>
        <div className="px-3 py-4 border-t border-line">
          <div className="px-3 text-xs text-ink-faint truncate mb-2">{user?.email}</div>
          <form action={esci}>
            <button
              type="submit"
              className="w-full text-left rounded-lg px-3 py-2 text-sm text-ink-muted hover:text-ink hover:bg-surface-2 transition"
            >
              Esci
            </button>
          </form>
        </div>
      </aside>

      <main id="contenuto" className="flex-1 overflow-y-auto">
        {/* Lo spazio in basso su mobile è la barra inferiore: senza, l'ultimo
            elemento di ogni pagina resta coperto e non si raggiunge. */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10 pb-24 md:pb-10">{children}</div>
      </main>

      <BarraInferiore />
    </div>
  );
}
