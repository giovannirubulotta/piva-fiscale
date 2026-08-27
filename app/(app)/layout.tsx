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
    { href: "/incassi", etichetta: "Incassi" },
    { href: "/spese", etichetta: "Spese" },
    { href: "/scadenze", etichetta: "Scadenze" },
    { href: "/impostazioni", etichetta: "Impostazioni" },
    { href: `/api/report?anno=${annoCorrente}`, etichetta: "Esporta CSV" },
  ];

  return (
    <div className="flex-1 flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-line bg-surface flex flex-col">
        <div className="px-5 py-5 border-b border-line">
          <div className="text-xs tracking-[0.2em] text-accent font-medium">GAR</div>
          <div className="text-sm text-ink-muted mt-0.5">Fiscale P.IVA</div>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
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
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
