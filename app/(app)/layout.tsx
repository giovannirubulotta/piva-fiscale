import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { esci } from "@/app/login/actions";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const annoCorrente = new Date().getFullYear();
  const VOCI_NAV = [
    { href: "/", etichetta: "Dashboard" },
    { href: "/fatture", etichetta: "Fatture" },
    { href: "/clienti", etichetta: "Clienti" },
    { href: "/spese", etichetta: "Spese" },
    { href: "/scadenze", etichetta: "Scadenze" },
    { href: "/f24", etichetta: "Genera F24" },
    { href: "/quadro-lm", etichetta: "Quadro LM" },
    { href: "/lavoro-dipendente", etichetta: "Lavoro dipendente" },
    { href: "/requisiti", etichetta: "Requisiti regime" },
    { href: "/riferimenti-normativi", etichetta: "Riferimenti normativi" },
    { href: "/impostazioni", etichetta: "Impostazioni" },
    { href: "/diagnostica", etichetta: "Diagnostica" },
    { href: "/privacy", etichetta: "Privacy e dati" },
    { href: `/api/report?anno=${annoCorrente}`, etichetta: "Esporta CSV" },
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen">
      <a href="#contenuto" className="salta-al-contenuto">
        Salta al contenuto
      </a>
      {/* Barra mobile: <details>/<summary> nativi, stesso pattern di InfoCampo — niente JS per aprire/chiudere il menu. */}
      <details className="group md:hidden border-b border-line bg-surface sticky top-0 z-30">
        <summary className="marker:hidden [&::-webkit-details-marker]:hidden flex items-center justify-between px-4 py-3 cursor-pointer select-none">
          <div>
            <div className="text-xs tracking-[0.2em] text-accent font-medium">GAR</div>
            <div className="text-xs text-ink-muted">Fiscale P.IVA</div>
          </div>
          <span className="text-xs text-ink-muted border border-line rounded-lg px-3 py-1.5 group-open:hidden">Menu</span>
          <span className="text-xs text-ink-muted border border-line rounded-lg px-3 py-1.5 hidden group-open:inline">Chiudi</span>
        </summary>
        <nav aria-label="Navigazione principale" className="px-3 pb-3 pt-1 flex flex-col gap-0.5 border-t border-line bg-surface">
          {VOCI_NAV.map((voce) => (
            <Link
              key={voce.href}
              href={voce.href}
              className="rounded-lg px-3 py-2.5 text-sm text-ink-muted hover:text-ink hover:bg-surface-2 transition"
            >
              {voce.etichetta}
            </Link>
          ))}
          <div className="mt-2 pt-3 border-t border-line flex items-center justify-between gap-2">
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
        </nav>
      </details>

      {/* Barra laterale desktop */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-line bg-surface flex-col">
        <div className="px-5 py-5 border-b border-line">
          <div className="text-xs tracking-[0.2em] text-accent font-medium">GAR</div>
          <div className="text-sm text-ink-muted mt-0.5">Fiscale P.IVA</div>
        </div>
        <nav aria-label="Navigazione principale" className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {VOCI_NAV.map((voce) => (
            <Link
              key={voce.href}
              href={voce.href}
              className="rounded-lg px-3 py-2 text-sm text-ink-muted hover:text-ink hover:bg-surface-2 transition"
            >
              {voce.etichetta}
            </Link>
          ))}
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10">{children}</div>
      </main>
    </div>
  );
}
