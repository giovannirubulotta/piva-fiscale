import type { Fattura, Incasso, RigaFattura } from "./types";

/**
 * Calcoli puri su una fattura. Tutta l'aritmetica passa per interi in
 * centesimi: i controlli dello SDI sulla coerenza degli importi hanno
 * tolleranze strette (00423 su PrezzoTotale: 1 centesimo; 00421 sull'imposta:
 * 1 centesimo) e i float binari le sforano silenziosamente su fatture con
 * molte righe — `0.1 + 0.2 !== 0.3`. Si arrotonda una volta sola, per riga,
 * esattamente come fa il campo PrezzoTotale dell'XML.
 */

/** Sopra questo importo la fattura senza IVA sconta il bollo (D.P.R. 642/1972, all. A art. 13). */
export const SOGLIA_BOLLO = 77.47;

/** Importo fisso della marca da bollo virtuale. */
export const IMPORTO_BOLLO = 2;

function inCentesimi(valore: number): number {
  return Math.round(valore * 100);
}

function inEuro(centesimi: number): number {
  return centesimi / 100;
}

/**
 * PrezzoTotale della singola riga: quantità × prezzo unitario, arrotondato al
 * centesimo. È il valore che finisce nel campo 2.2.1.11 dell'XML.
 */
export function totaleRiga(riga: Pick<RigaFattura, "quantita" | "prezzoUnitario">): number {
  return inEuro(Math.round(inCentesimi(riga.prezzoUnitario) * riga.quantita));
}

/** Somma dei PrezzoTotale: è la base su cui lo SDI valuta la soglia dei 77,47 €. */
export function totaleRighe(righe: Pick<RigaFattura, "quantita" | "prezzoUnitario">[]): number {
  return inEuro(righe.reduce((somma, riga) => somma + inCentesimi(totaleRiga(riga)), 0));
}

/**
 * Se il bollo è dovuto sulle righe indicate. La soglia si valuta sulla somma
 * dei PrezzoTotale, non sul totale documento: è la regola che applica lo SDI
 * per popolare l'Elenco B (Guida AdE al bollo sulle fatture elettroniche).
 */
export function bolloDovuto(righe: Pick<RigaFattura, "quantita" | "prezzoUnitario">[]): boolean {
  return inCentesimi(totaleRighe(righe)) > inCentesimi(SOGLIA_BOLLO);
}

/**
 * Importo che il cliente deve pagare (ImportoTotaleDocumento). I 2 € del bollo
 * lo aumentano solo se riaddebitati: se restano a carico dell'emittente, il
 * cliente non li deve.
 */
export function totaleDocumento(fattura: Pick<Fattura, "righe" | "bolloApplicato" | "bolloRiaddebitato">): number {
  const base = inCentesimi(totaleRighe(fattura.righe));
  const bollo = fattura.bolloApplicato && fattura.bolloRiaddebitato ? inCentesimi(IMPORTO_BOLLO) : 0;
  return inEuro(base + bollo);
}

/**
 * Quanto la fattura vale come ricavo ai fini del reddito forfettario.
 *
 * Coincide con `totaleDocumento` e non è una ridondanza: il bollo riaddebitato
 * al cliente costituisce compenso e concorre alla determinazione del reddito,
 * quindi entra nel monte ricavi su cui si applicano coefficiente di
 * redditività e imposta sostitutiva; il bollo a carico dell'emittente no.
 * Tenere le due funzioni separate rende esplicito che questo è un fatto
 * fiscale, non un dettaglio di presentazione: se un domani cambiasse la regola
 * sull'importo dovuto dal cliente, l'imponibile non deve seguirla per inerzia.
 * Vedi DECISIONS.md.
 */
export function imponibileFiscale(fattura: Pick<Fattura, "righe" | "bolloApplicato" | "bolloRiaddebitato">): number {
  return totaleDocumento(fattura);
}

/** Numero del documento come appare in fattura e nel campo Numero dell'XML. */
export function numeroFattura(fattura: Pick<Fattura, "progressivo" | "anno">): string {
  return `${fattura.progressivo}/${fattura.anno}`;
}

/** Data di scadenza del pagamento, derivata dai giorni concordati. */
export function dataScadenzaPagamento(
  fattura: Pick<Fattura, "dataEmissione" | "giorniScadenzaPagamento">
): string {
  const data = new Date(`${fattura.dataEmissione}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + fattura.giorniScadenzaPagamento);
  return data.toISOString().slice(0, 10);
}

/**
 * Traduce le fatture nel tipo `Incasso` su cui lavora già tutto il motore di
 * calcolo (imponibile, scadenzario, Quadro LM). Il contratto del calcolo resta
 * invariato: cambia solo la fonte dei dati, prima `fiscale_incassi` e ora le
 * fatture con le loro righe.
 *
 * Una nota di credito (TD04) storna: entra con importo negativo, così il
 * fatturato dell'anno si riduce senza dover toccare le funzioni di calcolo. Il
 * bollo di una nota di credito non viene conteggiato tra quelli da versare —
 * lo scadenzario del bollo somma quanti documenti lo scontano, e una nota di
 * credito non genera un nuovo bollo dovuto.
 */
export function fattureComeIncassi(fatture: Fattura[]): Incasso[] {
  return fatture.map((fattura) => {
    const segno = fattura.tipoDocumento === "TD04" ? -1 : 1;
    return {
      id: fattura.id,
      dataEmissione: fattura.dataEmissione,
      dataIncasso: fattura.dataIncasso,
      importoNetto: segno * imponibileFiscale(fattura),
      bolloApplicato: fattura.tipoDocumento === "TD04" ? false : fattura.bolloApplicato,
      stato: statoIncasso(fattura.stato),
    };
  });
}

/**
 * Una fattura in bozza non è ancora un documento emesso: ai fini del calcolo
 * conta come "da incassare", non come annullata, così non sparisce dai totali
 * previsionali ma non concorre al reddito per cassa finché non è incassata.
 */
function statoIncasso(stato: Fattura["stato"]): Incasso["stato"] {
  switch (stato) {
    case "incassata":
      return "incassata";
    case "annullata":
      return "annullata";
    case "bozza":
    case "emessa":
      return "da_incassare";
  }
}
