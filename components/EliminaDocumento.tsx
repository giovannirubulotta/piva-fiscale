"use client";

import { useActionState } from "react";
import { rimuoviFattura, type EsitoForm } from "@/app/(app)/fatture/actions";

const statoIniziale: EsitoForm = { errore: null, successo: false };

/**
 * Eliminazione di un documento fiscale, con le conseguenze scritte prima e non
 * dopo.
 *
 * Non è una conferma cerimoniale del tipo «sei sicuro?», che si impara a
 * cliccare senza leggere. È l'elenco di cosa cambia — il numero di trasmissione
 * che resta bruciato, l'incasso che esce dai riepiloghi dell'anno, gli allegati
 * che se ne vanno con lui. Chi legge decide con l'informazione in mano; chi non
 * legge ha comunque dovuto aprire un pannello e premere un secondo pulsante.
 */
export function EliminaDocumento({
  id,
  conseguenze,
  bloccato,
}: {
  id: string;
  conseguenze: string[];
  bloccato: string | null;
}) {
  const [stato, azione, inCorso] = useActionState(rimuoviFattura, statoIniziale);

  if (bloccato) {
    return (
      <div className="rounded-xl border border-line bg-surface-2 px-4 sm:px-5 py-4">
        <p className="text-sm font-medium text-ink">Questo documento non si può eliminare</p>
        <p className="text-sm text-ink-muted mt-1">{bloccato}</p>
      </div>
    );
  }

  return (
    <details className="group rounded-xl border border-line bg-surface overflow-hidden">
      <summary className="marker:hidden [&::-webkit-details-marker]:hidden px-4 sm:px-5 py-3.5 cursor-pointer select-none flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium">Elimina documento</div>
          <div className="text-xs text-ink-muted mt-0.5">Definitivo, senza cestino</div>
        </div>
        <span className="shrink-0 text-xs text-ink-muted border border-line rounded-lg px-3 py-1.5">
          <span className="group-open:hidden">Apri</span>
          <span className="hidden group-open:inline">Chiudi</span>
        </span>
      </summary>

      <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-line flex flex-col gap-4">
        <div>
          <p className="text-sm text-ink-muted mb-2">Cosa succede:</p>
          <ul className="flex flex-col gap-1.5">
            {conseguenze.map((avviso) => (
              <li key={avviso} className="text-sm text-ink-muted flex gap-2">
                <span aria-hidden="true" className="text-ink-faint">
                  —
                </span>
                <span>{avviso}</span>
              </li>
            ))}
          </ul>
        </div>

        {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}

        <form action={azione}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={inCorso}
            className="rounded-lg border border-danger/50 bg-danger/10 text-danger text-sm font-medium px-4 py-2.5 hover:bg-danger/20 transition disabled:opacity-50"
          >
            {inCorso ? "Eliminazione…" : "Elimina definitivamente"}
          </button>
        </form>
      </div>
    </details>
  );
}
