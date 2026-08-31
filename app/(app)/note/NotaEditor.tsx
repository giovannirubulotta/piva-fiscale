"use client";

import { useActionState, useEffect, useRef } from "react";
import { aggiungiNota, modificaNota, type EsitoForm } from "./actions";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export interface OpzioneCliente {
  id: string;
  nome: string;
}

export interface NotaModificabile {
  id: string;
  titolo: string | null;
  testo: string;
  clienteId: string | null;
  etichette: string[];
}

/**
 * Scrittura di una nota.
 *
 * Il campo del testo è la prima cosa e la più grande: tutto il resto —
 * titolo, cliente, etichette — è facoltativo e sta sotto. Un modulo che
 * chiede la classificazione prima del contenuto è un modulo su cui si
 * rinuncia a scrivere l'appunto.
 */
export function NotaEditor({
  clienti,
  nota,
  clientePredefinito,
  onFine,
}: {
  clienti: OpzioneCliente[];
  /** Presente in modifica, assente in creazione. */
  nota?: NotaModificabile;
  clientePredefinito?: string;
  onFine?: () => void;
}) {
  const [stato, azione, inCorso] = useActionState(
    nota ? modificaNota : aggiungiNota,
    statoIniziale
  );
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!stato.successo) return;
    if (!nota) form.current?.reset();
    onFine?.();
  }, [stato.successo, nota, onFine]);

  return (
    <form ref={form} action={azione} className="flex flex-col gap-3">
      {nota && <input type="hidden" name="id" value={nota.id} />}

      <textarea
        name="testo"
        required
        rows={nota ? 8 : 4}
        defaultValue={nota?.testo}
        className="campo-input resize-y"
        placeholder="Scrivi qui. La prima riga diventa il titolo, se non ne metti uno."
      />

      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-xs text-ink-muted mb-1">Titolo (facoltativo)</span>
          <input name="titolo" defaultValue={nota?.titolo ?? ""} className="campo-input" />
        </label>

        <label className="block">
          <span className="block text-xs text-ink-muted mb-1">Cliente</span>
          <select
            name="clienteId"
            className="campo-input"
            defaultValue={nota?.clienteId ?? clientePredefinito ?? ""}
          >
            <option value="">Nessuno</option>
            {clienti.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs text-ink-muted mb-1">Etichette</span>
          <input
            name="etichette"
            defaultValue={nota?.etichette.join(", ") ?? ""}
            className="campo-input"
            placeholder="separate da virgola"
          />
        </label>
      </div>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && !nota && <p className="text-sm text-ok">Annotato.</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : nota ? "Salva le modifiche" : "Annota"}
      </button>
    </form>
  );
}
