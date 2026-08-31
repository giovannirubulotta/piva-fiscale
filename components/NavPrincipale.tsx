"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GRUPPI_NAV, VOCI_BARRA_INFERIORE, voceAttiva } from "@/lib/ui/navigazione";

/**
 * Menu completo, raggruppato. Serve sia alla barra laterale sia al pannello
 * mobile: cambia l'involucro, non il contenuto.
 *
 * È un componente client per una ragione sola — sapere dove ci si trova. Senza
 * lo stato attivo, quattordici voci tutte uguali costringono a rileggere il
 * titolo della pagina ogni volta per capire in che sezione si è.
 */
export function MenuCompleto({ compatto = false }: { compatto?: boolean }) {
  const percorso = usePathname();

  return (
    <div className={compatto ? "flex flex-col gap-3" : "flex flex-col gap-4"}>
      {GRUPPI_NAV.map((gruppo, indice) => (
        <div key={gruppo.titolo ?? `gruppo-${indice}`} className="flex flex-col gap-0.5">
          {gruppo.titolo && (
            <div className="px-3 pb-1 text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
              {gruppo.titolo}
            </div>
          )}
          {gruppo.voci.map((voce) => {
            const attiva = voceAttiva(voce.href, percorso);
            return (
              <Link
                key={voce.href}
                href={voce.href}
                aria-current={attiva ? "page" : undefined}
                /* La voce attiva porta anche una barretta a sinistra, non solo
                   un fondo colorato: chi non distingue i colori vede comunque
                   dove si trova, e a colpo d'occhio la barretta si legge prima
                   della tinta. */
                className={`relative rounded-lg pl-4 pr-3 text-sm transition ${compatto ? "py-2.5" : "py-2"} ${
                  attiva
                    ? "bg-accent-soft text-accent font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-brand before:content-['']"
                    : "text-ink-muted hover:text-ink hover:bg-surface-2"
                }`}
              >
                {voce.etichetta}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * Barra inferiore su mobile: le quattro destinazioni quotidiane nella zona che
 * il pollice raggiunge senza cambiare presa. Un menu in alto, su un telefono,
 * costa una ginnastica della mano a ogni spostamento.
 */
export function BarraInferiore() {
  const percorso = usePathname();

  return (
    <nav
      aria-label="Navigazione rapida"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4">
        {VOCI_BARRA_INFERIORE.map((voce) => {
          const attiva = voceAttiva(voce.href, percorso);
          return (
            <Link
              key={voce.href}
              href={voce.href}
              aria-current={attiva ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 min-h-[3.25rem] py-2 text-[0.6875rem] transition ${
                attiva ? "text-accent" : "text-ink-muted"
              }`}
            >
              <Icona nome={voce.href} attiva={attiva} />
              {voce.etichetta}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Icone disegnate a mano invece che importate: cinque tracciati non giustificano
 * una dipendenza, e una libreria di icone porta con sé un peso che il
 * performance budget dovrebbe poi giustificare.
 *
 * Sono decorative — l'etichetta testuale sta sempre accanto — quindi
 * `aria-hidden`: leggerle due volte a uno screen reader è rumore.
 */
function Icona({ nome, attiva }: { nome: string; attiva: boolean }) {
  const comune = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: attiva ? 2 : 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (nome) {
    case "/":
      return (
        <svg {...comune}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V20h13V9.5" />
        </svg>
      );
    case "/fatture":
      return (
        <svg {...comune}>
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
          <path d="M9.5 8h5M9.5 12h5" />
        </svg>
      );
    case "/spese":
      return (
        <svg {...comune}>
          <path d="M3 7.5h18v12H3z" />
          <path d="M3 11h18" />
          <path d="M7 15.5h3" />
        </svg>
      );
    default:
      return (
        <svg {...comune}>
          <path d="M4 5.5h16v15H4z" />
          <path d="M4 10h16M8.5 3v4M15.5 3v4" />
        </svg>
      );
  }
}
