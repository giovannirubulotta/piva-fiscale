"use client";

import { useActionState, useRef } from "react";
import { caricaDocumento, type EsitoForm } from "./actions";

const statoIniziale: EsitoForm = { errore: null, successo: false };

export interface OpzioneCollegamento {
  valore: string;
  etichetta: string;
}

/**
 * Caricamento di un documento nell'archivio.
 *
 * Il collegamento a una fattura o a una spesa è facoltativo e passa da un unico
 * menu: `fattura:<id>` o `spesa:<id>`. Due menu separati renderebbero possibile
 * sceglierne due, che il vincolo del database rifiuta — meglio non offrire
 * affatto uno stato che poi va respinto.
 */
export function CaricaDocumentoForm({
  fatture,
  spese,
}: {
  fatture: OpzioneCollegamento[];
  spese: OpzioneCollegamento[];
}) {
  const [stato, azione, inCorso] = useActionState(caricaDocumento, statoIniziale);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      action={async (dati: FormData) => {
        const collegamento = String(dati.get("collegamento") ?? "");
        if (collegamento.startsWith("fattura:")) dati.set("fatturaId", collegamento.slice(8));
        if (collegamento.startsWith("spesa:")) dati.set("spesaId", collegamento.slice(6));
        dati.delete("collegamento");
        await azione(dati);
        form.current?.reset();
      }}
      className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-4"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="file" className="block text-sm mb-1.5">
            File
          </label>
          <input
            id="file"
            type="file"
            name="file"
            required
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.xml,.csv,.txt"
            className="campo-input file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1 file:text-sm file:text-ink"
          />
          <p className="text-xs text-ink-faint mt-1.5">PDF, immagini, XML, CSV o testo. Fino a 10 MB.</p>
        </div>

        <div>
          <label htmlFor="descrizione" className="block text-sm mb-1.5">
            Descrizione (facoltativa)
          </label>
          <input
            id="descrizione"
            name="descrizione"
            className="campo-input"
            placeholder="Es. quietanza F24 saldo 2025"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="collegamento" className="block text-sm mb-1.5">
            Collega a (facoltativo)
          </label>
          <select id="collegamento" name="collegamento" className="campo-input" defaultValue="">
            <option value="">Nessun collegamento — documento d&apos;archivio</option>
            {fatture.length > 0 && (
              <optgroup label="Fatture">
                {fatture.map((f) => (
                  <option key={f.valore} value={`fattura:${f.valore}`}>
                    {f.etichetta}
                  </option>
                ))}
              </optgroup>
            )}
            {spese.length > 0 && (
              <optgroup label="Spese">
                {spese.map((s) => (
                  <option key={s.valore} value={`spesa:${s.valore}`}>
                    {s.etichetta}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">Documento caricato.</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Caricamento…" : "Carica documento"}
      </button>
    </form>
  );
}
