"use client";

import { useActionState } from "react";
import { aggiornaAliquote, type EsitoForm } from "./actions";
import type { AliquoteAnno } from "@/lib/domain/types";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export function AliquoteForm({ anno, aliquote }: { anno: number; aliquote: AliquoteAnno | null }) {
  const [stato, azione, inCorso] = useActionState(aggiornaAliquote, statoIniziale);

  return (
    <form action={azione} className="flex flex-col gap-4">
      <input type="hidden" name="anno" value={anno} />
      <div className="grid sm:grid-cols-2 gap-4">
        <Campo etichetta="Imposta sostitutiva standard (%)">
          <input
            type="number"
            step="0.01"
            name="aliquota_sostitutiva_standard"
            defaultValue={aliquote ? aliquote.aliquotaSostitutivaStandard * 100 : 15}
            required
            className="campo-input"
          />
        </Campo>
        <Campo etichetta="Imposta sostitutiva agevolata (%)">
          <input
            type="number"
            step="0.01"
            name="aliquota_sostitutiva_agevolata"
            defaultValue={aliquote ? aliquote.aliquotaSostitutivaAgevolata * 100 : 5}
            required
            className="campo-input"
          />
        </Campo>
        <Campo etichetta="Contributi INPS Gestione Separata (%)">
          <input
            type="number"
            step="0.01"
            name="aliquota_inps"
            defaultValue={aliquote ? aliquote.aliquotaInps * 100 : 26.07}
            required
            className="campo-input"
          />
        </Campo>
        <div />
        <Campo etichetta="Massimale INPS (€)">
          <input
            type="number"
            step="1"
            name="massimale_inps"
            defaultValue={aliquote?.massimaleInps ?? 122295}
            required
            className="campo-input"
          />
        </Campo>
        <Campo etichetta="Minimale INPS (€, ai fini dell'accredito)">
          <input
            type="number"
            step="1"
            name="minimale_inps"
            defaultValue={aliquote?.minimaleInps ?? 18808}
            required
            className="campo-input"
          />
        </Campo>
      </div>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">Aliquote {anno} salvate.</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : `Salva aliquote ${anno}`}
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
