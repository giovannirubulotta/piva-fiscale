"use client";

import { useActionState } from "react";
import { aggiornaProfilo, type EsitoForm } from "./actions";
import type { ProfiloCompleto } from "@/lib/data/profilo";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export function ProfiloForm({ profilo }: { profilo: ProfiloCompleto | null }) {
  const [stato, azione, inCorso] = useActionState(aggiornaProfilo, statoIniziale);

  return (
    <form action={azione} className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Campo etichetta="Partita IVA">
          <input
            name="partita_iva"
            defaultValue={profilo?.partitaIva ?? ""}
            className="campo-input"
            placeholder="13496870018"
          />
        </Campo>
        <Campo etichetta="Codice ATECO">
          <input name="codice_ateco" defaultValue={profilo?.codiceAteco ?? "73.11.02"} className="campo-input" />
        </Campo>
        <Campo etichetta="Data apertura P.IVA">
          <input
            type="date"
            name="data_apertura"
            defaultValue={profilo?.dataApertura ?? ""}
            required
            className="campo-input"
          />
        </Campo>
        <Campo etichetta="Coefficiente di redditività (%)">
          <input
            type="number"
            step="0.1"
            min="1"
            max="100"
            name="coefficiente_redditivita"
            defaultValue={profilo ? profilo.coefficienteRedditivita * 100 : 78}
            required
            className="campo-input"
          />
        </Campo>
      </div>

      <Campo etichetta="Aliquota agevolata 5% (primi 5 anni)">
        <select
          name="agevolazione_5_percento"
          defaultValue={profilo?.agevolazione5Percento === true ? "si" : profilo?.agevolazione5Percento === false ? "no" : "da_verificare"}
          className="campo-input"
        >
          <option value="da_verificare">Da verificare col commercialista (usa 15% per prudenza)</option>
          <option value="si">Confermata: applica il 5%</option>
          <option value="no">Esclusa: applica il 15%</option>
        </select>
      </Campo>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">Profilo salvato.</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : "Salva profilo"}
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
