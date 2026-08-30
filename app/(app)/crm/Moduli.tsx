"use client";

import { useActionState, useState } from "react";
import { aggiungiAttivita, aggiungiTrattativa, type EsitoForm } from "./actions";
import { ETICHETTE_ATTIVITA, ETICHETTE_FASE, FASI_APERTE, PROBABILITA_SUGGERITA } from "@/lib/domain/crm";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export interface OpzioneCliente {
  id: string;
  nome: string;
}

/**
 * I due moduli stanno dietro un `<details>` chiuso: la pagina serve soprattutto
 * a guardare la pipeline, e un form aperto in cima spinge in basso ciò che si
 * viene a vedere. Aprirli costa un clic, il pattern è lo stesso del menu mobile
 * e del sollecito.
 */
function Pannello({ titolo, descrizione, children }: { titolo: string; descrizione: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-line bg-surface overflow-hidden">
      <summary className="marker:hidden [&::-webkit-details-marker]:hidden px-4 sm:px-5 py-3.5 cursor-pointer select-none flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium">{titolo}</div>
          <div className="text-xs text-ink-muted mt-0.5">{descrizione}</div>
        </div>
        <span className="shrink-0 text-xs text-ink-muted border border-line rounded-lg px-3 py-1.5">
          <span className="group-open:hidden">Apri</span>
          <span className="hidden group-open:inline">Chiudi</span>
        </span>
      </summary>
      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-line">{children}</div>
    </details>
  );
}

export function NuovaTrattativaForm({ clienti }: { clienti: OpzioneCliente[] }) {
  const [stato, azione, inCorso] = useActionState(aggiungiTrattativa, statoIniziale);
  // La probabilità segue la fase finché non la si tocca: un valore suggerito
  // che si sovrascrive da solo dopo una modifica manuale è peggio di nessun
  // suggerimento.
  const [fase, setFase] = useState<(typeof FASI_APERTE)[number]>("contatto");
  const [probabilita, setProbabilita] = useState(PROBABILITA_SUGGERITA.contatto);
  const [toccata, setToccata] = useState(false);

  return (
    <Pannello titolo="Nuova trattativa" descrizione="Un'opportunità da seguire, con il suo valore atteso">
      <form action={azione} className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm mb-1.5">Cliente</span>
            <select name="clienteId" required className="campo-input" defaultValue="">
              <option value="" disabled>
                Scegli…
              </option>
              {clienti.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Titolo</span>
            <input name="titolo" required className="campo-input" placeholder="Es. restyling sito" />
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Fase</span>
            <select
              name="fase"
              className="campo-input"
              value={fase}
              onChange={(e) => {
                const nuova = e.target.value as (typeof FASI_APERTE)[number];
                setFase(nuova);
                if (!toccata) setProbabilita(PROBABILITA_SUGGERITA[nuova]);
              }}
            >
              {FASI_APERTE.map((f) => (
                <option key={f} value={f}>
                  {ETICHETTE_FASE[f]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Valore stimato (€)</span>
            <input type="number" step="0.01" min="0" name="valoreStimato" required className="campo-input" />
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Probabilità (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              name="probabilita"
              className="campo-input"
              value={probabilita}
              onChange={(e) => {
                setToccata(true);
                setProbabilita(Number(e.target.value));
              }}
            />
            <span className="block text-xs text-ink-faint mt-1.5">
              Suggerita dalla fase, ma decidi tu: due proposte allo stesso stadio non valgono uguale.
            </span>
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Chiusura prevista</span>
            <input type="date" name="dataPrevista" className="campo-input" />
          </label>
        </div>

        <label className="block">
          <span className="block text-sm mb-1.5">Note</span>
          <textarea name="note" rows={2} className="campo-input resize-y" />
        </label>

        {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
        {stato.successo && <p className="text-sm text-ok">Trattativa aggiunta.</p>}

        <button type="submit" disabled={inCorso} className="btn-primario self-start">
          {inCorso ? "Salvataggio…" : "Aggiungi trattativa"}
        </button>
      </form>
    </Pannello>
  );
}

export function NuovaAttivitaForm({
  clienti,
  clienteFisso,
}: {
  clienti: OpzioneCliente[];
  clienteFisso?: string;
}) {
  const [stato, azione, inCorso] = useActionState(aggiungiAttivita, statoIniziale);
  const oggi = new Date().toISOString().slice(0, 10);

  return (
    <Pannello titolo="Registra un contatto" descrizione="Cosa è successo, e cosa va fatto dopo">
      <form action={azione} className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-3 gap-4">
          {clienteFisso ? (
            <input type="hidden" name="clienteId" value={clienteFisso} />
          ) : (
            <label className="block">
              <span className="block text-sm mb-1.5">Cliente</span>
              <select name="clienteId" required className="campo-input" defaultValue="">
                <option value="" disabled>
                  Scegli…
                </option>
                {clienti.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="block text-sm mb-1.5">Tipo</span>
            <select name="tipo" className="campo-input" defaultValue="chiamata">
              {(Object.keys(ETICHETTE_ATTIVITA) as (keyof typeof ETICHETTE_ATTIVITA)[]).map((t) => (
                <option key={t} value={t}>
                  {ETICHETTE_ATTIVITA[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Data</span>
            <input type="date" name="data" required defaultValue={oggi} className="campo-input" />
          </label>
        </div>

        <label className="block">
          <span className="block text-sm mb-1.5">Cosa è successo</span>
          <textarea name="testo" rows={2} required className="campo-input resize-y" />
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm mb-1.5">Prossimo passo</span>
            <input name="prossimoPasso" className="campo-input" placeholder="Es. inviare il preventivo" />
          </label>
          <label className="block">
            <span className="block text-sm mb-1.5">Entro quando</span>
            <input type="date" name="dataProssimoPasso" className="campo-input" />
          </label>
        </div>

        {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
        {stato.successo && <p className="text-sm text-ok">Contatto registrato.</p>}

        <button type="submit" disabled={inCorso} className="btn-primario self-start">
          {inCorso ? "Salvataggio…" : "Registra"}
        </button>
      </form>
    </Pannello>
  );
}
