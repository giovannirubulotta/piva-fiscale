"use client";

import { useActionState, useState } from "react";
import { aggiungiIncasso, type EsitoForm } from "./actions";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export function NuovoIncassoForm() {
  const [stato, azione, inCorso] = useActionState(aggiungiIncasso, statoIniziale);
  const [giaIncassata, setGiaIncassata] = useState(true);

  return (
    <form action={azione} className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Campo etichetta="Cliente">
          <input name="cliente" required className="campo-input" placeholder="Nome cliente" />
        </Campo>
        <Campo etichetta="Numero fattura (opzionale)">
          <input name="numero_fattura" className="campo-input" placeholder="1/2026" />
        </Campo>
        <Campo etichetta="Data emissione">
          <input type="date" name="data_emissione" required className="campo-input" />
        </Campo>
        <Campo etichetta="Importo netto (€)">
          <input type="number" step="0.01" min="0.01" name="importo_netto" required className="campo-input" />
        </Campo>
      </div>

      <Campo etichetta="Descrizione (opzionale)">
        <input name="descrizione" className="campo-input" placeholder="Es. gestione campagna social — agosto" />
      </Campo>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            name="gia_incassata"
            defaultChecked
            onChange={(e) => setGiaIncassata(e.target.checked)}
            className="accent-accent"
          />
          Già incassata
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" name="bollo_applicato" className="accent-accent" />
          Marca da bollo applicata (sopra 77,47 €)
        </label>
      </div>

      {giaIncassata && (
        <Campo etichetta="Data incasso">
          <input type="date" name="data_incasso" className="campo-input" />
        </Campo>
      )}

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">Incasso registrato.</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : "Aggiungi incasso"}
      </button>
    </form>
  );
}

function Campo({ etichetta, children }: { etichetta: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-ink-muted text-xs">{etichetta}</span>
      {children}
    </label>
  );
}
