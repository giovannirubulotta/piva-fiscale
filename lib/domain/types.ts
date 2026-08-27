/**
 * Tipi del dominio fiscale. Nessuna dipendenza da Supabase, da Next.js
 * o da qualunque libreria di I/O: questo modulo descrive solo le regole
 * di calcolo di imposta sostitutiva, contributi INPS e scadenzario per
 * un libero professionista in regime forfettario, tassato per cassa.
 */

export interface AliquoteAnno {
  anno: number;
  aliquotaSostitutivaStandard: number; // es. 0.15
  aliquotaSostitutivaAgevolata: number; // es. 0.05 (primi 5 anni, se spettante)
  aliquotaInps: number; // es. 0.2607 — Gestione Separata, senza altra copertura
  massimaleInps: number;
  minimaleInps: number;
}

export interface ProfiloFiscale {
  coefficienteRedditivita: number; // es. 0.78 per ATECO 73.11.02
  dataApertura: string | null; // ISO date (YYYY-MM-DD)
  /** true = ha diritto al 5% verificato; false = deve usare il 15%; null = da verificare col commercialista */
  agevolazione5Percento: boolean | null;
}

/**
 * Un incasso reale nell'anno (conta la data di incasso, non di emissione: il
 * forfettario tassa per cassa). Contiene solo i campi che servono al calcolo:
 * i dati anagrafici della fattura (cliente, numero, descrizione) vivono nel
 * tipo più ricco IncassoCompleto usato dalla UI (lib/data/incassi.ts) — ogni
 * IncassoCompleto è comunque un Incasso valido, essendo un suo superset.
 */
export interface Incasso {
  id: string;
  dataEmissione: string;
  dataIncasso: string | null;
  importoNetto: number;
  bolloApplicato: boolean;
  stato: "da_incassare" | "incassata" | "annullata";
}

export interface RiepilogoAnno {
  anno: number;
  fatturatoIncassato: number;
  imponibile: number;
  aliquotaSostitutivaApplicata: number;
  impostaSostitutiva: number;
  contributiInps: number;
  totaleDovuto: number;
  nettoStimato: number;
  /** true se questo è l'anno di apertura P.IVA: niente acconti dovuti nell'anno stesso. */
  primoAnno: boolean;
}

export type TipoScadenza =
  | "saldo_imposta"
  | "acconto1_imposta"
  | "acconto2_imposta"
  | "saldo_inps"
  | "acconto1_inps"
  | "acconto2_inps";

export interface Scadenza {
  /** Identificatore stabile, usato per tracciare lo stato di pagamento (fiscale_scadenze_stato.chiave). */
  chiave: string;
  tipo: TipoScadenza;
  /** Anno d'imposta a cui si riferisce l'importo (non l'anno in cui si paga). */
  annoRiferimento: number;
  dataScadenza: string; // ISO date
  importo: number;
  codiceTributo: string;
  descrizione: string;
}

export interface ScadenzaBollo {
  chiave: string;
  trimestre: 1 | 2 | 3 | 4;
  anno: number;
  dataScadenza: string;
  importoDovuto: number;
  descrizione: string;
}
