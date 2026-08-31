import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { esci } from "@/app/login/actions";
import { BarraInferiore, MenuCompleto } from "@/components/NavPrincipale";
import { BarraComando } from "@/components/BarraComando";

/**
 * Il telaio dell'applicazione: barra ambra a tutta larghezza, colonna di
 * navigazione a sinistra, contenuto su grigio chiaro.
 *
 * L'impianto è quello del gestionale preso a riferimento, che è un impianto
 * giusto — è come sono fatti i software gestionali da vent'anni, e la
 * familiarità qui vale più dell'originalità. Cambiano tre cose:
 *
 * 1. La barra ambra porta inchiostro scuro, non bianco. Bianco su
 *    quell'ambra fa 2,15:1; è la scelta istintiva ed è illeggibile.
 * 2. Le voci di menu sono raggruppate (Lavoro / Fisco / Impostazioni). Un
 *    elenco piatto di dodici voci si legge tutto ogni volta.
 * 3. Dove loro mettono una colonna di video tutorial — un terzo dello
 *    schermo, per qualcosa che si guarda una volta — qui non c'è niente: lo
 *    spazio va al contenuto.
 */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const annoCorrente = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#contenuto" className="salta-al-contenuto">
        Salta al contenuto
      </a>

      {/* Barra alta, desktop. A tutta larghezza sopra la colonna: è ciò che dà
          all'insieme l'aria di un'applicazione invece che di un sito. */}
      <header className="barra-brand hidden md:flex sticky top-0 z-40 h-14 shrink-0 items-center gap-4 px-5">
        <Link href="/" className="flex items-baseline gap-2 shrink-0">
          <span className="text-sm tracking-[0.2em] font-semibold">GAR</span>
          <span className="text-sm opacity-70">Studio</span>
        </Link>

        <div className="flex-1 flex justify-center px-4">
          <BarraComando />
        </div>

        <Link
          href="/fatture/nuova"
          className="shrink-0 rounded-lg bg-brand-ink text-white text-sm font-medium px-4 py-2 hover:opacity-90 transition"
        >
          Nuova fattura
        </Link>
      </header>

      {/* Intestazione mobile: il menu completo sta dietro <details>/<summary>
          nativi — niente JS per aprire e chiudere, funziona da tastiera e con
          screen reader senza ARIA aggiunta a mano. Le quattro voci quotidiane
          non stanno qui ma nella barra inferiore. */}
      <details className="group md:hidden sticky top-0 z-40">
        <summary className="barra-brand marker:hidden [&::-webkit-details-marker]:hidden flex items-center justify-between px-4 h-14 cursor-pointer select-none">
          <span className="flex items-baseline gap-2">
            <span className="text-sm tracking-[0.2em] font-semibold">GAR</span>
            <span className="text-sm opacity-70">Studio</span>
          </span>
          <span className="text-xs font-medium border border-brand-ink/25 rounded-lg px-3 py-1.5 group-open:hidden">
            Menu
          </span>
          <span className="text-xs font-medium border border-brand-ink/25 rounded-lg px-3 py-1.5 hidden group-open:inline">
            Chiudi
          </span>
        </summary>
        <nav
          aria-label="Navigazione principale"
          className="px-3 py-3 border-b border-line bg-surface max-h-[70vh] overflow-y-auto shadow-[var(--ombra)]"
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

      <div className="flex-1 flex min-h-0">
        <aside className="hidden md:flex w-56 shrink-0 border-r border-line bg-surface flex-col sticky top-14 h-[calc(100vh-3.5rem)]">
          <nav aria-label="Navigazione principale" className="flex-1 px-3 py-4 overflow-y-auto">
            <MenuCompleto />
            <a
              href={`/api/esportazione?anno=${annoCorrente}`}
              className="mt-4 block rounded-lg px-3 py-2 text-sm text-ink-muted hover:text-ink hover:bg-surface-2 transition"
            >
              Archivio {annoCorrente} (.zip)
            </a>
          </nav>
          <div className="px-3 py-3 border-t border-line">
            <div className="px-3 text-xs text-ink-faint truncate mb-1">{user?.email}</div>
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

        <main id="contenuto" className="flex-1 min-w-0">
          {/* Lo spazio in basso su mobile è la barra inferiore: senza, l'ultimo
              elemento di ogni pagina resta coperto e non si raggiunge. */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-7 pb-24 md:pb-10 flex flex-col gap-6">
            <div className="md:hidden">
              <BarraComando />
            </div>
            {children}
          </div>
        </main>
      </div>

      <BarraInferiore />
    </div>
  );
}
