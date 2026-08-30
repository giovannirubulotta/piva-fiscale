"use client";

import { useActionState, useRef } from "react";
import { aggiungiVoce, type EsitoForm } from "./actions";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export function NuovaVoceForm() {
  const [stato, azione, inCorso] = useActionState(aggiungiVoce, statoIniziale);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      action={async (dati: FormData) => {
        await azione(dati);
        form.current?.reset();
      }}
      className="scheda p-5 flex flex-col gap-4"
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <label className="block sm:col-span-2">
          <span className="block text-sm mb-1.5">Descrizione</span>
          <input name="descrizione" required className="campo-input" placeholder="Es. giornata di sviluppo" />
        </label>
        <label className="block">
          <span className="block text-sm mb-1.5">Prezzo (€)</span>
          <input type="number" step="0.01" min="0" name="prezzoUnitario" required className="campo-input" />
        </label>
        <label className="block">
          <span className="block text-sm mb-1.5">Unità</span>
          <input name="unitaMisura" className="campo-input" placeholder="giorno, ora, pezzo…" />
        </label>
        <label className="block">
          <span className="block text-sm mb-1.5">Categoria</span>
          <input name="categoria" className="campo-input" placeholder="sviluppo, consulenza…" />
        </label>
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="block text-sm mb-1.5">Note</span>
          <input name="note" className="campo-input" placeholder="Cosa comprende, condizioni…" />
        </label>
      </div>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">Voce aggiunta.</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : "Aggiungi al listino"}
      </button>
    </form>
  );
}
