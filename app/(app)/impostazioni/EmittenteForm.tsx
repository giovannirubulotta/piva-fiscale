"use client";

import { useActionState } from "react";
import { aggiornaDatiEmittente, type EsitoForm } from "./actions";
import { InfoCampo } from "@/components/InfoCampo";
import { spiegazioni } from "@/lib/content/spiegazioniCampi";
import type { DatiEmittente } from "@/lib/domain/types";

const statoIniziale: EsitoForm = { errore: null, successo: false };

/**
 * Dati che finiscono nella fattura e nel blocco CedentePrestatore dell'XML.
 * Sono separati dal profilo fiscale perché rispondono a domande diverse: qui
 * "chi sei e dove ti pagano", là "come si calcolano le tue imposte".
 */
export function EmittenteForm({ emittente }: { emittente: DatiEmittente | null }) {
  const [stato, invia, inCorso] = useActionState(aggiornaDatiEmittente, statoIniziale);

  return (
    <form action={invia} className="rounded-xl border border-line bg-surface p-4 sm:p-5 flex flex-col gap-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <InfoCampo etichetta="Nome">
          <input name="nome" defaultValue={emittente?.nome ?? ""} className="campo-input" autoComplete="given-name" />
        </InfoCampo>
        <InfoCampo etichetta="Cognome">
          <input name="cognome" defaultValue={emittente?.cognome ?? ""} className="campo-input" autoComplete="family-name" />
        </InfoCampo>
        <div className="sm:col-span-2">
          <InfoCampo etichetta="Codice fiscale" spiegazione={spiegazioni.emittenteCodiceFiscale}>
            <input
              name="codiceFiscale"
              defaultValue={emittente?.codiceFiscale ?? ""}
              className="campo-input uppercase font-mono"
              maxLength={16}
            />
          </InfoCampo>
        </div>
      </div>

      <div className="grid sm:grid-cols-6 gap-4 border-t border-line pt-5">
        <div className="sm:col-span-4">
          <InfoCampo etichetta="Indirizzo">
            <input name="indirizzo" defaultValue={emittente?.indirizzo ?? ""} className="campo-input" autoComplete="street-address" />
          </InfoCampo>
        </div>
        <div className="sm:col-span-2">
          <InfoCampo etichetta="Numero civico">
            <input name="numeroCivico" defaultValue={emittente?.numeroCivico ?? ""} className="campo-input" />
          </InfoCampo>
        </div>
        <div className="sm:col-span-2">
          <InfoCampo etichetta="CAP">
            <input name="cap" defaultValue={emittente?.cap ?? ""} className="campo-input" inputMode="numeric" autoComplete="postal-code" />
          </InfoCampo>
        </div>
        <div className="sm:col-span-3">
          <InfoCampo etichetta="Comune">
            <input name="comune" defaultValue={emittente?.comune ?? ""} className="campo-input" />
          </InfoCampo>
        </div>
        <InfoCampo etichetta="Prov.">
          <input name="provincia" defaultValue={emittente?.provincia ?? ""} maxLength={2} className="campo-input uppercase" />
        </InfoCampo>
        <input type="hidden" name="nazione" value={emittente?.nazione ?? "IT"} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 border-t border-line pt-5">
        <InfoCampo etichetta="Email">
          <input type="email" name="email" defaultValue={emittente?.email ?? ""} className="campo-input" autoComplete="email" />
        </InfoCampo>
        <InfoCampo etichetta="Telefono">
          <input type="tel" name="telefono" defaultValue={emittente?.telefono ?? ""} className="campo-input" autoComplete="tel" />
        </InfoCampo>
        <div className="sm:col-span-2">
          <InfoCampo etichetta="IBAN" spiegazione={spiegazioni.emittenteIban}>
            <input name="iban" defaultValue={emittente?.iban ?? ""} className="campo-input uppercase font-mono" />
          </InfoCampo>
        </div>
      </div>

      <label className="flex items-start gap-3 border-t border-line pt-5 cursor-pointer text-sm">
        <input
          type="checkbox"
          name="bolloRiaddebitato"
          defaultChecked={emittente?.bolloRiaddebitato ?? true}
          className="mt-1"
        />
        <span>
          <span className="flex items-center gap-1.5">
            Addebita il bollo da 2 € al cliente
            <span className="text-ink-faint text-xs">(predefinito per le nuove fatture)</span>
          </span>
          <span className="block text-xs text-ink-muted mt-1">
            Se attivo, il bollo entra in fattura come riga a carico del cliente e — attenzione — concorre al tuo
            reddito imponibile forfettario. Se disattivo, resta a tuo carico e non è un ricavo. Puoi comunque
            cambiarlo su ogni singola fattura.
          </span>
        </span>
      </label>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">Dati salvati.</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : "Salva dati fatturazione"}
      </button>
    </form>
  );
}
