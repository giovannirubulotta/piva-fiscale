"use client";

import { useActionState, useEffect, useRef } from "react";
import { aggiungiEvento, type EsitoForm } from "./actions";
import { ETICHETTE_TIPO_EVENTO, type EventoProprio } from "@/lib/domain/calendario";

const statoIniziale: EsitoForm = { errore: null, successo: false };

const TIPI = Object.keys(ETICHETTE_TIPO_EVENTO) as EventoProprio["tipo"][];

export interface OpzioneCliente {
  id: string;
  nome: string;
}

/**
 * Aggiunta di un evento.
 *
 * L'ora è facoltativa e non c'è nessuna casella «tutto il giorno»: se l'ora
 * non la scrivi, l'evento occupa la giornata. È la lettura naturale di
 * «giovedì, consegna», e una casella in più da spuntare per dire la stessa
 * cosa è una casella che si dimentica.
 */
export function NuovoEventoForm({
  clienti,
  dataPredefinita,
}: {
  clienti: OpzioneCliente[];
  dataPredefinita: string;
}) {
  const [stato, azione, inCorso] = useActionState(aggiungiEvento, statoIniziale);
  const form = useRef<HTMLFormElement>(null);

  // `reset()` tocca il DOM, non lo stato di React: azzerare il modulo dopo un
  // salvataggio riuscito non introduce un secondo render.
  useEffect(() => {
    if (stato.successo) form.current?.reset();
  }, [stato.successo]);

  return (
    <details className="group scheda overflow-hidden">
      <summary className="marker:hidden [&::-webkit-details-marker]:hidden px-4 sm:px-5 py-3.5 cursor-pointer select-none flex items-center justify-between gap-4">
        <span className="text-sm font-medium">Aggiungi in agenda</span>
        <span className="shrink-0 text-xs text-ink-muted border border-line rounded-lg px-3 py-1.5">
          <span className="group-open:hidden">Apri</span>
          <span className="hidden group-open:inline">Chiudi</span>
        </span>
      </summary>

      <form
        ref={form}
        action={azione}
        className="px-4 sm:px-5 pb-5 pt-4 border-t border-line flex flex-col gap-4"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block sm:col-span-2">
            <span className="block text-sm mb-1.5">Titolo</span>
            <input name="titolo" required className="campo-input" placeholder="Es. Consegna sito Rossi" />
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Giorno</span>
            <input
              type="date"
              name="dataInizio"
              required
              defaultValue={dataPredefinita}
              className="campo-input"
            />
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Tipo</span>
            <select name="tipo" className="campo-input" defaultValue="appuntamento">
              {TIPI.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {ETICHETTE_TIPO_EVENTO[tipo]}
                </option>
              ))}
            </select>
          </label>

          {/* Nessuna casella «tutto il giorno»: se l'ora resta vuota l'evento
              occupa la giornata. Una casella in più per dire la stessa cosa è
              una casella che si dimentica di spuntare. */}
          <label className="block">
            <span className="block text-sm mb-1.5">Dalle (facoltativo)</span>
            <input type="time" name="oraInizio" className="campo-input" />
          </label>
          <label className="block">
            <span className="block text-sm mb-1.5">Alle (facoltativo)</span>
            <input type="time" name="oraFine" className="campo-input" />
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Luogo</span>
            <input name="luogo" className="campo-input" placeholder="Indirizzo, videochiamata…" />
          </label>

          <label className="block">
            <span className="block text-sm mb-1.5">Cliente (facoltativo)</span>
            <select name="clienteId" className="campo-input" defaultValue="">
              <option value="">Nessuno</option>
              {clienti.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="block text-sm mb-1.5">Note</span>
            <textarea name="descrizione" rows={2} className="campo-input resize-y" />
          </label>
        </div>

        {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
        {stato.successo && <p className="text-sm text-ok">Aggiunto in agenda.</p>}

        <button type="submit" disabled={inCorso} className="btn-primario self-start">
          {inCorso ? "Salvataggio…" : "Aggiungi"}
        </button>
      </form>
    </details>
  );
}
