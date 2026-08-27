"use client";

import { useActionState } from "react";
import { aggiungiSpesa, type EsitoForm } from "./actions";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export function NuovaSpesaForm() {
  const [stato, azione, inCorso] = useActionState(aggiungiSpesa, statoIniziale);

  return (
    <form action={azione} className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-muted text-xs">Data</span>
          <input type="date" name="data" required className="campo-input" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="text-ink-muted text-xs">Descrizione</span>
          <input name="descrizione" required className="campo-input" placeholder="Es. abbonamento software" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-muted text-xs">Categoria (opzionale)</span>
          <input name="categoria" className="campo-input" placeholder="strumenti, trasporti…" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-muted text-xs">Importo (€)</span>
          <input type="number" step="0.01" min="0.01" name="importo" required className="campo-input" />
        </label>
      </div>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">Spesa registrata.</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : "Aggiungi spesa"}
      </button>
    </form>
  );
}
