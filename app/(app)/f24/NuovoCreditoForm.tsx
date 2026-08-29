"use client";

import { useActionState } from "react";
import { aggiungiCredito, type EsitoForm } from "./actions";
import { InfoCampo } from "@/components/InfoCampo";
import { spiegazioni } from "@/lib/content/spiegazioniCampi";
import type { TipologiaCredito } from "@/lib/domain/types";

const statoIniziale: EsitoForm = { errore: null, successo: false };

const ETICHETTA_TIPOLOGIA: Record<TipologiaCredito, string> = {
  irpef: "IRPEF / addizionali",
  imposta_sostitutiva: "Imposta sostitutiva forfettaria",
  inps: "Contributi INPS",
  irap: "IRAP",
  altro: "Altro",
};

export function NuovoCreditoForm() {
  const [stato, azione, inCorso] = useActionState(aggiungiCredito, statoIniziale);
  const annoCorrente = new Date().getFullYear();

  return (
    <form action={azione} className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-4">
      <div className="grid sm:grid-cols-4 gap-4">
        <InfoCampo etichetta="Tipologia" spiegazione={spiegazioni.creditoTipologia}>
          <select name="tipologia" required defaultValue="imposta_sostitutiva" className="campo-input">
            {Object.entries(ETICHETTA_TIPOLOGIA).map(([valore, etichetta]) => (
              <option key={valore} value={valore}>
                {etichetta}
              </option>
            ))}
          </select>
        </InfoCampo>
        <InfoCampo etichetta="Anno di maturazione" spiegazione={spiegazioni.creditoAnnoMaturazione}>
          <input type="number" name="annoMaturazione" required defaultValue={annoCorrente} className="campo-input" />
        </InfoCampo>
        <InfoCampo etichetta="Importo (€)" spiegazione={spiegazioni.creditoImporto}>
          <input type="number" step="0.01" min="0.01" name="importo" required className="campo-input" />
        </InfoCampo>
        <InfoCampo etichetta="Note (opzionale)" spiegazione={spiegazioni.creditoNote}>
          <input name="note" className="campo-input" placeholder="es. LM47 dichiarazione 2027" />
        </InfoCampo>
      </div>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">Credito registrato.</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : "Aggiungi credito"}
      </button>
    </form>
  );
}
