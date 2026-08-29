"use client";

import { useActionState } from "react";
import { aggiornaAliquote, type EsitoForm } from "./actions";
import type { AliquoteAnno } from "@/lib/domain/types";
import { InfoCampo } from "@/components/InfoCampo";
import { spiegazioni } from "@/lib/content/spiegazioniCampi";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export function AliquoteForm({ anno, aliquote }: { anno: number; aliquote: AliquoteAnno | null }) {
  const [stato, azione, inCorso] = useActionState(aggiornaAliquote, statoIniziale);

  return (
    <form action={azione} className="flex flex-col gap-4">
      <input type="hidden" name="anno" value={anno} />
      <div className="grid sm:grid-cols-2 gap-4">
        <InfoCampo etichetta="Imposta sostitutiva standard (%)" spiegazione={spiegazioni.aliquotaSostitutivaStandard}>
          <input
            type="number"
            step="0.01"
            name="aliquota_sostitutiva_standard"
            defaultValue={aliquote ? aliquote.aliquotaSostitutivaStandard * 100 : 15}
            required
            className="campo-input"
          />
        </InfoCampo>
        <InfoCampo etichetta="Imposta sostitutiva agevolata (%)" spiegazione={spiegazioni.aliquotaSostitutivaAgevolata}>
          <input
            type="number"
            step="0.01"
            name="aliquota_sostitutiva_agevolata"
            defaultValue={aliquote ? aliquote.aliquotaSostitutivaAgevolata * 100 : 5}
            required
            className="campo-input"
          />
        </InfoCampo>
        <InfoCampo etichetta="Contributi INPS Gestione Separata (%)" spiegazione={spiegazioni.aliquotaInps}>
          <input
            type="number"
            step="0.01"
            name="aliquota_inps"
            defaultValue={aliquote ? aliquote.aliquotaInps * 100 : 26.07}
            required
            className="campo-input"
          />
        </InfoCampo>
        <div />
        <InfoCampo etichetta="Massimale INPS (€)" spiegazione={spiegazioni.massimaleInps}>
          <input
            type="number"
            step="1"
            name="massimale_inps"
            defaultValue={aliquote?.massimaleInps ?? 122295}
            required
            className="campo-input"
          />
        </InfoCampo>
        <InfoCampo etichetta="Minimale INPS (€, ai fini dell'accredito)" spiegazione={spiegazioni.minimaleInps}>
          <input
            type="number"
            step="1"
            name="minimale_inps"
            defaultValue={aliquote?.minimaleInps ?? 18808}
            required
            className="campo-input"
          />
        </InfoCampo>
      </div>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">Aliquote {anno} salvate.</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : `Salva aliquote ${anno}`}
      </button>
    </form>
  );
}
