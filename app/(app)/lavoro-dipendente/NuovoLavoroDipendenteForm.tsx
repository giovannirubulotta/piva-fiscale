"use client";

import { useActionState } from "react";
import { aggiungiLavoroDipendente, type EsitoForm } from "./actions";
import { InfoCampo } from "@/components/InfoCampo";
import { spiegazioni } from "@/lib/content/spiegazioniCampi";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export function NuovoLavoroDipendenteForm() {
  const [stato, azione, inCorso] = useActionState(aggiungiLavoroDipendente, statoIniziale);
  const annoCorrente = new Date().getFullYear();

  return (
    <form action={azione} className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <InfoCampo etichetta="Anno" spiegazione={spiegazioni.lavoroAnno}>
          <input type="number" name="anno" required defaultValue={annoCorrente} className="campo-input" />
        </InfoCampo>
        <div className="sm:col-span-2">
          <InfoCampo etichetta="Datore di lavoro (opzionale)" spiegazione={spiegazioni.lavoroDatoreLavoro}>
            <input name="datoreLavoro" className="campo-input" placeholder="Ragione sociale" />
          </InfoCampo>
        </div>
        <InfoCampo etichetta="Reddito imponibile (€)" spiegazione={spiegazioni.lavoroRedditoImponibile}>
          <input type="number" step="0.01" min="0" name="redditoImponibile" required className="campo-input" />
        </InfoCampo>
        <InfoCampo etichetta="Ritenute IRPEF (€)" spiegazione={spiegazioni.lavoroRitenuteIrpef}>
          <input type="number" step="0.01" min="0" name="ritenuteIrpef" defaultValue={0} className="campo-input" />
        </InfoCampo>
        <InfoCampo etichetta="Addizionale regionale (€)" spiegazione={spiegazioni.lavoroAddizionaleRegionale}>
          <input
            type="number"
            step="0.01"
            min="0"
            name="addizionaleRegionale"
            defaultValue={0}
            className="campo-input"
          />
        </InfoCampo>
        <InfoCampo etichetta="Addizionale comunale (€)" spiegazione={spiegazioni.lavoroAddizionaleComunale}>
          <input
            type="number"
            step="0.01"
            min="0"
            name="addizionaleComunale"
            defaultValue={0}
            className="campo-input"
          />
        </InfoCampo>
        <div className="sm:col-span-3">
          <InfoCampo etichetta="Note (opzionale)">
            <input name="note" className="campo-input" placeholder="es. CU 2027, rapporto gennaio-dicembre" />
          </InfoCampo>
        </div>
      </div>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">Dati della CU registrati.</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : "Aggiungi CU"}
      </button>
    </form>
  );
}
