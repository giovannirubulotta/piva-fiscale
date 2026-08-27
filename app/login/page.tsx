"use client";

import { useActionState, useState } from "react";
import { accedi, registrati, type EsitoAuth } from "./actions";

const statoIniziale: EsitoAuth = { errore: null };

export default function PaginaLogin() {
  const [modalita, setModalita] = useState<"accedi" | "registrati">("accedi");
  const [statoAccedi, azioneAccedi, inCorsoAccedi] = useActionState(accedi, statoIniziale);
  const [statoRegistrati, azioneRegistrati, inCorsoRegistrati] = useActionState(registrati, statoIniziale);

  const stato = modalita === "accedi" ? statoAccedi : statoRegistrati;
  const azione = modalita === "accedi" ? azioneAccedi : azioneRegistrati;
  const inCorso = modalita === "accedi" ? inCorsoAccedi : inCorsoRegistrati;

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-sm tracking-[0.2em] text-accent font-medium mb-1">GAR</div>
          <h1 className="text-xl font-semibold text-ink">Gestione fiscale P.IVA</h1>
          <p className="text-sm text-ink-muted mt-1">Regime forfettario · Gestione Separata INPS</p>
        </div>

        <div className="bg-surface border border-line rounded-xl p-6">
          <div className="flex gap-1 mb-6 bg-surface-2 rounded-lg p-1 text-sm">
            <button
              type="button"
              onClick={() => setModalita("accedi")}
              className={`flex-1 rounded-md py-1.5 transition ${
                modalita === "accedi" ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => setModalita("registrati")}
              className={`flex-1 rounded-md py-1.5 transition ${
                modalita === "registrati" ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              Crea account
            </button>
          </div>

          <form action={azione} className="flex flex-col gap-3">
            <div>
              <label htmlFor="email" className="block text-xs text-ink-muted mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs text-ink-muted mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={modalita === "accedi" ? "current-password" : "new-password"}
                className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {stato.errore && (
              <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                {stato.errore}
              </p>
            )}

            <button
              type="submit"
              disabled={inCorso}
              className="mt-2 w-full rounded-lg bg-accent text-white text-sm font-medium py-2.5 hover:opacity-90 transition disabled:opacity-50"
            >
              {inCorso ? "Un momento…" : modalita === "accedi" ? "Accedi" : "Crea account"}
            </button>
          </form>
        </div>

        <p className="text-xs text-ink-faint text-center mt-6">Solo per uso personale — nessuna registrazione pubblica prevista.</p>
      </div>
    </main>
  );
}
