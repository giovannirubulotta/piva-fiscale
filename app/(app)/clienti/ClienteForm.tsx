"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { EsitoForm } from "./actions";
import { InfoCampo } from "@/components/InfoCampo";
import { spiegazioni } from "@/lib/content/spiegazioniCampi";
import type { Cliente, TipologiaCliente } from "@/lib/domain/types";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export const ETICHETTA_TIPOLOGIA_CLIENTE: Record<TipologiaCliente, string> = {
  privato: "Privato (consumatore finale)",
  societa: "Società",
  professionista: "Professionista / ditta individuale",
  pubblica_amministrazione: "Pubblica amministrazione",
  associazione: "Associazione no profit",
  estero: "Soggetto estero",
};

/** Tipologie che identificano una persona fisica: mostrano nome e cognome invece della denominazione. */
const PERSONE_FISICHE: ReadonlySet<TipologiaCliente> = new Set(["privato"]);

export function ClienteForm({
  cliente,
  azione,
}: {
  cliente?: Cliente;
  azione: (prev: EsitoForm, formData: FormData) => Promise<EsitoForm>;
}) {
  const [stato, invia, inCorso] = useActionState(azione, statoIniziale);
  const [tipologia, setTipologia] = useState<TipologiaCliente>(cliente?.tipologia ?? "societa");
  const personaFisica = PERSONE_FISICHE.has(tipologia);

  return (
    <form action={invia} className="flex flex-col gap-6">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5 flex flex-col gap-4">
        <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Identità</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoCampo etichetta="Tipologia" spiegazione={spiegazioni.clienteTipologia}>
            <select
              name="tipologia"
              required
              value={tipologia}
              onChange={(e) => setTipologia(e.target.value as TipologiaCliente)}
              className="campo-input"
            >
              {Object.entries(ETICHETTA_TIPOLOGIA_CLIENTE).map(([valore, etichetta]) => (
                <option key={valore} value={valore}>
                  {etichetta}
                </option>
              ))}
            </select>
          </InfoCampo>

          {personaFisica ? (
            <div className="grid grid-cols-2 gap-4">
              <InfoCampo etichetta="Nome">
                <input name="nome" defaultValue={cliente?.nome ?? ""} className="campo-input" />
              </InfoCampo>
              <InfoCampo etichetta="Cognome">
                <input name="cognome" defaultValue={cliente?.cognome ?? ""} className="campo-input" />
              </InfoCampo>
            </div>
          ) : (
            <InfoCampo etichetta="Denominazione">
              <input
                name="denominazione"
                defaultValue={cliente?.denominazione ?? ""}
                className="campo-input"
                placeholder="Ragione sociale"
              />
            </InfoCampo>
          )}

          <InfoCampo etichetta="Partita IVA" spiegazione={spiegazioni.clientePartitaIva}>
            <input name="partitaIva" defaultValue={cliente?.partitaIva ?? ""} className="campo-input" inputMode="numeric" />
          </InfoCampo>
          <InfoCampo etichetta="Codice fiscale" spiegazione={spiegazioni.clienteCodiceFiscale}>
            <input name="codiceFiscale" defaultValue={cliente?.codiceFiscale ?? ""} className="campo-input uppercase" />
          </InfoCampo>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5 flex flex-col gap-4">
        <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Sede</h2>
        <div className="grid sm:grid-cols-6 gap-4">
          <div className="sm:col-span-4">
            <InfoCampo etichetta="Indirizzo">
              <input name="indirizzo" defaultValue={cliente?.indirizzo ?? ""} className="campo-input" />
            </InfoCampo>
          </div>
          <div className="sm:col-span-2">
            <InfoCampo etichetta="Numero civico">
              <input name="numeroCivico" defaultValue={cliente?.numeroCivico ?? ""} className="campo-input" />
            </InfoCampo>
          </div>
          <div className="sm:col-span-2">
            <InfoCampo etichetta="CAP">
              <input name="cap" defaultValue={cliente?.cap ?? ""} className="campo-input" inputMode="numeric" />
            </InfoCampo>
          </div>
          <div className="sm:col-span-3">
            <InfoCampo etichetta="Comune">
              <input name="comune" defaultValue={cliente?.comune ?? ""} className="campo-input" />
            </InfoCampo>
          </div>
          <InfoCampo etichetta="Prov.">
            <input name="provincia" defaultValue={cliente?.provincia ?? ""} maxLength={2} className="campo-input uppercase" />
          </InfoCampo>
          <InfoCampo etichetta="Nazione">
            <input name="nazione" defaultValue={cliente?.nazione ?? "IT"} maxLength={2} className="campo-input uppercase" />
          </InfoCampo>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5 flex flex-col gap-4">
        <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Recapito fattura elettronica</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoCampo etichetta="Codice destinatario SDI" spiegazione={spiegazioni.clienteCodiceDestinatario}>
            <input
              name="codiceDestinatario"
              defaultValue={cliente?.codiceDestinatario ?? "0000000"}
              maxLength={7}
              className="campo-input font-mono uppercase"
            />
          </InfoCampo>
          <InfoCampo etichetta="PEC destinatario" spiegazione={spiegazioni.clientePecDestinatario}>
            <input
              type="email"
              name="pecDestinatario"
              defaultValue={cliente?.pecDestinatario ?? ""}
              className="campo-input"
            />
          </InfoCampo>
          <InfoCampo etichetta="Email (per la copia di cortesia)">
            <input type="email" name="email" defaultValue={cliente?.email ?? ""} className="campo-input" />
          </InfoCampo>
          <InfoCampo etichetta="Telefono">
            <input type="tel" name="telefono" defaultValue={cliente?.telefono ?? ""} className="campo-input" />
          </InfoCampo>
          <div className="sm:col-span-2">
            <InfoCampo etichetta="Note">
              <input name="note" defaultValue={cliente?.note ?? ""} className="campo-input" />
            </InfoCampo>
          </div>
        </div>
      </section>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={inCorso} className="btn-primario">
          {inCorso ? "Salvataggio…" : cliente ? "Salva modifiche" : "Crea cliente"}
        </button>
        <Link href="/clienti" className="btn-secondario">
          Annulla
        </Link>
      </div>
    </form>
  );
}
