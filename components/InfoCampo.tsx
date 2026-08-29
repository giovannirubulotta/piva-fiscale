import type { ReactNode } from "react";

/** Spiegazione di un singolo campo: cos'è, dove reperire il dato, riferimento normativo se rilevante. */
export interface SpiegazioneCampo {
  cosaE: string;
  doveTrovarlo?: string;
  riferimento?: string;
}

/**
 * Etichetta di campo con un pulsante "ⓘ" accanto che, cliccato, spiega cos'è
 * il dato richiesto e dove reperirlo. Usa <details>/<summary> nativi invece
 * di uno stato React: niente gestione di click-outside, funziona da tastiera
 * e con screen reader senza ARIA aggiuntiva, e non richiede "use client" —
 * può stare anche in form lato client senza aggiungere JS.
 */
export function InfoCampo({
  etichetta,
  spiegazione,
  children,
}: {
  etichetta: string;
  spiegazione?: SpiegazioneCampo;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-center gap-1.5 text-ink-muted text-xs">
        {etichetta}
        {spiegazione && <BottoneInfo etichetta={etichetta} spiegazione={spiegazione} />}
      </span>
      {children}
    </label>
  );
}

/** Esportato a parte per i casi in cui il pulsante info va affiancato a un controllo che non è un'etichetta di InfoCampo (es. una checkbox). */
export function BottoneInfo({ etichetta, spiegazione }: { etichetta: string; spiegazione: SpiegazioneCampo }) {
  return (
    <details className="relative inline-block leading-none">
      <summary
        className="marker:hidden [&::-webkit-details-marker]:hidden w-4 h-4 rounded-full border border-line text-ink-faint text-[10px] flex items-center justify-center cursor-pointer select-none hover:border-accent hover:text-accent transition"
        aria-label={`Cos'è: ${etichetta}`}
      >
        i
      </summary>
      <div className="absolute z-20 left-0 top-full mt-1.5 w-64 max-w-[80vw] rounded-lg border border-line bg-surface-2 p-3 text-xs text-ink normal-case shadow-lg">
        <p>{spiegazione.cosaE}</p>
        {spiegazione.doveTrovarlo && (
          <p className="text-ink-muted mt-1.5">
            <span className="text-ink-faint">Dove si trova: </span>
            {spiegazione.doveTrovarlo}
          </p>
        )}
        {spiegazione.riferimento && <p className="text-ink-faint mt-1.5">{spiegazione.riferimento}</p>}
      </div>
    </details>
  );
}
