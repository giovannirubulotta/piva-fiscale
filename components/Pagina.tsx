import Link from "next/link";

/**
 * Il vocabolario visivo delle pagine: intestazione, metrica, scheda, stato
 * vuoto.
 *
 * Esiste perché la stessa forma era stata riscritta tre volte — il riquadro di
 * una metrica compariva identico in dashboard, trattative e scheda cliente, con
 * tre definizioni locali destinate a divergere alla prima modifica. La regola
 * del progetto dice di estrarre alla terza occorrenza: questa è la terza.
 *
 * Non è solo deduplicazione. Un software sembra un software quando ogni schermo
 * usa gli stessi pochi elementi nello stesso modo: il titolo sta sempre dove ci
 * si aspetta, le azioni sono sempre a destra, un numero importante ha sempre lo
 * stesso peso. La coerenza è la parte visibile della disciplina.
 */

export function IntestazionePagina({
  titolo,
  descrizione,
  ritorno,
  azioni,
}: {
  titolo: string;
  descrizione?: string;
  /** Percorso e testo del collegamento indietro, per le pagine di dettaglio. */
  ritorno?: { href: string; testo: string };
  azioni?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1">
      {ritorno && (
        <Link
          href={ritorno.href}
          className="text-xs text-ink-muted hover:text-ink transition w-fit mb-1"
        >
          ← {ritorno.testo}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <h1 className="text-[1.375rem] leading-tight font-semibold tracking-[-0.011em]">{titolo}</h1>
        {azioni && <div className="flex flex-wrap items-center gap-2 shrink-0">{azioni}</div>}
      </div>
      {descrizione && <p className="text-sm text-ink-muted max-w-[68ch]">{descrizione}</p>}
    </header>
  );
}

/**
 * Un numero con la sua etichetta. `accento` si usa per il valore che la pagina
 * esiste per mostrare — uno per schermata, altrimenti non accentua più niente.
 */
export function Metrica({
  etichetta,
  valore,
  nota,
  accento,
  stato,
}: {
  etichetta: string;
  valore: string;
  nota?: string;
  accento?: boolean;
  /** Colore semantico: si usa quando il numero *è* uno stato, non per decorare. */
  stato?: "ok" | "warn" | "danger";
}) {
  const colore = stato
    ? { ok: "text-ok", warn: "text-warn", danger: "text-danger" }[stato]
    : accento
      ? "text-accent"
      : "text-ink";

  return (
    <div className="scheda p-4 flex flex-col gap-1.5">
      <div className="text-xs text-ink-muted leading-snug">{etichetta}</div>
      <div className={`text-[1.375rem] leading-none font-semibold tabular-nums tracking-[-0.01em] ${colore}`}>
        {valore}
      </div>
      {nota && <div className="text-xs text-ink-faint leading-snug">{nota}</div>}
    </div>
  );
}

/** Contenitore standard: bordo, superficie, angoli. Il resto lo mette chi lo usa. */
export function Scheda({
  titolo,
  azione,
  children,
  className = "",
}: {
  titolo?: string;
  azione?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`scheda overflow-hidden ${className}`}>
      {(titolo || azione) && (
        <div className="px-4 sm:px-5 py-3 border-b border-line flex items-center justify-between gap-3">
          {titolo && (
            <h2 className="text-xs text-ink-muted uppercase tracking-[0.08em] font-medium">{titolo}</h2>
          )}
          {azione}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Uno stato vuoto dice cosa manca e come rimediare. Una schermata vuota che
 * dice solo "nessun risultato" lascia l'utente a chiedersi se sia rotto.
 */
export function Vuoto({
  messaggio,
  azione,
}: {
  messaggio: string;
  azione?: { href: string; testo: string };
}) {
  return (
    <div className="px-5 py-10 text-center flex flex-col items-center gap-3">
      <p className="text-sm text-ink-muted">{messaggio}</p>
      {azione && (
        <Link href={azione.href} className="text-sm text-accent hover:underline">
          {azione.testo} →
        </Link>
      )}
    </div>
  );
}

/** Titolo di una sezione dentro la pagina, con eventuale collegamento a destra. */
export function TitoloSezione({
  children,
  collegamento,
}: {
  children: React.ReactNode;
  collegamento?: { href: string; testo: string };
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-3">
      <h2 className="text-xs text-ink-muted uppercase tracking-[0.08em] font-medium">{children}</h2>
      {collegamento && (
        <Link href={collegamento.href} className="text-sm text-accent hover:underline shrink-0">
          {collegamento.testo} →
        </Link>
      )}
    </div>
  );
}
