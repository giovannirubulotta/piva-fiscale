/**
 * Appunti.
 *
 * Il collegamento a un cliente o a una trattativa è facoltativo, e la ragione
 * è di comportamento più che di modello: un'idea annotata al volo non sa
 * ancora a chi appartiene, e obbligare a classificarla nel momento in cui la
 * si scrive è il modo più sicuro per non scriverla. Il collegamento si
 * aggiunge dopo, quando la nota ha trovato il suo posto.
 */

export interface Nota {
  id: string;
  titolo: string | null;
  testo: string;
  clienteId: string | null;
  trattativaId: string | null;
  fissata: boolean;
  etichette: string[];
  creataIl: string;
  aggiornataIl: string;
}

/**
 * La prima riga come titolo, quando un titolo non c'è.
 *
 * Un elenco di note senza intestazione costringe a leggere il corpo di
 * ciascuna per riconoscerla. La prima riga è quasi sempre di cosa parla la
 * nota — è così che si scrive quando si scrive di fretta.
 */
export function intestazione(nota: Pick<Nota, "titolo" | "testo">): string {
  if (nota.titolo?.trim()) return nota.titolo.trim();
  const prima = nota.testo.split("\n").find((riga) => riga.trim().length > 0) ?? "";
  const pulita = prima.trim();
  return pulita.length > 80 ? `${pulita.slice(0, 79)}…` : pulita || "Senza titolo";
}

/** Le righe dopo la prima: l'anteprima nell'elenco, senza ripetere l'intestazione. */
export function anteprima(nota: Pick<Nota, "titolo" | "testo">, caratteri = 160): string {
  const righe = nota.testo.split("\n");
  const corpo = nota.titolo?.trim() ? righe : righe.slice(1);
  const testo = corpo.join(" ").replace(/\s+/g, " ").trim();
  return testo.length > caratteri ? `${testo.slice(0, caratteri - 1)}…` : testo;
}

/**
 * Ordina: prima le fissate, poi le più recenti.
 *
 * Fissare è l'unico ordinamento manuale ammesso. Un elenco che si può
 * riordinare a mano diventa un elenco da riordinare a mano, cioè un lavoro
 * ricorrente che non produce niente.
 */
export function ordina(note: Nota[]): Nota[] {
  return [...note].sort((a, b) => {
    if (a.fissata !== b.fissata) return a.fissata ? -1 : 1;
    return b.aggiornataIl.localeCompare(a.aggiornataIl);
  });
}

/**
 * Filtro per testo, titolo ed etichette, senza distinzione di maiuscole e di
 * accenti: cercare «citta» deve trovare «città», altrimenti la ricerca
 * funziona solo per chi ricorda come aveva scritto.
 */
export function filtra(note: Nota[], termine: string): Nota[] {
  const ago = normalizza(termine);
  if (!ago) return note;
  return note.filter((nota) => {
    const pagliaio = normalizza(
      [nota.titolo ?? "", nota.testo, nota.etichette.join(" ")].join(" ")
    );
    return pagliaio.includes(ago);
  });
}

function normalizza(testo: string): string {
  return testo
    .normalize("NFD")
    // Toglie i segni diacritici combinanti: «à» diventa «a».
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Tutte le etichette usate, ordinate per frequenza: le più usate per prime. */
export function etichetteUsate(note: Nota[]): { etichetta: string; conteggio: number }[] {
  const conteggi = new Map<string, number>();
  for (const nota of note) {
    for (const etichetta of nota.etichette) {
      conteggi.set(etichetta, (conteggi.get(etichetta) ?? 0) + 1);
    }
  }
  return [...conteggi.entries()]
    .map(([etichetta, conteggio]) => ({ etichetta, conteggio }))
    .sort((a, b) => b.conteggio - a.conteggio || a.etichetta.localeCompare(b.etichetta));
}

/**
 * Ripulisce le etichette scritte a mano: separate da virgola, senza spazi ai
 * bordi, minuscole, senza duplicati. Senza questa normalizzazione «Urgente» e
 * «urgente » diventano due etichette diverse, e il filtro ne mostra una sola.
 */
export function normalizzaEtichette(grezze: string): string[] {
  const viste = new Set<string>();
  const risultato: string[] = [];
  for (const pezzo of grezze.split(",")) {
    const pulito = pezzo.trim().toLowerCase().replace(/\s+/g, " ");
    if (!pulito || viste.has(pulito)) continue;
    viste.add(pulito);
    risultato.push(pulito);
  }
  return risultato.slice(0, 8);
}
