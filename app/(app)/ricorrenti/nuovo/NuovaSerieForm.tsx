"use client";

import { useActionState, useState } from "react";
import { salvaNuovoRicorrente, type EsitoForm } from "../actions";
import { formattaEuro } from "@/lib/ui/format";
import { ETICHETTE_CADENZA, MESI_PER_CADENZA, type Cadenza } from "@/lib/domain/ricorrenza";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export interface OpzioneCliente {
  id: string;
  nome: string;
}

export interface VoceRichiamabile {
  id: string;
  descrizione: string;
  prezzoUnitario: number;
  unitaMisura: string | null;
}

interface Riga {
  chiave: number;
  descrizione: string;
  quantita: string;
  unitaMisura: string;
  prezzoUnitario: string;
}

function rigaVuota(chiave: number): Riga {
  return { chiave, descrizione: "", quantita: "1", unitaMisura: "", prezzoUnitario: "" };
}

const CADENZE = Object.keys(MESI_PER_CADENZA) as Cadenza[];

/**
 * Composizione di una serie ricorrente.
 *
 * Mostra due totali invece di uno: quanto vale ogni scadenza e quanto vale in
 * un anno. Il secondo è il numero che conta davvero quando si decide un canone
 * — 250 € al mese sembrano poco finché non si legge 3.000 € l'anno — e nessuno
 * lo calcola a mente mentre compila un modulo.
 */
export function NuovaSerieForm({
  clienti,
  listino,
  oggi,
}: {
  clienti: OpzioneCliente[];
  listino: VoceRichiamabile[];
  oggi: string;
}) {
  const [stato, azione, inCorso] = useActionState(salvaNuovoRicorrente, statoIniziale);
  const [righe, setRighe] = useState<Riga[]>([rigaVuota(0)]);
  const [cadenza, setCadenza] = useState<Cadenza>("mensile");

  function aggiorna(chiave: number, campo: keyof Omit<Riga, "chiave">, valore: string) {
    setRighe((precedenti) =>
      precedenti.map((riga) => (riga.chiave === chiave ? { ...riga, [campo]: valore } : riga))
    );
  }

  function richiama(chiave: number, voceId: string) {
    const voce = listino.find((v) => v.id === voceId);
    if (!voce) return;
    setRighe((precedenti) =>
      precedenti.map((riga) =>
        riga.chiave === chiave
          ? {
              ...riga,
              descrizione: voce.descrizione,
              prezzoUnitario: String(voce.prezzoUnitario),
              unitaMisura: voce.unitaMisura ?? "",
            }
          : riga
      )
    );
  }

  // Stessa aritmetica in centesimi interi del dominio: un'anteprima che diverge
  // dal totale salvato è peggio di nessuna anteprima.
  const totale = righe.reduce((somma, riga) => {
    const quantita = Number(riga.quantita);
    const prezzo = Number(riga.prezzoUnitario);
    if (!Number.isFinite(quantita) || !Number.isFinite(prezzo)) return somma;
    return somma + Math.round(Math.round(prezzo * 100) * quantita);
  }, 0);
  const annuo = Math.round((totale * 12) / MESI_PER_CADENZA[cadenza]);

  return (
    <form action={azione} className="flex flex-col gap-6">
      <div className="scheda p-5 grid sm:grid-cols-2 gap-4">
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
          <span className="block text-sm mb-1.5">Nome della serie</span>
          <input
            name="descrizione_serie"
            required
            className="campo-input"
            placeholder="Es. Manutenzione sito — canone mensile"
          />
        </label>

        <label className="block">
          <span className="block text-sm mb-1.5">Si ripete</span>
          <select
            name="cadenza"
            className="campo-input"
            value={cadenza}
            onChange={(e) => setCadenza(e.target.value as Cadenza)}
          >
            {CADENZE.map((c) => (
              <option key={c} value={c}>
                {ETICHETTE_CADENZA[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-sm mb-1.5">Giorni per il pagamento</span>
          <input
            type="number"
            name="giorniScadenzaPagamento"
            min="0"
            defaultValue={30}
            className="campo-input"
          />
        </label>

        <label className="block">
          <span className="block text-sm mb-1.5">Prima scadenza</span>
          <input type="date" name="dataInizio" required defaultValue={oggi} className="campo-input" />
          <span className="block text-xs text-ink-faint mt-1.5">
            Il giorno del mese si conserva: partendo dal 31, febbraio si ferma al 28 e marzo torna al
            31.
          </span>
        </label>

        <label className="block">
          <span className="block text-sm mb-1.5">Fine (facoltativa)</span>
          <input type="date" name="dataFine" className="campo-input" />
          <span className="block text-xs text-ink-faint mt-1.5">
            Vuota per un canone senza scadenza. Si può sospendere in qualsiasi momento.
          </span>
        </label>
      </div>

      <div className="scheda overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-line flex items-center justify-between gap-3">
          <span className="etichetta-cifra">Righe di ogni fattura</span>
          <button
            type="button"
            onClick={() => setRighe((p) => [...p, rigaVuota(Date.now())])}
            className="text-sm text-accent hover:underline"
          >
            + Aggiungi riga
          </button>
        </div>

        <div className="divide-y divide-line">
          {righe.map((riga) => (
            <div key={riga.chiave} className="px-4 sm:px-5 py-4 flex flex-col gap-3">
              {listino.length > 0 && (
                <select
                  aria-label="Richiama dal listino"
                  className="campo-input text-ink-muted"
                  value=""
                  onChange={(e) => richiama(riga.chiave, e.target.value)}
                >
                  <option value="">Richiama dal listino…</option>
                  {listino.map((voce) => (
                    <option key={voce.id} value={voce.id}>
                      {voce.descrizione} — {formattaEuro(voce.prezzoUnitario)}
                    </option>
                  ))}
                </select>
              )}

              <input
                name="descrizione"
                required
                value={riga.descrizione}
                onChange={(e) => aggiorna(riga.chiave, "descrizione", e.target.value)}
                className="campo-input"
                placeholder="Descrizione della prestazione"
              />

              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="block text-xs text-ink-muted mb-1">Quantità</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="quantita"
                    value={riga.quantita}
                    onChange={(e) => aggiorna(riga.chiave, "quantita", e.target.value)}
                    className="campo-input"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs text-ink-muted mb-1">Unità</span>
                  <input
                    name="unitaMisura"
                    value={riga.unitaMisura}
                    onChange={(e) => aggiorna(riga.chiave, "unitaMisura", e.target.value)}
                    className="campo-input"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs text-ink-muted mb-1">Prezzo (€)</span>
                  <input
                    type="number"
                    step="0.01"
                    name="prezzoUnitario"
                    value={riga.prezzoUnitario}
                    onChange={(e) => aggiorna(riga.chiave, "prezzoUnitario", e.target.value)}
                    className="campo-input"
                  />
                </label>
              </div>

              {righe.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRighe((p) => p.filter((r) => r.chiave !== riga.chiave))}
                  className="text-xs text-danger hover:underline self-start"
                >
                  togli questa riga
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-line bg-surface-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <span className="text-sm text-ink-muted">
            Ogni scadenza{" "}
            <span className="text-ink font-medium tabular-nums">{formattaEuro(totale / 100)}</span>
          </span>
          <span className="text-sm text-ink-muted">
            All&apos;anno{" "}
            <span className="text-accent font-semibold tabular-nums text-base">
              {formattaEuro(annuo / 100)}
            </span>
          </span>
        </div>
      </div>

      <div className="scheda p-5 grid gap-4">
        <label className="block">
          <span className="block text-sm mb-1.5">Causale aggiuntiva in fattura</span>
          <input
            name="causaleAggiuntiva"
            className="campo-input"
            placeholder="Compare su ogni fattura della serie"
          />
        </label>
        <label className="block">
          <span className="block text-sm mb-1.5">Note interne</span>
          <input name="note" className="campo-input" placeholder="Non compaiono in fattura" />
        </label>
      </div>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : "Crea la serie"}
      </button>
    </form>
  );
}
