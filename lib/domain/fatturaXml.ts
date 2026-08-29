import type { Cliente, DatiEmittente, Fattura } from "./types";
import { IMPORTO_BOLLO, dataScadenzaPagamento, numeroFattura, totaleDocumento, totaleRiga, totaleRighe } from "./fattura";

/**
 * Generazione del file XML FatturaPA da trasmettere allo SDI.
 *
 * Riferimenti verificati il 29/08/2026 (vedi DECISIONS.md):
 * - Schema XSD 1.2.3, namespace invariato .../v1.2 (non v1.2.3: cambiarlo è
 *   l'errore più comune in fase di aggiornamento).
 * - Specifiche tecniche AdE versione 1.9.1, in vigore dal 15/05/2026.
 * - Regime forfettario: RegimeFiscale RF19, Natura N2.2, AliquotaIVA 0.00.
 *
 * Il file prodotto non è firmato: per le fatture verso privati e aziende la
 * firma digitale non è richiesta, ed è il portale "Fatture e Corrispettivi" ad
 * apporre il proprio sigillo XAdES al momento dell'upload.
 */

export const NAMESPACE_FATTURAPA = "http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2";

/** Formato di trasmissione verso privati e aziende. Coincide con l'attributo `versione` della radice. */
export const FORMATO_TRASMISSIONE = "FPR12";

/** Regime forfettario, art. 1 commi 54-89 L. 190/2014. */
export const REGIME_FISCALE = "RF19";

/** "Non soggette - altri casi": la natura da usare per le operazioni nazionali di un forfettario. */
export const NATURA_FORFETTARIO = "N2.2";

/** Massimo 100 caratteri per il campo RiferimentoNormativo. */
export const RIFERIMENTO_NORMATIVO =
  "Operazione non soggetta a IVA ai sensi dell'art. 1, commi da 54 a 89, L. 190/2014";

/**
 * Le due causali che l'Agenzia delle Entrate chiede espressamente ai forfettari
 * di riportare in testata (pagina "Fattura elettronica per i forfettari").
 * Non sono alternative al RiferimentoNormativo nel riepilogo: vanno entrambe.
 */
export const CAUSALI_FORFETTARIO = [
  "Operazione effettuata in regime forfettario ai sensi dell'articolo 1, commi da 54 a 89, della Legge n. 190/2014 e successive modificazioni",
  "Operazione non soggetta a ritenuta alla fonte a titolo di acconto ai sensi dell'articolo 1, comma 67, Legge n. 190 del 2014 e successive modificazioni",
] as const;

export const DESCRIZIONE_RIGA_BOLLO = "Imposta di bollo assolta in modo virtuale ai sensi del DM 17/06/2014";

export interface ContestoFattura {
  fattura: Fattura;
  cliente: Cliente;
  emittente: DatiEmittente;
  /** Solo per le note di credito: numero e data della fattura stornata. */
  fatturaRiferimento?: { numero: string; data: string } | null;
}

/* ------------------------------------------------------------------ */
/* Validazione                                                         */
/* ------------------------------------------------------------------ */

export interface ErroreValidazione {
  campo: string;
  messaggio: string;
  /** Codice di scarto dello SDI che si eviterebbe correggendo questo campo, dove noto. */
  codiceSdi?: string;
}

const NATURE_GENERICHE_VIETATE = new Set(["N2", "N3", "N6"]);

function vuoto(valore: string | null | undefined): boolean {
  return valore === null || valore === undefined || valore.trim() === "";
}

/** La data odierna nel fuso di Roma: una fattura "di domani" viene scartata (00403). */
export function oggiRoma(adesso: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(adesso);
}

/**
 * Controlli che l'XSD da solo non copre. Lo schema valida struttura, ordine e
 * tipi; i controlli semantici dello SDI (00400, 00417, 00427...) no — e uno
 * scarto "brucia" comunque il nome file, quindi conviene intercettarli prima.
 */
export function validaFatturaPerXml(contesto: ContestoFattura, adesso: Date = new Date()): ErroreValidazione[] {
  const { fattura, cliente, emittente } = contesto;
  const errori: ErroreValidazione[] = [];

  if (vuoto(emittente.partitaIva)) {
    errori.push({ campo: "emittente.partitaIva", messaggio: "Partita IVA mancante nel profilo.", codiceSdi: "00301" });
  }
  if (vuoto(emittente.codiceFiscale)) {
    errori.push({
      campo: "emittente.codiceFiscale",
      messaggio: "Codice fiscale mancante nel profilo: serve come identificativo del trasmittente.",
      codiceSdi: "00300",
    });
  }
  if (vuoto(emittente.nome) || vuoto(emittente.cognome)) {
    errori.push({ campo: "emittente.anagrafica", messaggio: "Nome e cognome mancanti nel profilo." });
  }
  for (const [campo, valore] of [
    ["indirizzo", emittente.indirizzo],
    ["cap", emittente.cap],
    ["comune", emittente.comune],
  ] as const) {
    if (vuoto(valore)) {
      errori.push({ campo: `emittente.${campo}`, messaggio: `Sede dell'emittente incompleta: manca ${campo}.` });
    }
  }

  if (vuoto(cliente.partitaIva) && vuoto(cliente.codiceFiscale)) {
    errori.push({
      campo: "cliente.identificativo",
      messaggio: "Il cliente deve avere almeno la partita IVA o il codice fiscale.",
      codiceSdi: "00417",
    });
  }
  if (vuoto(cliente.denominazione) && (vuoto(cliente.nome) || vuoto(cliente.cognome))) {
    errori.push({
      campo: "cliente.anagrafica",
      messaggio: "Il cliente deve avere una denominazione oppure nome e cognome.",
    });
  }
  for (const [campo, valore] of [
    ["indirizzo", cliente.indirizzo],
    ["cap", cliente.cap],
    ["comune", cliente.comune],
  ] as const) {
    if (vuoto(valore)) {
      errori.push({ campo: `cliente.${campo}`, messaggio: `Sede del cliente incompleta: manca ${campo}.` });
    }
  }

  const codice = cliente.codiceDestinatario.toUpperCase();
  if (!/^[A-Z0-9]{7}$/.test(codice)) {
    errori.push({
      campo: "cliente.codiceDestinatario",
      messaggio: "Con formato FPR12 il codice destinatario deve essere di 7 caratteri alfanumerici maiuscoli.",
      codiceSdi: "00427",
    });
  }
  if (codice !== "0000000" && !vuoto(cliente.pecDestinatario)) {
    errori.push({
      campo: "cliente.pecDestinatario",
      messaggio: "La PEC del destinatario si indica solo quando il codice destinatario è 0000000.",
    });
  }
  if (codice === "XXXXXXX" && cliente.nazione.toUpperCase() === "IT") {
    errori.push({
      campo: "cliente.nazione",
      messaggio: "Il codice XXXXXXX è riservato ai soggetti non stabiliti in Italia.",
      codiceSdi: "00313",
    });
  }

  if (fattura.righe.length === 0) {
    errori.push({ campo: "fattura.righe", messaggio: "La fattura non ha righe di dettaglio." });
  }
  if (!/\d/.test(numeroFattura(fattura))) {
    errori.push({
      campo: "fattura.numero",
      messaggio: "Il numero del documento deve contenere almeno una cifra.",
      codiceSdi: "00425",
    });
  }
  if (fattura.dataEmissione > oggiRoma(adesso)) {
    errori.push({
      campo: "fattura.dataEmissione",
      messaggio: "La data della fattura non può essere successiva a oggi.",
      codiceSdi: "00403",
    });
  }
  if (NATURE_GENERICHE_VIETATE.has(NATURA_FORFETTARIO)) {
    errori.push({
      campo: "natura",
      messaggio: "I codici Natura generici N2, N3, N6 non sono più ammessi.",
      codiceSdi: "00445",
    });
  }
  if (RIFERIMENTO_NORMATIVO.length > 100) {
    errori.push({ campo: "riferimentoNormativo", messaggio: "Il riferimento normativo supera i 100 caratteri." });
  }
  if (fattura.tipoDocumento === "TD04" && !contesto.fatturaRiferimento) {
    errori.push({
      campo: "fattura.fatturaRiferimento",
      messaggio: "Una nota di credito deve indicare la fattura che storna.",
    });
  }
  if (!vuoto(fattura.xmlProgressivo) && !/^[a-zA-Z0-9]{1,5}$/.test(fattura.xmlProgressivo!)) {
    errori.push({
      campo: "fattura.xmlProgressivo",
      messaggio: "Il progressivo del nome file ammette al massimo 5 caratteri alfanumerici.",
      codiceSdi: "00001",
    });
  }

  return errori;
}

/* ------------------------------------------------------------------ */
/* Costruzione XML                                                     */
/* ------------------------------------------------------------------ */

/** Escape del testo: senza questo un cliente che si chiama "Rossi & Figli" produce un XML non valido. */
export function escapeXml(valore: string): string {
  return valore
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tag(nome: string, valore: string | number, livello: number): string {
  return `${"  ".repeat(livello)}<${nome}>${escapeXml(String(valore))}</${nome}>`;
}

/** Importi a 2 decimali: lo SDI confronta i valori, non le stringhe, ma il formato deve restare canonico. */
function importo(valore: number): string {
  return valore.toFixed(2);
}

function nomeCompleto(livello: number, denominazione: string | null, nome: string | null, cognome: string | null): string[] {
  const righe = [`${"  ".repeat(livello)}<Anagrafica>`];
  if (!vuoto(denominazione)) {
    righe.push(tag("Denominazione", denominazione!.trim(), livello + 1));
  } else {
    righe.push(tag("Nome", (nome ?? "").trim(), livello + 1));
    righe.push(tag("Cognome", (cognome ?? "").trim(), livello + 1));
  }
  righe.push(`${"  ".repeat(livello)}</Anagrafica>`);
  return righe;
}

function sede(
  livello: number,
  dati: { indirizzo: string | null; numeroCivico: string | null; cap: string | null; comune: string | null; provincia: string | null; nazione: string }
): string[] {
  const righe = [`${"  ".repeat(livello)}<Sede>`, tag("Indirizzo", (dati.indirizzo ?? "").trim(), livello + 1)];
  if (!vuoto(dati.numeroCivico)) righe.push(tag("NumeroCivico", dati.numeroCivico!.trim(), livello + 1));
  righe.push(tag("CAP", (dati.cap ?? "").trim(), livello + 1));
  righe.push(tag("Comune", (dati.comune ?? "").trim(), livello + 1));
  if (!vuoto(dati.provincia)) righe.push(tag("Provincia", dati.provincia!.trim().toUpperCase(), livello + 1));
  righe.push(tag("Nazione", dati.nazione.trim().toUpperCase(), livello + 1));
  righe.push(`${"  ".repeat(livello)}</Sede>`);
  return righe;
}

/**
 * Righe di dettaglio effettive: quelle salvate, più — se il bollo è
 * riaddebitato — la riga dei 2 €, che non viene persistita ma derivata dal
 * flag, così non può divergere dallo stato del bollo.
 */
export function righeConBollo(fattura: Fattura): { numeroLinea: number; descrizione: string; quantita: number; unitaMisura: string | null; prezzoUnitario: number }[] {
  const righe = [...fattura.righe]
    .sort((a, b) => a.numeroLinea - b.numeroLinea)
    .map((riga, indice) => ({ ...riga, numeroLinea: indice + 1 }));

  if (fattura.bolloApplicato && fattura.bolloRiaddebitato) {
    righe.push({
      id: "bollo",
      numeroLinea: righe.length + 1,
      descrizione: DESCRIZIONE_RIGA_BOLLO,
      quantita: 1,
      unitaMisura: null,
      prezzoUnitario: IMPORTO_BOLLO,
    });
  }
  return righe;
}

/** Nome del file da caricare sul portale: deve essere univoco per sempre, non per anno (scarto 00002). */
export function nomeFileXml(codiceFiscaleEmittente: string, progressivo: string): string {
  return `IT${codiceFiscaleEmittente.trim().toUpperCase()}_${progressivo}.xml`;
}

/**
 * Genera l'XML. Presuppone che `validaFatturaPerXml` non abbia restituito
 * errori: qui non si rivalida, si costruisce — separare le due cose evita che
 * un controllo silenzioso produca un file "quasi giusto" senza avvisare.
 */
/* ------------------------------------------------------------------ */
/* Costruttori dei blocchi                                             */
/* ------------------------------------------------------------------ */

/**
 * I quattro blocchi dell'XML sono costruiti da funzioni separate perché
 * l'ordine degli elementi è vincolante e sbagliarlo produce lo scarto 00200,
 * che è invisibile a occhio: una sequenza sola e lunga rende difficile vedere
 * dove finisce una `xs:sequence` e comincia l'altra. Ogni funzione qui
 * corrisponde a un blocco dello schema, così il confronto con le specifiche è
 * diretto.
 */

function bloccoDatiTrasmissione(cliente: Cliente, emittente: DatiEmittente, progressivoInvio: string): string[] {
  const codiceDestinatario = cliente.codiceDestinatario.toUpperCase();
  const out = [
    "    <DatiTrasmissione>",
    "      <IdTrasmittente>",
    tag("IdPaese", "IT", 4),
    tag("IdCodice", (emittente.codiceFiscale ?? "").trim().toUpperCase(), 4),
    "      </IdTrasmittente>",
    tag("ProgressivoInvio", progressivoInvio, 3),
    tag("FormatoTrasmissione", FORMATO_TRASMISSIONE, 3),
    tag("CodiceDestinatario", codiceDestinatario, 3),
  ];
  // La PEC ha effetto solo con codice destinatario 0000000: indicarla altrove
  // non è un'alternativa, è un errore.
  if (codiceDestinatario === "0000000" && !vuoto(cliente.pecDestinatario)) {
    out.push(tag("PECDestinatario", cliente.pecDestinatario!.trim(), 3));
  }
  out.push("    </DatiTrasmissione>");
  return out;
}

function bloccoCedentePrestatore(emittente: DatiEmittente): string[] {
  return [
    "    <CedentePrestatore>",
    "      <DatiAnagrafici>",
    "        <IdFiscaleIVA>",
    tag("IdPaese", "IT", 5),
    tag("IdCodice", (emittente.partitaIva ?? "").trim(), 5),
    "        </IdFiscaleIVA>",
    tag("CodiceFiscale", (emittente.codiceFiscale ?? "").trim().toUpperCase(), 4),
    ...nomeCompleto(4, null, emittente.nome, emittente.cognome),
    tag("RegimeFiscale", REGIME_FISCALE, 4),
    "      </DatiAnagrafici>",
    ...sede(3, emittente),
    "    </CedentePrestatore>",
  ];
}

function bloccoCessionarioCommittente(cliente: Cliente): string[] {
  const out = ["    <CessionarioCommittente>", "      <DatiAnagrafici>"];
  if (!vuoto(cliente.partitaIva)) {
    out.push("        <IdFiscaleIVA>");
    out.push(tag("IdPaese", cliente.idPaese.trim().toUpperCase(), 5));
    out.push(tag("IdCodice", cliente.partitaIva!.trim(), 5));
    out.push("        </IdFiscaleIVA>");
  }
  if (!vuoto(cliente.codiceFiscale)) {
    out.push(tag("CodiceFiscale", cliente.codiceFiscale!.trim().toUpperCase(), 4));
  }
  out.push(...nomeCompleto(4, cliente.denominazione, cliente.nome, cliente.cognome));
  out.push("      </DatiAnagrafici>");
  out.push(...sede(3, cliente));
  out.push("    </CessionarioCommittente>");
  return out;
}

function bloccoDatiGenerali(contesto: ContestoFattura, totale: number): string[] {
  const { fattura } = contesto;
  const out = [
    "    <DatiGenerali>",
    "      <DatiGeneraliDocumento>",
    tag("TipoDocumento", fattura.tipoDocumento, 4),
    tag("Divisa", "EUR", 4),
    tag("Data", fattura.dataEmissione, 4),
    tag("Numero", numeroFattura(fattura), 4),
  ];
  // DatiBollo sta fra Numero e ImportoTotaleDocumento: sesta posizione della
  // sequenza, dopo DatiRitenuta e prima di DatiCassaPrevidenziale, entrambi
  // assenti per un forfettario senza cassa.
  if (fattura.bolloApplicato) {
    out.push("        <DatiBollo>");
    out.push(tag("BolloVirtuale", "SI", 5));
    out.push(tag("ImportoBollo", importo(IMPORTO_BOLLO), 5));
    out.push("        </DatiBollo>");
  }
  out.push(tag("ImportoTotaleDocumento", importo(totale), 4));
  for (const causale of CAUSALI_FORFETTARIO) out.push(tag("Causale", causale, 4));
  if (!vuoto(fattura.causaleAggiuntiva)) {
    out.push(tag("Causale", fattura.causaleAggiuntiva!.trim().slice(0, 200), 4));
  }
  out.push("      </DatiGeneraliDocumento>");

  if (fattura.tipoDocumento === "TD04" && contesto.fatturaRiferimento) {
    out.push("      <DatiFattureCollegate>");
    out.push(tag("IdDocumento", contesto.fatturaRiferimento.numero, 4));
    out.push(tag("Data", contesto.fatturaRiferimento.data, 4));
    out.push("      </DatiFattureCollegate>");
  }
  out.push("    </DatiGenerali>");
  return out;
}

function bloccoDatiBeniServizi(righe: ReturnType<typeof righeConBollo>, imponibile: number): string[] {
  const out = ["    <DatiBeniServizi>"];

  for (const riga of righe) {
    out.push("      <DettaglioLinee>");
    out.push(tag("NumeroLinea", riga.numeroLinea, 4));
    out.push(tag("Descrizione", riga.descrizione.trim().slice(0, 1000), 4));
    out.push(tag("Quantita", riga.quantita.toFixed(2), 4));
    if (!vuoto(riga.unitaMisura)) out.push(tag("UnitaMisura", riga.unitaMisura!.trim(), 4));
    out.push(tag("PrezzoUnitario", importo(riga.prezzoUnitario), 4));
    out.push(tag("PrezzoTotale", importo(totaleRiga(riga)), 4));
    // Natura viene dopo AliquotaIVA: l'ordine è vincolante (scarto 00200).
    out.push(tag("AliquotaIVA", importo(0), 4));
    out.push(tag("Natura", NATURA_FORFETTARIO, 4));
    out.push("      </DettaglioLinee>");
  }

  // Un solo riepilogo: tutte le righe di un forfettario condividono la coppia
  // (AliquotaIVA 0.00, Natura N2.2) e aggregano quindi in un blocco unico.
  out.push("      <DatiRiepilogo>");
  out.push(tag("AliquotaIVA", importo(0), 4));
  out.push(tag("Natura", NATURA_FORFETTARIO, 4));
  out.push(tag("ImponibileImporto", importo(imponibile), 4));
  out.push(tag("Imposta", importo(0), 4));
  out.push(tag("RiferimentoNormativo", RIFERIMENTO_NORMATIVO, 4));
  out.push("      </DatiRiepilogo>");
  out.push("    </DatiBeniServizi>");
  return out;
}

function bloccoDatiPagamento(fattura: Fattura, emittente: DatiEmittente, totale: number): string[] {
  const out = [
    "    <DatiPagamento>",
    tag("CondizioniPagamento", fattura.condizioniPagamento, 3),
    "      <DettaglioPagamento>",
    tag("ModalitaPagamento", fattura.modalitaPagamento, 4),
    tag("DataScadenzaPagamento", dataScadenzaPagamento(fattura), 4),
    tag("ImportoPagamento", importo(totale), 4),
  ];
  if (!vuoto(emittente.iban)) {
    out.push(tag("IBAN", emittente.iban!.replace(/\s/g, "").toUpperCase(), 4));
  }
  out.push("      </DettaglioPagamento>", "    </DatiPagamento>");
  return out;
}

/**
 * Genera l'XML. Presuppone che `validaFatturaPerXml` non abbia restituito
 * errori: qui non si rivalida, si costruisce — separare le due cose evita che
 * un controllo silenzioso produca un file "quasi giusto" senza avvisare.
 */
export function generaXmlFattura(contesto: ContestoFattura): string {
  const { fattura, cliente, emittente } = contesto;
  const righe = righeConBollo(fattura);
  const imponibile = totaleRighe(righe);
  const totale = totaleDocumento(fattura);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<p:FatturaElettronica versione="${FORMATO_TRASMISSIONE}" xmlns:p="${NAMESPACE_FATTURAPA}">`,
    "  <FatturaElettronicaHeader>",
    ...bloccoDatiTrasmissione(cliente, emittente, fattura.xmlProgressivo ?? "00001"),
    ...bloccoCedentePrestatore(emittente),
    ...bloccoCessionarioCommittente(cliente),
    "  </FatturaElettronicaHeader>",
    "  <FatturaElettronicaBody>",
    ...bloccoDatiGenerali(contesto, totale),
    ...bloccoDatiBeniServizi(righe, imponibile),
    ...bloccoDatiPagamento(fattura, emittente, totale),
    "  </FatturaElettronicaBody>",
    "</p:FatturaElettronica>",
  ].join("\n");
}
