"use client";

import { useActionState, useState } from "react";
import { aggiungiSpesa, type EsitoForm } from "./actions";
import { InfoCampo } from "@/components/InfoCampo";
import { spiegazioni } from "@/lib/content/spiegazioniCampi";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export interface OpzioneFornitore {
  id: string;
  denominazione: string;
  categoriaPredefinita: string | null;
}

export function NuovaSpesaForm({ fornitori }: { fornitori: OpzioneFornitore[] }) {
  const [stato, azione, inCorso] = useActionState(aggiungiSpesa, statoIniziale);
  const [categoria, setCategoria] = useState("");

  /**
   * Scegliendo un fornitore la categoria si riempie da sé, se quella scheda ne
   * ha una abituale. Resta modificabile: è un suggerimento, non un vincolo —
   * dallo stesso fornitore può arrivare una spesa di tipo diverso.
   */
  function scegliFornitore(id: string) {
    const fornitore = fornitori.find((f) => f.id === id);
    if (fornitore?.categoriaPredefinita) setCategoria(fornitore.categoriaPredefinita);
  }

  return (
    <form action={azione} className="scheda p-5 flex flex-col gap-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <InfoCampo etichetta="Data" spiegazione={spiegazioni.speseData}>
          <input type="date" name="data" required className="campo-input" />
        </InfoCampo>
        <div className="sm:col-span-2">
          <InfoCampo etichetta="Descrizione" spiegazione={spiegazioni.speseDescrizione}>
            <input name="descrizione" required className="campo-input" placeholder="Es. abbonamento software" />
          </InfoCampo>
        </div>

        <label className="block">
          <span className="block text-sm mb-1.5">Fornitore (opzionale)</span>
          <select
            name="fornitoreId"
            className="campo-input"
            defaultValue=""
            onChange={(e) => scegliFornitore(e.target.value)}
          >
            <option value="">Nessuno</option>
            {fornitori.map((f) => (
              <option key={f.id} value={f.id}>
                {f.denominazione}
              </option>
            ))}
          </select>
        </label>

        <InfoCampo etichetta="Categoria (opzionale)" spiegazione={spiegazioni.speseCategoria}>
          <input
            name="categoria"
            className="campo-input"
            placeholder="strumenti, trasporti…"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
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
