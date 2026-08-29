"use client";

import { useActionState, useMemo, useState } from "react";
import { aggiornaRequisiti, type EsitoForm } from "./actions";
import type { EsitoRequisito, RequisitiForfettario } from "@/lib/domain/types";
import { valutaRequisitiForfettario } from "@/lib/domain/requisitiForfettario";
import { InfoCampo } from "@/components/InfoCampo";
import { spiegazioni } from "@/lib/content/spiegazioniCampi";

const statoIniziale: EsitoForm = { errore: null, successo: false };

type Tristato = "si" | "no" | "da_verificare";

function aTristato(valore: boolean | null): Tristato {
  return valore === true ? "si" : valore === false ? "no" : "da_verificare";
}

function daTristato(valore: Tristato): boolean | null {
  return valore === "si" ? true : valore === "no" ? false : null;
}

const STILE_ESITO: Record<EsitoRequisito, { testo: string; classe: string }> = {
  ok: { testo: "Nessuna causa di esclusione dichiarata", classe: "border-ok/40 bg-ok/10 text-ok" },
  da_verificare: { testo: "Alcuni punti non sono ancora stati verificati", classe: "border-warn/40 bg-warn/10 text-warn" },
  escluso: { testo: "Hai dichiarato una causa di esclusione dal regime forfettario", classe: "border-danger/40 bg-danger/10 text-danger" },
};

export function RequisitiForm({ anno, requisiti }: { anno: number; requisiti: RequisitiForfettario | null }) {
  const [stato, azione, inCorso] = useActionState(aggiornaRequisiti, statoIniziale);

  const [redditoLavoroDipendente, setRedditoLavoroDipendente] = useState<Tristato>(
    aTristato(requisiti?.redditoLavoroDipendenteOltreSoglia ?? null)
  );
  const [partecipazioniSocieta, setPartecipazioniSocieta] = useState<Tristato>(
    aTristato(requisiti?.partecipazioniSocietaRiconducibili ?? null)
  );
  const [committentePrevalente, setCommittentePrevalente] = useState<Tristato>(
    aTristato(requisiti?.committentePrevalenteExDatore ?? null)
  );
  const [residenzaFuoriUe, setResidenzaFuoriUe] = useState<Tristato>(aTristato(requisiti?.residenzaFuoriUeSee ?? null));

  const esito = useMemo(
    () =>
      valutaRequisitiForfettario({
        anno,
        redditoLavoroDipendenteOltreSoglia: daTristato(redditoLavoroDipendente),
        partecipazioniSocietaRiconducibili: daTristato(partecipazioniSocieta),
        committentePrevalenteExDatore: daTristato(committentePrevalente),
        residenzaFuoriUeSee: daTristato(residenzaFuoriUe),
      }),
    [anno, redditoLavoroDipendente, partecipazioniSocieta, committentePrevalente, residenzaFuoriUe]
  );

  const stileEsito = STILE_ESITO[esito.esitoGlobale];

  return (
    <form action={azione} className="flex flex-col gap-4">
      <input type="hidden" name="anno" value={anno} />

      <div className={`rounded-xl border px-4 py-3 text-sm ${stileEsito.classe}`}>{stileEsito.testo}</div>

      <div className="grid gap-4">
        <InfoCampo
          etichetta="Redditi da lavoro dipendente o pensione oltre 35.000 € (anno precedente)"
          spiegazione={spiegazioni.requisitoRedditoLavoroDipendente}
        >
          <SelectTristato
            name="reddito_lavoro_dipendente"
            valore={redditoLavoroDipendente}
            onChange={setRedditoLavoroDipendente}
          />
        </InfoCampo>

        <InfoCampo
          etichetta="Partecipazioni in società o associazioni riconducibili alla tua attività"
          spiegazione={spiegazioni.requisitoPartecipazioniSocieta}
        >
          <SelectTristato
            name="partecipazioni_societa"
            valore={partecipazioniSocieta}
            onChange={setPartecipazioniSocieta}
          />
        </InfoCampo>

        <InfoCampo
          etichetta="Committente prevalente che è stato tuo ex datore di lavoro"
          spiegazione={spiegazioni.requisitoCommittentePrevalenteExDatore}
        >
          <SelectTristato
            name="committente_prevalente_ex_datore"
            valore={committentePrevalente}
            onChange={setCommittentePrevalente}
          />
        </InfoCampo>

        <InfoCampo etichetta="Residenza fiscale fuori UE/SEE" spiegazione={spiegazioni.requisitoResidenzaFuoriUe}>
          <SelectTristato name="residenza_fuori_ue" valore={residenzaFuoriUe} onChange={setResidenzaFuoriUe} />
        </InfoCampo>
      </div>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">Autovalutazione {anno} salvata.</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : `Salva autovalutazione ${anno}`}
      </button>
    </form>
  );
}

function SelectTristato({
  name,
  valore,
  onChange,
}: {
  name: string;
  valore: Tristato;
  onChange: (v: Tristato) => void;
}) {
  return (
    <select name={name} value={valore} onChange={(e) => onChange(e.target.value as Tristato)} className="campo-input">
      <option value="da_verificare">Non ancora verificato</option>
      <option value="no">Verificato: non si applica</option>
      <option value="si">Verificato: si applica</option>
    </select>
  );
}
