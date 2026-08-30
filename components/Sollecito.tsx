"use client";

import { useState } from "react";

/**
 * Il testo del sollecito, pronto da copiare.
 *
 * Non lo invia: l'invio automatico di messaggi a nome dell'utente è una cosa
 * che si decide, non un effetto collaterale dell'apertura di una pagina. Qui il
 * testo si legge, si modifica se serve e si copia — chi scrive resta l'utente.
 *
 * Il campo è modificabile di proposito: un testo generato che non si può
 * correggere costringe a copiarlo altrove per cambiarci una parola.
 */
export function Sollecito({ testo, oggetto }: { testo: string; oggetto: string }) {
  const [contenuto, setContenuto] = useState(testo);
  const [copiato, setCopiato] = useState(false);

  async function copia() {
    try {
      await navigator.clipboard.writeText(contenuto);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2500);
    } catch {
      // Il browser può negare l'accesso agli appunti (permesso revocato,
      // contesto non sicuro). Non è un errore da nascondere: il testo resta
      // selezionabile a mano, e dirlo è meglio di un pulsante che non fa nulla.
      setCopiato(false);
      alert("Il browser non ha concesso l'accesso agli appunti: seleziona il testo e copialo a mano.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="oggetto-sollecito" className="block text-xs text-ink-muted mb-1.5">
          Oggetto
        </label>
        <input id="oggetto-sollecito" readOnly value={oggetto} className="campo-input" />
      </div>

      <div>
        <label htmlFor="testo-sollecito" className="block text-xs text-ink-muted mb-1.5">
          Testo — modificabile prima di copiarlo
        </label>
        <textarea
          id="testo-sollecito"
          value={contenuto}
          onChange={(e) => setContenuto(e.target.value)}
          rows={11}
          className="campo-input resize-y leading-relaxed"
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={copia} className="btn-primario">
          Copia il testo
        </button>
        <span aria-live="polite" className="text-sm text-ok">
          {copiato ? "Copiato." : ""}
        </span>
      </div>
    </div>
  );
}
