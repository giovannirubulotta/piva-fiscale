"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cercaOvunque } from "@/app/(app)/ricerca";
import { ETICHETTE_TIPO, LUNGHEZZA_MINIMA, type RisultatoRicerca } from "@/lib/data/ricerca";

/**
 * Barra di comando: una casella che cerca ovunque e apre qualsiasi cosa.
 *
 * È l'elemento che distingue un software da un insieme di pagine. Con ⌘K (o
 * Ctrl+K) si arriva a un cliente, a una fattura o a un'azione senza sapere in
 * quale sezione vivono — la struttura dell'applicazione smette di essere
 * qualcosa da ricordare.
 *
 * Costruita su `<dialog>` nativo invece che su un div con `role="dialog"`: il
 * browser regala trappola del fuoco, chiusura con Esc, inertizzazione dello
 * sfondo e gestione dello stack. Riscriverli a mano significa riscriverli
 * peggio.
 */

/** Attesa prima di interrogare il server: sotto, si spara una query per ogni tasto premuto. */
const ATTESA_MS = 180;

interface Azione {
  etichetta: string;
  href: string;
  descrizione: string;
}

const AZIONI: Azione[] = [
  { etichetta: "Nuova fattura", href: "/fatture/nuova", descrizione: "Emetti un documento" },
  { etichetta: "Nuovo preventivo", href: "/preventivi/nuovo", descrizione: "Prepara un'offerta" },
  { etichetta: "Nuova serie ricorrente", href: "/ricorrenti/nuovo", descrizione: "Un canone che si ripete" },
  { etichetta: "Ricorrenti", href: "/ricorrenti", descrizione: "Canoni e scadenze maturate" },
  { etichetta: "Report", href: "/report", descrizione: "Fatturato, clienti, spese" },
  { etichetta: "Listino", href: "/listino", descrizione: "Prestazioni ricorrenti" },
  { etichetta: "Nuovo cliente", href: "/clienti/nuovo", descrizione: "Aggiungi in anagrafica" },
  { etichetta: "Trattative", href: "/crm", descrizione: "Pipeline e prossimi passi" },
  { etichetta: "Registra spesa", href: "/spese", descrizione: "Annota un costo" },
  { etichetta: "Fornitori", href: "/fornitori", descrizione: "Chi ti fattura" },
  { etichetta: "Carica documento", href: "/documenti", descrizione: "Archivia un file" },
  { etichetta: "Scadenze", href: "/scadenze", descrizione: "Cosa devi versare" },
  { etichetta: "Genera F24", href: "/f24", descrizione: "Prepara il modello" },
];

export function BarraComando() {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  const [aperta, setAperta] = useState(false);
  const [termine, setTermine] = useState("");
  const [risultati, setRisultati] = useState<RisultatoRicerca[]>([]);
  const [selezionato, setSelezionato] = useState(0);
  const [inCorso, avvia] = useTransition();

  const apri = useCallback(() => {
    setAperta(true);
    dialogo.current?.showModal();
    // Il fuoco va nel campo, non sul primo elemento focalizzabile: chi preme
    // ⌘K vuole scrivere, non tabulare fino alla casella.
    requestAnimationFrame(() => campo.current?.focus());
  }, []);

  const chiudi = useCallback(() => {
    dialogo.current?.close();
    setAperta(false);
    setTermine("");
    setRisultati([]);
    setSelezionato(0);
  }, []);

  useEffect(() => {
    function scorciatoia(evento: KeyboardEvent) {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        if (dialogo.current?.open) chiudi();
        else apri();
      }
    }
    window.addEventListener("keydown", scorciatoia);
    return () => window.removeEventListener("keydown", scorciatoia);
  }, [apri, chiudi]);

  const pulito = termine.trim();
  const abbastanzaLungo = pulito.length >= LUNGHEZZA_MINIMA;

  useEffect(() => {
    if (!aperta || !abbastanzaLungo) return;
    const attesa = setTimeout(() => {
      avvia(async () => {
        const trovati = await cercaOvunque(pulito);
        setRisultati(trovati);
        setSelezionato(0);
      });
    }, ATTESA_MS);
    return () => clearTimeout(attesa);
  }, [pulito, aperta, abbastanzaLungo]);

  // I risultati sotto la soglia si derivano invece di azzerarli con un
  // `setState` dentro l'effetto: uno stato che si può calcolare non va
  // memorizzato, e scriverlo durante un effetto costa un secondo render.
  const risultatiVisibili = abbastanzaLungo ? risultati : [];

  const azioniVisibili = AZIONI.filter((a) =>
    pulito.length === 0 ? true : a.etichetta.toLowerCase().includes(pulito.toLowerCase())
  );
  const voci: { chiave: string; href: string; titolo: string; sottotitolo: string; gruppo: string }[] = [
    ...azioniVisibili.map((a) => ({
      chiave: `azione:${a.href}`,
      href: a.href,
      titolo: a.etichetta,
      sottotitolo: a.descrizione,
      gruppo: "Azioni",
    })),
    ...risultatiVisibili.map((r) => ({
      chiave: `${r.tipo}:${r.id}`,
      href: r.href,
      titolo: r.titolo,
      sottotitolo: r.sottotitolo,
      gruppo: ETICHETTE_TIPO[r.tipo],
    })),
  ];

  /** Il target è il <dialog> stesso solo quando si colpisce lo sfondo, non il riquadro. */
  function clicSuSfondo(evento: React.MouseEvent<HTMLDialogElement>) {
    if (evento.target === evento.currentTarget) chiudi();
  }

  function tastiera(evento: React.KeyboardEvent) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setSelezionato((i) => Math.min(i + 1, voci.length - 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setSelezionato((i) => Math.max(i - 1, 0));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      const voce = voci[selezionato];
      if (voce) {
        chiudi();
        router.push(voce.href);
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={apri}
        className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 h-9 text-sm text-ink-muted hover:text-ink hover:border-ink-faint transition w-full max-w-md"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <span className="flex-1 text-left">Cerca o esegui…</span>
        <kbd className="hidden sm:inline text-[0.6875rem] text-ink-faint border border-line rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </button>

      <dialog
        ref={dialogo}
        onClose={chiudi}
        onClick={clicSuSfondo}
        className="m-0 mx-auto mt-[10vh] w-[min(38rem,92vw)] rounded-xl border border-line bg-surface p-0 text-ink shadow-[var(--ombra-alta)] backdrop:bg-ink/25"
        aria-label="Cerca o esegui un comando"
      >
        <div className="border-b border-line px-4 py-3">
          <input
            ref={campo}
            value={termine}
            onChange={(e) => setTermine(e.target.value)}
            onKeyDown={tastiera}
            placeholder="Cliente, numero di fattura, documento, azione…"
            aria-label="Termine di ricerca"
            className="w-full bg-transparent text-base outline-none placeholder:text-ink-faint"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-2">
          {voci.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              {termine.trim().length < LUNGHEZZA_MINIMA
                ? "Scrivi almeno due caratteri."
                : inCorso
                  ? "Cerco…"
                  : "Nessun risultato."}
            </p>
          ) : (
            voci.map((voce, indice) => {
              const attivo = indice === selezionato;
              const primoDelGruppo = indice === 0 || voci[indice - 1].gruppo !== voce.gruppo;
              return (
                <div key={voce.chiave}>
                  {primoDelGruppo && (
                    <div className="px-4 pt-2 pb-1 text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
                      {voce.gruppo}
                    </div>
                  )}
                  <Link
                    href={voce.href}
                    onMouseEnter={() => setSelezionato(indice)}
                    onClick={chiudi}
                    className={`w-full text-left px-4 py-2.5 flex items-baseline gap-3 transition ${
                      attivo ? "bg-accent-soft" : ""
                    }`}
                  >
                    <span className={`text-sm ${attivo ? "text-accent" : "text-ink"}`}>{voce.titolo}</span>
                    <span className="text-xs text-ink-faint truncate">{voce.sottotitolo}</span>
                  </Link>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-line px-4 py-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-ink-faint">
          <span>↑↓ per scorrere</span>
          <span>↵ per aprire</span>
          <span>Esc per chiudere</span>
        </div>
      </dialog>
    </>
  );
}
