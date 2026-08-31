"use client";

import { useActionState, useEffect, useRef } from "react";
import { aggiungiFornitore, type EsitoForm } from "./actions";

const statoIniziale: EsitoForm = { errore: null, successo: false };

/**
 * Aggiunta rapida di un fornitore, dentro un `<details>`: l'elenco resta la
 * cosa principale della pagina e il modulo si apre solo quando serve.
 */
export function NuovoFornitoreForm() {
  const [stato, azione, inCorso] = useActionState(aggiungiFornitore, statoIniziale);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (stato.successo) form.current?.reset();
  }, [stato.successo]);

  return (
    <details className="group scheda overflow-hidden">
      <summary className="marker:hidden [&::-webkit-details-marker]:hidden px-4 sm:px-5 py-3.5 cursor-pointer select-none flex items-center justify-between gap-4">
        <span className="text-sm font-medium">Aggiungi un fornitore</span>
        <span className="shrink-0 text-xs text-ink-muted border border-line rounded-lg px-3 py-1.5">
          <span className="group-open:hidden">Apri</span>
          <span className="hidden group-open:inline">Chiudi</span>
        </span>
      </summary>

      <form ref={form} action={azione} className="px-4 sm:px-5 pb-5 pt-4 border-t border-line flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block sm:col-span-2">
            <span className="block text-sm mb-1.5">Denominazione</span>
            <input name="denominazione" required className="campo-input" placeholder="Es. Aruba S.p.A." />
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Partita IVA</span>
            <input name="partitaIva" className="campo-input" inputMode="numeric" />
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Codice fiscale</span>
            <input name="codiceFiscale" className="campo-input" />
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Email</span>
            <input type="email" name="email" className="campo-input" />
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Telefono</span>
            <input name="telefono" className="campo-input" inputMode="tel" />
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Categoria abituale</span>
            <input
              name="categoriaPredefinita"
              className="campo-input"
              placeholder="Es. Servizi, Software, Trasferte"
            />
            <span className="block text-xs text-ink-faint mt-1.5">
              Si propone da sé quando registri una spesa da questo fornitore.
            </span>
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Note</span>
            <input name="note" className="campo-input" />
          </label>
        </div>

        {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}

        <button type="submit" disabled={inCorso} className="btn-primario self-start">
          {inCorso ? "Salvataggio…" : "Aggiungi"}
        </button>
      </form>
    </details>
  );
}
