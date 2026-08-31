import { round2 } from "./calcolo";
import { totaleRighe } from "./fattura";

/**
 * Canoni ricorrenti: il modello di una prestazione che si ripete.
 *
 * Un ricorrente **non emette niente da solo**. Calcola quali fatture
 * sarebbero dovute e le propone; l'emissione resta un gesto esplicito. Una
 * fattura è un documento fiscale con un progressivo che non si riusa: farla
 * generare a un processo notturno significa che il primo dato sbagliato — un
 * cliente cessato, un prezzo cambiato a voce — diventa un documento da
 * stornare con nota di credito invece che una riga da correggere.
 *
 * Le date sono stringhe ISO `YYYY-MM-DD` come nel resto del dominio recente:
 * confrontabili con `<` senza fusi orari di mezzo.
 */

export type Cadenza = "mensile" | "bimestrale" | "trimestrale" | "semestrale" | "annuale";

export const MESI_PER_CADENZA: Record<Cadenza, number> = {
  mensile: 1,
  bimestrale: 2,
  trimestrale: 3,
  semestrale: 6,
  annuale: 12,
};

export const ETICHETTE_CADENZA: Record<Cadenza, string> = {
  mensile: "Ogni mese",
  bimestrale: "Ogni 2 mesi",
  trimestrale: "Ogni 3 mesi",
  semestrale: "Ogni 6 mesi",
  annuale: "Ogni anno",
};

export interface RigaRicorrente {
  id: string;
  numeroLinea: number;
  descrizione: string;
  quantita: number;
  unitaMisura: string | null;
  prezzoUnitario: number;
}

export interface Ricorrente {
  id: string;
  clienteId: string;
  descrizione: string;
  cadenza: Cadenza;
  dataInizio: string;
  dataFine: string | null;
  ultimaEmissione: string | null;
  giorniScadenzaPagamento: number;
  modalitaPagamento: string;
  condizioniPagamento: string;
  causaleAggiuntiva: string | null;
  attiva: boolean;
  note: string | null;
  righe: RigaRicorrente[];
}

/**
 * Somma mesi a una data ISO, tenendo il giorno dentro il mese di arrivo.
 *
 * Il 31 gennaio più un mese non è il 31 febbraio: si ferma al 28 (o 29). È il
 * caso che rompe silenziosamente le ricorrenze scritte con `setMonth`, perché
 * `Date` non tronca — trabocca al 3 marzo.
 */
export function aggiungiMesi(iso: string, mesi: number): string {
  const [anno, mese, giorno] = iso.split("-").map(Number);
  const indiceMese = anno * 12 + (mese - 1) + mesi;
  const annoDiArrivo = Math.floor(indiceMese / 12);
  const meseDiArrivo = indiceMese - annoDiArrivo * 12;
  // Il giorno 0 del mese successivo è l'ultimo giorno di questo.
  const ultimoGiorno = new Date(Date.UTC(annoDiArrivo, meseDiArrivo + 1, 0)).getUTCDate();
  const giornoDiArrivo = Math.min(giorno, ultimoGiorno);
  return [
    String(annoDiArrivo).padStart(4, "0"),
    String(meseDiArrivo + 1).padStart(2, "0"),
    String(giornoDiArrivo).padStart(2, "0"),
  ].join("-");
}

/**
 * La data dell'n-esima occorrenza, contata **sempre dall'inizio della serie**
 * e mai dall'occorrenza precedente.
 *
 * La differenza conta solo nei mesi corti, ed è proprio lì che si vede: un
 * canone che parte il 31 gennaio, concatenando, diventerebbe 28 febbraio → 28
 * marzo → 28 aprile, e la serie perderebbe tre giorni per sempre dopo un solo
 * mese corto. Ancorandola all'inizio, febbraio si accorcia e marzo torna al 31.
 */
export function dataOccorrenza(
  ricorrente: Pick<Ricorrente, "dataInizio" | "cadenza">,
  indice: number
): string {
  return aggiungiMesi(ricorrente.dataInizio, indice * MESI_PER_CADENZA[ricorrente.cadenza]);
}

/** Limite di sicurezza: una data d'inizio assurda non deve far girare un ciclo all'infinito. */
const MASSIME_OCCORRENZE = 600;

/**
 * Le occorrenze già maturate al giorno indicato, comprese quelle passate.
 * Il giorno stesso conta: il canone del primo del mese è dovuto il primo.
 */
export function occorrenzeMaturate(ricorrente: Ricorrente, oggi: string): string[] {
  const date: string[] = [];
  for (let indice = 0; indice < MASSIME_OCCORRENZE; indice += 1) {
    const data = dataOccorrenza(ricorrente, indice);
    if (data > oggi) break;
    if (ricorrente.dataFine && data > ricorrente.dataFine) break;
    date.push(data);
  }
  return date;
}

/**
 * Le occorrenze maturate e non ancora fatturate.
 *
 * `ultimaEmissione` è la memoria della serie: senza, riaprendo la pagina il
 * giorno dopo si riproporrebbe di emettere quello che si è appena emesso.
 * Una serie sospesa non propone nulla, ma non dimentica: riattivandola gli
 * arretrati sono ancora lì, ed è giusto che si vedano invece di sparire.
 */
export function occorrenzeDaEmettere(ricorrente: Ricorrente, oggi: string): string[] {
  if (!ricorrente.attiva) return [];
  return occorrenzeMaturate(ricorrente, oggi).filter(
    (data) => !ricorrente.ultimaEmissione || data > ricorrente.ultimaEmissione
  );
}

/** La prossima occorrenza futura, o `null` se la serie è finita. */
export function prossimaOccorrenza(ricorrente: Ricorrente, oggi: string): string | null {
  for (let indice = 0; indice < MASSIME_OCCORRENZE; indice += 1) {
    const data = dataOccorrenza(ricorrente, indice);
    if (ricorrente.dataFine && data > ricorrente.dataFine) return null;
    if (data > oggi) return data;
  }
  return null;
}

export function totaleRicorrente(ricorrente: Pick<Ricorrente, "righe">): number {
  return totaleRighe(ricorrente.righe);
}

/**
 * Quanto vale la serie in un anno pieno. Serve a leggere il portafoglio
 * ricorrente come un dato solo — la parte di fatturato che non va rivenduta
 * ogni mese — non a stimare l'incasso: una serie che finisce a marzo vale un
 * anno pieno secondo questa funzione, ed è per quello che `dataFine` si vede
 * accanto al numero.
 */
export function valoreAnnuo(ricorrente: Pick<Ricorrente, "righe" | "cadenza">): number {
  return round2(totaleRighe(ricorrente.righe) * (12 / MESI_PER_CADENZA[ricorrente.cadenza]));
}

/**
 * Perché non si può emettere adesso, o `null` se si può. Come per i
 * preventivi: il motivo invece di un booleano, perché un pulsante grigio
 * senza spiegazione è un vicolo cieco.
 */
export function motivoNonEmettibile(ricorrente: Ricorrente, oggi: string): string | null {
  if (!ricorrente.attiva) return "La serie è sospesa: riattivala per emettere.";
  if (ricorrente.righe.length === 0) return "La serie non ha righe: una fattura a zero non si emette.";
  if (ricorrente.dataFine && ricorrente.dataFine < oggi && occorrenzeDaEmettere(ricorrente, oggi).length === 0) {
    return "La serie è conclusa e non ha lasciato arretrati.";
  }
  if (occorrenzeDaEmettere(ricorrente, oggi).length === 0) {
    const prossima = prossimaOccorrenza(ricorrente, oggi);
    return prossima ? `Niente da emettere: la prossima scadenza è il ${prossima}.` : "La serie è conclusa.";
  }
  return null;
}

/** Le righe nella forma che serve alla fattura: una copia, come per i preventivi. */
export function righePerFattura(ricorrente: Pick<Ricorrente, "righe">): {
  descrizione: string;
  quantita: number;
  unitaMisura: string | null;
  prezzoUnitario: number;
}[] {
  return [...ricorrente.righe]
    .sort((a, b) => a.numeroLinea - b.numeroLinea)
    .map((riga) => ({
      descrizione: riga.descrizione,
      quantita: riga.quantita,
      unitaMisura: riga.unitaMisura,
      prezzoUnitario: riga.prezzoUnitario,
    }));
}

export interface RiepilogoRicorrenti {
  attive: number;
  sospese: number;
  /** Quanto vale in un anno tutto ciò che è attivo. */
  valoreAnnuoAttivo: number;
  /** Quante fatture sono maturate e non ancora emesse, su tutte le serie. */
  arretrati: number;
  importoArretrati: number;
}

export function riepilogoRicorrenti(ricorrenti: Ricorrente[], oggi: string): RiepilogoRicorrenti {
  let attive = 0;
  let sospese = 0;
  let valoreAnnuoAttivo = 0;
  let arretrati = 0;
  let importoArretrati = 0;

  for (const ricorrente of ricorrenti) {
    if (ricorrente.attiva) {
      attive += 1;
      valoreAnnuoAttivo += valoreAnnuo(ricorrente);
    } else {
      sospese += 1;
    }
    const daEmettere = occorrenzeDaEmettere(ricorrente, oggi);
    arretrati += daEmettere.length;
    importoArretrati += daEmettere.length * totaleRicorrente(ricorrente);
  }

  return {
    attive,
    sospese,
    valoreAnnuoAttivo: round2(valoreAnnuoAttivo),
    arretrati,
    importoArretrati: round2(importoArretrati),
  };
}
