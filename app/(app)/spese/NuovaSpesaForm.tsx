"use client";

import { useActionState } from "react";
import { aggiungiSpesa, type EsitoForm } from "./actions";
import { InfoCampo } from "@/components/InfoCampo";
import { spiegazioni } from "@/lib/content/spiegazioniCampi";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export function NuovaSpesaForm() {
  const [stato, azione, inCorso] = useActionState(aggiungiSpesa, statoIniziale);

  return (
    <form action={azione} className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <InfoCampo etichetta="Data" spiegazione={spiegazioni.speseData}>
          <input type="date" name="data" required className="campo-input" />
        </InfoCampo>
        <div className="sm:col-span-2">
          <InfoCampo etichetta="Descrizione" spiegazione={spiegazioni.speseDescrizione}>
            <input name="descrizione" required className="campo-input" placeholder="Es. abbonamento software" />
          </InfoCampo>
        </div>
        <InfoCampo etichetta="Categoria (opzionale)" spiegazione={spiegazioni.speseCategoria}>
          <input name="categoria" className="campo-input" placeholder="strumenti, trasporti…" />
        </InfoCampo>
        <InfoCampo etichetta="Importo (€)" spiegazione={spiegazioni.speseImporto}>
          <input type="number" step="0.01" min="0.01" name="importo" required className="campo-input" />
        </InfoCampo>
      </div>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">Spesa registrata.</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : "Aggiungi spesa"}
      </button>
    </form>
  );
}
