"use client";

import { useActionState, useMemo, useState } from "react";
import { aggiornaProfilo, type EsitoForm } from "./actions";
import type { ProfiloCompleto } from "@/lib/data/profilo";
import type { CoefficienteAteco } from "@/lib/domain/types";
import { trovaCoefficienteAteco } from "@/lib/domain/ateco";
import { InfoCampo } from "@/components/InfoCampo";
import { spiegazioni } from "@/lib/content/spiegazioniCampi";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export function ProfiloForm({
  profilo,
  coefficientiAteco,
}: {
  profilo: ProfiloCompleto | null;
  coefficientiAteco: CoefficienteAteco[];
}) {
  const [stato, azione, inCorso] = useActionState(aggiornaProfilo, statoIniziale);

  const codiceAtecoIniziale = profilo?.codiceAteco ?? "73.11.02";
  const [codiceAteco, setCodiceAteco] = useState(codiceAtecoIniziale);
  // Il coefficiente resta modificabile a mano (per un caso limite non
  // coperto dalla tabella): l'automatismo lo aggiorna solo quando cambia
  // il codice ATECO, senza sovrascrivere una correzione manuale successiva.
  const [coefficientePercento, setCoefficientePercento] = useState(profilo ? profilo.coefficienteRedditivita * 100 : 78);

  const risultatoAteco = useMemo(
    () => trovaCoefficienteAteco(codiceAteco, coefficientiAteco),
    [codiceAteco, coefficientiAteco]
  );

  function aggiornaCodiceAteco(valore: string) {
    setCodiceAteco(valore);
    const risultato = trovaCoefficienteAteco(valore, coefficientiAteco);
    if (risultato) {
      setCoefficientePercento(Math.round(risultato.coefficiente * 1000) / 10);
    }
  }

  return (
    <form action={azione} className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <InfoCampo etichetta="Partita IVA" spiegazione={spiegazioni.partitaIva}>
          <input
            name="partita_iva"
            defaultValue={profilo?.partitaIva ?? ""}
            className="campo-input"
            placeholder="13496870018"
          />
        </InfoCampo>
        <InfoCampo etichetta="Codice ATECO" spiegazione={spiegazioni.codiceAteco}>
          <input
            name="codice_ateco"
            value={codiceAteco}
            onChange={(e) => aggiornaCodiceAteco(e.target.value)}
            className="campo-input"
          />
        </InfoCampo>
        <InfoCampo etichetta="Data apertura P.IVA" spiegazione={spiegazioni.dataApertura}>
          <input
            type="date"
            name="data_apertura"
            defaultValue={profilo?.dataApertura ?? ""}
            required
            className="campo-input"
          />
        </InfoCampo>
        <InfoCampo etichetta="Coefficiente di redditività (%)" spiegazione={spiegazioni.coefficienteRedditivita}>
          <input
            type="number"
            step="0.1"
            min="1"
            max="100"
            name="coefficiente_redditivita"
            value={coefficientePercento}
            onChange={(e) => setCoefficientePercento(Number(e.target.value))}
            required
            className="campo-input"
          />
        </InfoCampo>
      </div>

      {risultatoAteco ? (
        <p className={`text-xs ${risultatoAteco.predefinito ? "text-warn" : "text-ink-muted"}`}>
          {risultatoAteco.predefinito ? (
            <>
              Codice ATECO non riconosciuto in una categoria specifica dell&apos;Allegato 4: applicato il coefficiente
              residuale &quot;Altre attività economiche&quot; (gruppo 9, {risultatoAteco.coefficiente * 100}%).
              Verifica che sia corretto — puoi correggerlo a mano sopra.
            </>
          ) : (
            <>
              Rilevato automaticamente: gruppo {risultatoAteco.gruppo} — {risultatoAteco.settore} (
              {risultatoAteco.coefficiente * 100}%). Puoi correggerlo a mano se il tuo caso è particolare.
            </>
          )}
        </p>
      ) : (
        <p className="text-xs text-ink-muted">
          Scrivi il codice ATECO per rilevare automaticamente il coefficiente di redditività.
        </p>
      )}

      <InfoCampo etichetta="Aliquota agevolata 5% (primi 5 anni)" spiegazione={spiegazioni.agevolazione5Percento}>
        <select
          name="agevolazione_5_percento"
          defaultValue={profilo?.agevolazione5Percento === true ? "si" : profilo?.agevolazione5Percento === false ? "no" : "da_verificare"}
          className="campo-input"
        >
          <option value="da_verificare">Da verificare col commercialista (usa 15% per prudenza)</option>
          <option value="si">Confermata: applica il 5%</option>
          <option value="no">Esclusa: applica il 15%</option>
        </select>
      </InfoCampo>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">Profilo salvato.</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : "Salva profilo"}
      </button>
    </form>
  );
}
