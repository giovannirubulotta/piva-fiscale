import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generaXmlFattura } from "./fatturaXml";
import type { Cliente, DatiEmittente, Fattura } from "./types";

/**
 * Validazione contro lo schema XSD ufficiale della FatturaPA.
 *
 * ## Cosa copre davvero, e cosa no
 *
 * Lo schema in `schema/` è quello **ufficiale dell'Agenzia delle Entrate,
 * revisione 1.2.1**, ottenuto dal pacchetto npm `fatturapa`. Non è la 1.2.3 in
 * vigore: le pagine dell'Agenzia rispondono 403 ai client automatici, quindi la
 * revisione corrente non è scaricabile da una pipeline e andrebbe salvata a
 * mano da un browser.
 *
 * Fra le due revisioni, per questo generatore, cambiano **solo tre elenchi di
 * valori ammessi**, estesi dopo la 1.2.1 — fra cui `N2.2`, che dal 2021 ha
 * sostituito il generico `N2` ed è proprio il codice che un forfettario deve
 * usare. Validare contro la 1.2.1 tale e quale boccerebbe quindi un file
 * corretto.
 *
 * Perciò si rilassano **esclusivamente** quei tre tipi enumerati e si lascia
 * intatto tutto il resto. Quello che resta è comunque la parte che conta:
 * struttura, **ordine degli elementi** (lo scarto 00200, il più insidioso
 * perché invisibile a occhio), obbligatorietà, tipi, pattern e lunghezze.
 *
 * Quello che questo test **non** verifica è che i codici usati appartengano
 * agli elenchi correnti: lo fanno i test in `fatturaXml.test.ts`, che fissano
 * RF19, N2.2, TD01 e TD04 come costanti verificate sulle specifiche 1.9.1.
 *
 * Dichiarare il confine è il punto: un controllo che si spaccia per più di
 * quello che è vale meno di nessun controllo, perché genera fiducia mal riposta.
 */

/** Estesi dopo la 1.2.1: elencati per esteso perché la deroga sia verificabile. */
const ENUMERAZIONI_ESTESE = [
  ["NaturaType", "N2/N3/N6 suddivisi in N2.1, N2.2, N3.1-N3.6, N6.1-N6.9 dal 01/01/2021"],
  ["TipoDocumentoType", "aggiunti TD16-TD28 (rev. 1.2.2) e TD29 (specifiche 1.9)"],
  ["RegimeFiscaleType", "aggiunto RF20, regime transfrontaliero di franchigia (specifiche 1.9)"],
] as const;

function rilassaEnumerazione(xsd: string, tipo: string): string {
  const inizio = xsd.indexOf(`<xs:simpleType name="${tipo}">`);
  if (inizio === -1) throw new Error(`Tipo ${tipo} assente dallo schema: la revisione è cambiata?`);
  const fine = xsd.indexOf("</xs:simpleType>", inizio) + "</xs:simpleType>".length;
  return (
    xsd.slice(0, inizio) +
    `<xs:simpleType name="${tipo}"><xs:restriction base="xs:string"/></xs:simpleType>` +
    xsd.slice(fine)
  );
}

const emittente: DatiEmittente = {
  partitaIva: "12345678901",
  codiceFiscale: "RSSMRA80A01H501U",
  nome: "Mario",
  cognome: "Rossi",
  indirizzo: "Via Garibaldi",
  numeroCivico: "12",
  cap: "10121",
  comune: "Torino",
  provincia: "TO",
  nazione: "IT",
  email: null,
  telefono: null,
  iban: "IT60X0542811101000000123456",
  bolloRiaddebitato: true,
};

const societa: Cliente = {
  id: "c1",
  tipologia: "societa",
  denominazione: "Beta & Figli S.r.l.",
  nome: null,
  cognome: null,
  codiceFiscale: null,
  partitaIva: "09876543210",
  idPaese: "IT",
  indirizzo: "Via Torino",
  numeroCivico: "38",
  cap: "20100",
  comune: "Milano",
  provincia: "MI",
  nazione: "IT",
  codiceDestinatario: "ABC1234",
  pecDestinatario: null,
  email: null,
  telefono: null,
  note: null,
};

const privato: Cliente = {
  ...societa,
  id: "c2",
  tipologia: "privato",
  denominazione: null,
  nome: "Giuseppe",
  cognome: "Verdi",
  partitaIva: null,
  codiceFiscale: "VRDGPP85M15F205X",
  codiceDestinatario: "0000000",
  pecDestinatario: "verdi@pec.it",
};

const base: Fattura = {
  id: "f1",
  clienteId: "c1",
  tipoDocumento: "TD01",
  fatturaRiferimentoId: null,
  anno: 2026,
  progressivo: 12,
  dataEmissione: "2026-08-29",
  dataIncasso: null,
  stato: "emessa",
  bolloApplicato: false,
  bolloRiaddebitato: true,
  condizioniPagamento: "TP02",
  modalitaPagamento: "MP05",
  giorniScadenzaPagamento: 30,
  causaleAggiuntiva: null,
  note: null,
  xmlProgressivo: "00001",
  ricorrenteId: null,
  righe: [
    { id: "r1", numeroLinea: 1, descrizione: "Consulenza <strategica> & analisi", quantita: 2, unitaMisura: "ore", prezzoUnitario: 500 },
  ],
};

/** Casi che si comportano diversamente nell'XML prodotto, non varianti cosmetiche. */
const ESEMPLARI: { nome: string; xml: () => string }[] = [
  { nome: "fattura a società, senza bollo", xml: () => generaXmlFattura({ fattura: base, cliente: societa, emittente }) },
  {
    nome: "bollo riaddebitato: riga aggiuntiva e totale maggiorato",
    xml: () => generaXmlFattura({ fattura: { ...base, bolloApplicato: true, bolloRiaddebitato: true }, cliente: societa, emittente }),
  },
  {
    nome: "bollo a carico dell'emittente: blocco DatiBollo senza riga",
    xml: () => generaXmlFattura({ fattura: { ...base, bolloApplicato: true, bolloRiaddebitato: false }, cliente: societa, emittente }),
  },
  {
    nome: "privato con PEC e più righe: niente IdFiscaleIVA, PECDestinatario presente",
    xml: () =>
      generaXmlFattura({
        fattura: {
          ...base,
          righe: [
            base.righe[0],
            { id: "r2", numeroLinea: 2, descrizione: "Rimborso spese", quantita: 1, unitaMisura: null, prezzoUnitario: 42.5 },
          ],
        },
        cliente: privato,
        emittente,
      }),
  },
  {
    nome: "nota di credito: DatiFattureCollegate dopo DatiGeneraliDocumento",
    xml: () =>
      generaXmlFattura({
        fattura: { ...base, tipoDocumento: "TD04", fatturaRiferimentoId: "f0" },
        cliente: societa,
        emittente,
        fatturaRiferimento: { numero: "5/2026", data: "2026-06-30" },
      }),
  },
  {
    nome: "causale aggiuntiva e nessun IBAN",
    xml: () =>
      generaXmlFattura({
        fattura: { ...base, causaleAggiuntiva: "Riferimento contratto 2026/17" },
        cliente: societa,
        emittente: { ...emittente, iban: null },
      }),
  },
];

function xmllintDisponibile(): boolean {
  try {
    execFileSync("xmllint", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Su una macchina senza xmllint il test si salta con un messaggio esplicito
// invece di fallire: in CI il binario c'è (ubuntu-latest lo include), quindi
// lì il controllo è effettivo. Un salto silenzioso sarebbe peggio di nulla.
const conXmllint = xmllintDisponibile() ? describe : describe.skip;

conXmllint("conformità allo schema XSD ufficiale FatturaPA", () => {
  let cartella: string;
  let schema: string;

  beforeAll(() => {
    cartella = mkdtempSync(join(tmpdir(), "fatturapa-"));
    schema = join(cartella, "schema.xsd");

    let xsd = readFileSync("schema/Schema_1.2.1.xsd", "utf8");
    for (const [tipo] of ENUMERAZIONI_ESTESE) xsd = rilassaEnumerazione(xsd, tipo);
    writeFileSync(schema, xsd);
    // Lo schema importa xmldsig da "resources/": va riprodotto quel percorso
    // relativo, altrimenti xmllint salta l'import e poi fallisce a compilare.
    mkdirSync(join(cartella, "resources"), { recursive: true });
    writeFileSync(join(cartella, "resources/xmldsig-core-schema.xsd"), readFileSync("schema/xmldsig-core-schema.xsd"));

    return () => rmSync(cartella, { recursive: true, force: true });
  });

  it("lo schema contiene i tre tipi che ci si aspetta di dover rilassare", () => {
    const xsd = readFileSync("schema/Schema_1.2.1.xsd", "utf8");
    for (const [tipo] of ENUMERAZIONI_ESTESE) {
      expect(xsd, `${tipo} deve esistere nello schema`).toContain(`<xs:simpleType name="${tipo}">`);
    }
  });

  for (const esemplare of ESEMPLARI) {
    it(`è conforme: ${esemplare.nome}`, () => {
      const documento = join(cartella, `${esemplare.nome.replace(/[^a-z0-9]+/gi, "-")}.xml`);
      writeFileSync(documento, esemplare.xml());
      try {
        execFileSync("xmllint", ["--noout", "--schema", schema, documento], { stdio: ["ignore", "ignore", "pipe"] });
      } catch (errore) {
        const dettaglio = String((errore as { stderr?: Buffer }).stderr ?? errore);
        throw new Error(`XML non conforme allo schema FatturaPA:\n${dettaglio}`);
      }
    });
  }
});
