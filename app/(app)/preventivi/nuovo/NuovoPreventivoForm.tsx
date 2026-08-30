"use client";

import { useActionState, useState } from "react";
import { salvaNuovoPreventivo, type EsitoForm } from "../actions";
import { formattaEuro } from "@/lib/ui/format";

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

/**
 * Compilazione di un preventivo, con il totale che si aggiorna mentre si scrive.
 *
 * Il totale in tempo reale non è un vezzo: un'offerta si costruisce guardando
 * dove arriva la somma, e doverla calcolare a mente mentre si aggiungono righe
 * è il momento in cui si sbaglia un prezzo.
 *
 * Le voci del listino si richiamano da un menu che riempie la riga: è la
 * ragione per cui il listino esiste, e tenerlo in una pagina che non parla con
 * questa lo renderebbe un archivio inerte.
 */
export function NuovoPreventivoForm({
  clienti,
  listino,
  oggi,
  fraTrentaGiorni,
}: {
  clienti: OpzioneCliente[];
  listino: VoceRichiamabile[];
  oggi: string;
  fraTrentaGiorni: string;
}) {
  const [stato, azione, inCorso] = useActionState(salvaNuovoPreventivo, statoIniziale);
  const [righe, setRighe] = useState<Riga[]>([rigaVuota(0)]);

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

  const totale = righe.reduce((somma, riga) => {
    const quantita = Number(riga.quantita);
    const prezzo = Number(riga.prezzoUnitario);
    if (!Number.isFinite(quantita) || !Number.isFinite(prezzo)) return somma;
    // Stessa aritmetica in centesimi del dominio: qui è solo un'anteprima, ma
    // un'anteprima che diverge dal totale salvato è peggio di nessuna anteprima.
    return somma + Math.round(Math.round(prezzo * 100) * quantita);
  }, 0);

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
          <span className="block text-sm mb-1.5">Oggetto</span>
          <input name="oggetto" className="campo-input" placeholder="Es. restyling del sito" />
        </label>

        <label className="block">
          <span className="block text-sm mb-1.5">Data</span>
          <input type="date" name="dataEmissione" required defaultValue={oggi} className="campo-input" />
        </label>

        <label className="block">
          <span className="block text-sm mb-1.5">Valido fino al</span>
          <input type="date" name="validoFinoAl" required defaultValue={fraTrentaGiorni} className="campo-input" />
          <span className="block text-xs text-ink-faint mt-1.5">
            Un preventivo senza scadenza è un impegno di prezzo a tempo indeterminato.
          </span>
        </label>
      </div>

      <div className="scheda overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-line flex items-center justify-between gap-3">
          <span className="text-xs text-ink-muted uppercase tracking-[0.08em] font-medium">Righe</span>
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

        <div className="px-4 sm:px-5 py-3 border-t border-line bg-surface-2 flex items-baseline justify-between">
          <span className="text-sm text-ink-muted">Totale</span>
          <span className="text-lg font-semibold tabular-nums text-accent">{formattaEuro(totale / 100)}</span>
        </div>
      </div>

      <div className="scheda p-5 grid gap-4">
        <label className="block">
          <span className="block text-sm mb-1.5">Condizioni</span>
          <textarea
            name="condizioni"
            rows={2}
            className="campo-input resize-y"
            placeholder="Tempi di consegna, modalità di pagamento, cosa non è compreso…"
          />
        </label>
        <label className="block">
          <span className="block text-sm mb-1.5">Note interne</span>
          <input name="note" className="campo-input" placeholder="Non compaiono nella stampa" />
        </label>
      </div>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : "Crea preventivo"}
      </button>
    </form>
  );
}
