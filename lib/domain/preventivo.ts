import { round2 } from "./calcolo";
import { totaleRighe } from "./fattura";

/**
 * Preventivi: l'offerta che viene prima della fattura.
 *
 * Condivide con la fattura la forma delle righe — descrizione, quantità,
 * prezzo — e quindi anche l'aritmetica: `totaleRighe` lavora in centesimi
 * interi e vale identica qui. Riscriverla avrebbe creato due sommatorie che
 * possono dare risultati diversi sullo stesso importo, che è precisamente il
 * difetto che quell'aritmetica esiste per evitare.
 *
 * Un preventivo **non è un documento fiscale**: non ha bollo, non ha natura
 * IVA, non consuma un progressivo di fatturazione. Ha una numerazione propria
 * perché quella delle fatture è vincolata e i suoi numeri non si riusano.
 */

export type StatoPreventivo = "bozza" | "inviato" | "accettato" | "rifiutato";

/** Lo stato mostrato, che comprende anche "scaduto" — derivato, mai memorizzato. */
export type StatoEffettivo = StatoPreventivo | "scaduto";

export const ETICHETTE_STATO: Record<StatoEffettivo, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  accettato: "Accettato",
  rifiutato: "Rifiutato",
  scaduto: "Scaduto",
};

export interface RigaPreventivo {
  id: string;
  numeroLinea: number;
  descrizione: string;
  quantita: number;
  unitaMisura: string | null;
  prezzoUnitario: number;
}

export interface Preventivo {
  id: string;
  clienteId: string;
  anno: number;
  progressivo: number;
  dataEmissione: string;
  validoFinoAl: string;
  stato: StatoPreventivo;
  fatturaId: string | null;
  oggetto: string | null;
  condizioni: string | null;
  note: string | null;
  righe: RigaPreventivo[];
}

export function numeroPreventivo(preventivo: Pick<Preventivo, "progressivo" | "anno">): string {
  return `P${preventivo.progressivo}/${preventivo.anno}`;
}

export function totalePreventivo(preventivo: Pick<Preventivo, "righe">): number {
  return totaleRighe(preventivo.righe);
}

/**
 * Lo stato che conta, quello che si vede.
 *
 * "Scaduto" non è un valore memorizzato: sarebbe una colonna che dice il vero
 * solo finché qualcuno la aggiorna, cioè un processo notturno da scrivere,
 * sorvegliare e riparare — e nel frattempo una riga non aggiornata mentirebbe.
 * La data di validità c'è già: lo stato si calcola da quella, e non può essere
 * in ritardo su sé stesso.
 *
 * Solo un preventivo *inviato* può scadere. Una bozza non è mai stata offerta
 * a nessuno; un accettato o un rifiutato hanno già avuto una risposta, e la
 * risposta non decade con il calendario.
 */
export function statoEffettivo(
  preventivo: Pick<Preventivo, "stato" | "validoFinoAl">,
  oggi: string
): StatoEffettivo {
  if (preventivo.stato === "inviato" && preventivo.validoFinoAl < oggi) return "scaduto";
  return preventivo.stato;
}

/** Giorni che restano di validità: negativo se è già passata. */
export function giorniDiValidita(preventivo: Pick<Preventivo, "validoFinoAl">, oggi: string): number {
  return Math.round(
    (Date.parse(`${preventivo.validoFinoAl}T00:00:00Z`) - Date.parse(`${oggi}T00:00:00Z`)) / 86_400_000
  );
}

/**
 * Perché un preventivo non si può ancora trasformare in fattura, o `null` se si
 * può. Restituisce il motivo invece di un booleano: un pulsante disattivato
 * senza spiegazione è un vicolo cieco.
 */
export function motivoNonConvertibile(
  preventivo: Pick<Preventivo, "stato" | "fatturaId" | "righe">
): string | null {
  if (preventivo.fatturaId) return "Da questo preventivo è già nata una fattura.";
  if (preventivo.stato !== "accettato") {
    return "Solo un preventivo accettato diventa fattura: segnalo accettato quando il cliente conferma.";
  }
  if (preventivo.righe.length === 0) return "Il preventivo non ha righe.";
  return null;
}

/**
 * Le righe del preventivo nella forma che serve alla fattura. La conversione è
 * una copia, non un collegamento: da quel momento i due documenti hanno vite
 * separate, e correggere una riga in fattura non deve riscrivere l'offerta che
 * il cliente ha accettato — quella resta la prova di cosa era stato pattuito.
 */
export function righePerFattura(preventivo: Pick<Preventivo, "righe">): {
  descrizione: string;
  quantita: number;
  unitaMisura: string | null;
  prezzoUnitario: number;
}[] {
  return [...preventivo.righe]
    .sort((a, b) => a.numeroLinea - b.numeroLinea)
    .map((riga) => ({
      descrizione: riga.descrizione,
      quantita: riga.quantita,
      unitaMisura: riga.unitaMisura,
      prezzoUnitario: riga.prezzoUnitario,
    }));
}

export interface RiepilogoPreventivi {
  inviati: number;
  accettati: number;
  rifiutati: number;
  scaduti: number;
  valoreInAttesa: number;
  valoreAccettato: number;
  /** null finché nessun preventivo ha ricevuto risposta: zero su zero non è zero per cento. */
  tassoAccettazione: number | null;
}

/**
 * Quanto vale ciò che è in attesa di risposta, e quanta parte delle offerte va
 * a buon fine. Gli scaduti contano come risposte mancate, non come rifiuti: chi
 * non ha risposto non ha detto no, e confonderli nasconde un problema di
 * follow-up dietro un tasso di rifiuto.
 */
export function riepilogoPreventivi(preventivi: Preventivo[], oggi: string): RiepilogoPreventivi {
  let inviati = 0;
  let accettati = 0;
  let rifiutati = 0;
  let scaduti = 0;
  let valoreInAttesa = 0;
  let valoreAccettato = 0;

  for (const preventivo of preventivi) {
    const stato = statoEffettivo(preventivo, oggi);
    const totale = totalePreventivo(preventivo);

    if (stato === "inviato") {
      inviati += 1;
      valoreInAttesa += totale;
    } else if (stato === "accettato") {
      accettati += 1;
      valoreAccettato += totale;
    } else if (stato === "rifiutato") {
      rifiutati += 1;
    } else if (stato === "scaduto") {
      scaduti += 1;
    }
  }

  const conRisposta = accettati + rifiutati;

  return {
    inviati,
    accettati,
    rifiutati,
    scaduti,
    valoreInAttesa: round2(valoreInAttesa),
    valoreAccettato: round2(valoreAccettato),
    tassoAccettazione: conRisposta === 0 ? null : Math.round((accettati / conRisposta) * 100),
  };
}
