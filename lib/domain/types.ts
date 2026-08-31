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
 * forfettario tassa per cassa). Contiene solo i campi che servono al calcolo.
 *
 * È il confine tra la fatturazione e il motore fiscale: le fatture con le loro
 * righe (tipo Fattura) vengono tradotte in questo tipo da `fattureComeIncassi`,
 * così il calcolo non dipende da come sono fatti i documenti.
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

export type TipologiaCliente =
  | "privato"
  | "societa"
  | "professionista"
  | "pubblica_amministrazione"
  | "associazione"
  | "estero";

/**
 * Un cliente in anagrafica. Alimenta sia la fattura di cortesia (PDF) sia il
 * blocco CessionarioCommittente dell'XML FatturaPA: i campi qui opzionali sono
 * obbligatori in fase di generazione XML e vengono verificati da
 * `validaFatturaPerXml`, non dal tipo — un cliente incompleto resta salvabile.
 */
export interface Cliente {
  id: string;
  tipologia: TipologiaCliente;
  /** Persona giuridica. Alternativo a nome + cognome. */
  denominazione: string | null;
  nome: string | null;
  cognome: string | null;
  codiceFiscale: string | null;
  partitaIva: string | null;
  /** Prefisso paese della partita IVA (IdFiscaleIVA/IdPaese). */
  idPaese: string;
  indirizzo: string | null;
  numeroCivico: string | null;
  cap: string | null;
  comune: string | null;
  provincia: string | null;
  nazione: string;
  /** 7 caratteri per FPR12; "0000000" privato o PEC; "XXXXXXX" estero. */
  codiceDestinatario: string;
  pecDestinatario: string | null;
  email: string | null;
  telefono: string | null;
  note: string | null;
}

/** TD01 fattura, TD04 nota di credito (specifiche tecniche AdE 1.9.1). */
export type TipoDocumento = "TD01" | "TD04";

export type StatoFattura = "bozza" | "emessa" | "incassata" | "annullata";

export interface RigaFattura {
  id: string;
  numeroLinea: number;
  descrizione: string;
  quantita: number;
  unitaMisura: string | null;
  prezzoUnitario: number;
}

export interface Fattura {
  id: string;
  clienteId: string;
  tipoDocumento: TipoDocumento;
  /** Solo TD04: la fattura stornata. */
  fatturaRiferimentoId: string | null;
  anno: number;
  progressivo: number;
  dataEmissione: string;
  dataIncasso: string | null;
  stato: StatoFattura;
  bolloApplicato: boolean;
  /** true = i 2 € sono addebitati al cliente come riga e sono ricavo imponibile. */
  bolloRiaddebitato: boolean;
  condizioniPagamento: string;
  modalitaPagamento: string;
  giorniScadenzaPagamento: number;
  causaleAggiuntiva: string | null;
  note: string | null;
  /** Progressivo del nome file XML, assegnato alla prima generazione e mai riusato. */
  xmlProgressivo: string | null;
  /**
   * La serie ricorrente da cui è nata, se è nata da una. È una colonna e non
   * una stringa dentro le note: ritrovare le fatture di un canone cercando
   * testo nelle note significa perderle appena qualcuno rinomina la serie.
   */
  ricorrenteId: string | null;
  righe: RigaFattura[];
}

/**
 * Dati anagrafici dell'emittente per il blocco CedentePrestatore.
 * Sottoinsieme di ProfiloFiscale isolato qui perché il generatore XML non deve
 * dipendere dai campi di calcolo (coefficiente, agevolazione) che non gli servono.
 */
export interface DatiEmittente {
  partitaIva: string | null;
  codiceFiscale: string | null;
  nome: string | null;
  cognome: string | null;
  indirizzo: string | null;
  numeroCivico: string | null;
  cap: string | null;
  comune: string | null;
  provincia: string | null;
  nazione: string;
  email: string | null;
  telefono: string | null;
  iban: string | null;
  bolloRiaddebitato: boolean;
}

export type TipologiaCredito = "irpef" | "imposta_sostitutiva" | "inps" | "irap" | "altro";

/** Un credito fiscale disponibile per la compensazione orizzontale in F24 (es. eccedenza da Quadro LM/LM47). */
export interface CreditoDisponibile {
  id: string;
  tipologia: TipologiaCredito;
  annoMaturazione: number;
  importo: number;
  utilizzato: boolean;
  annoUtilizzo: number | null;
  dataUtilizzo: string | null;
  note: string | null;
}

/** Compensato per tipologia di credito e anno di utilizzo: unità su cui si valuta la soglia del visto di conformità. */
export interface RiepilogoCompensazione {
  tipologia: TipologiaCredito;
  anno: number;
  totaleUtilizzato: number;
  richiedeVistoConformita: boolean;
}

/** Dati dalla Certificazione Unica (CU), in vista del Quadro RC — non un ricalcolo dell'IRPEF dovuta. */
export interface LavoroDipendente {
  id: string;
  anno: number;
  datoreLavoro: string | null;
  redditoImponibile: number;
  ritenuteIrpef: number;
  addizionaleRegionale: number;
  addizionaleComunale: number;
  note: string | null;
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

/**
 * Una riga della tabella di riferimento normativo (Allegato 4 L. 190/2014,
 * come modificato dall'art. 1 co. 87 L. 208/2015): associa un prefisso di
 * codice ATECO (senza punti) a un gruppo e al relativo coefficiente di
 * redditività forfettario. `prefissoAteco === ""` è la voce di default
 * (gruppo 9, "altre attività economiche"): si applica quando nessun
 * prefisso più specifico corrisponde al codice ATECO del profilo.
 */
export interface CoefficienteAteco {
  gruppo: number;
  settore: string;
  prefissoAteco: string;
  coefficiente: number; // frazione 0..1, es. 0.78
}

/** Esito della ricerca di un codice ATECO nella tabella dei coefficienti. */
export interface RisultatoCoefficienteAteco {
  coefficiente: number; // frazione 0..1
  gruppo: number;
  settore: string;
  /** true se non è stato trovato un prefisso specifico ed è stato usato il gruppo 9 di default. */
  predefinito: boolean;
}

export interface ScadenzaBollo {
  chiave: string;
  trimestre: 1 | 2 | 3 | 4;
  anno: number;
  dataScadenza: string;
  importoDovuto: number;
  /** Codice tributo 2521-2524, uno per trimestre (istruzioni Agenzia Entrate su bollo fatture elettroniche). */
  codiceTributo: string;
  descrizione: string;
}

/**
 * Autovalutazione annuale delle cause di esclusione dal regime forfettario
 * (art. 1 commi 57 e 71 L. 190/2014). `null` per ogni campo significa "non
 * ancora verificato", non "escluso": è lo stesso pattern prudente usato per
 * `agevolazione5Percento` in ProfiloFiscale, per non far leggere un dato
 * mancante come una conferma implicita.
 */
export interface RequisitiForfettario {
  anno: number;
  redditoLavoroDipendenteOltreSoglia: boolean | null;
  partecipazioniSocietaRiconducibili: boolean | null;
  committentePrevalenteExDatore: boolean | null;
  residenzaFuoriUeSee: boolean | null;
}

export type EsitoRequisito = "ok" | "da_verificare" | "escluso";

export interface DettaglioRequisito {
  chiave: string;
  descrizione: string;
  esito: EsitoRequisito;
}

export interface EsitoRequisitiForfettario {
  esitoGlobale: EsitoRequisito;
  dettagli: DettaglioRequisito[];
}

export type EsitoSoglia = "sotto_permanenza" | "sopra_permanenza" | "sopra_uscita_immediata";

export interface ValutazioneSoglieForfettario {
  fatturatoIncassato: number;
  esito: EsitoSoglia;
  messaggio: string;
}
