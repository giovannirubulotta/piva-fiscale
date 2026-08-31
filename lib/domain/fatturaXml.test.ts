import { describe, it, expect } from "vitest";
import {
  FORMATO_TRASMISSIONE,
  NAMESPACE_FATTURAPA,
  NATURA_FORFETTARIO,
  REGIME_FISCALE,
  RIFERIMENTO_NORMATIVO,
  escapeXml,
  generaXmlFattura,
  nomeFileXml,
  oggiRoma,
  righeConBollo,
  validaFatturaPerXml,
  type ContestoFattura,
} from "./fatturaXml";
import type { Cliente, DatiEmittente, Fattura, RigaFattura } from "./types";

function riga(overrides: Partial<RigaFattura> = {}): RigaFattura {
  return {
    id: "r1",
    numeroLinea: 1,
    descrizione: "Consulenza strategica — agosto 2026",
    quantita: 1,
    unitaMisura: null,
    prezzoUnitario: 1000,
    ...overrides,
  };
}

function emittente(overrides: Partial<DatiEmittente> = {}): DatiEmittente {
  return {
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
    ...overrides,
  };
}

function cliente(overrides: Partial<Cliente> = {}): Cliente {
  return {
    id: "c1",
    tipologia: "societa",
    denominazione: "Beta S.r.l.",
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
    ...overrides,
  };
}

function fattura(overrides: Partial<Fattura> = {}): Fattura {
  return {
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
    righe: [riga()],
    ...overrides,
  };
}

function contesto(overrides: Partial<ContestoFattura> = {}): ContestoFattura {
  return { fattura: fattura(), cliente: cliente(), emittente: emittente(), ...overrides };
}

const ADESSO = new Date("2026-08-29T12:00:00Z");

/** Estrae i nomi dei tag di apertura nell'ordine in cui compaiono: serve a verificare le sequenze dell'XSD. */
function ordineTag(xml: string): string[] {
  return [...xml.matchAll(/^\s*<([A-Za-z:]+)>/gm)].map((m) => m[1]);
}

describe("escapeXml", () => {
  it("neutralizza i caratteri che romperebbero il documento", () => {
    expect(escapeXml('Rossi & Figli <"test">')).toBe("Rossi &amp; Figli &lt;&quot;test&quot;&gt;");
  });

  it("è applicato ai dati del cliente nel documento generato", () => {
    const xml = generaXmlFattura(contesto({ cliente: cliente({ denominazione: "Rossi & Figli" }) }));
    expect(xml).toContain("<Denominazione>Rossi &amp; Figli</Denominazione>");
    expect(xml).not.toContain("Rossi & Figli<");
  });
});

describe("costanti del regime forfettario", () => {
  it("usa RF19, N2.2 e il namespace 1.2 (non 1.2.3)", () => {
    expect(REGIME_FISCALE).toBe("RF19");
    expect(NATURA_FORFETTARIO).toBe("N2.2");
    expect(FORMATO_TRASMISSIONE).toBe("FPR12");
    expect(NAMESPACE_FATTURAPA).toBe("http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2");
  });

  it("mantiene il riferimento normativo entro i 100 caratteri ammessi", () => {
    expect(RIFERIMENTO_NORMATIVO.length).toBeLessThanOrEqual(100);
  });
});

describe("generaXmlFattura — struttura", () => {
  it("dichiara la stessa versione nell'attributo e in FormatoTrasmissione (scarto 00428)", () => {
    const xml = generaXmlFattura(contesto());
    expect(xml).toContain(`versione="FPR12"`);
    expect(xml).toContain("<FormatoTrasmissione>FPR12</FormatoTrasmissione>");
  });

  it("mette Natura dopo AliquotaIVA sia nelle righe sia nel riepilogo (ordine XSD)", () => {
    const tags = ordineTag(generaXmlFattura(contesto()));
    const iAliquota = tags.indexOf("AliquotaIVA");
    expect(tags[iAliquota + 1]).toBe("Natura");
    const iAliquotaRiepilogo = tags.lastIndexOf("AliquotaIVA");
    expect(tags[iAliquotaRiepilogo + 1]).toBe("Natura");
  });

  it("mette le Causale dopo ImportoTotaleDocumento, non subito dopo Numero", () => {
    const tags = ordineTag(generaXmlFattura(contesto()));
    expect(tags.indexOf("Causale")).toBeGreaterThan(tags.indexOf("ImportoTotaleDocumento"));
  });

  it("riporta entrambe le causali chieste dall'Agenzia delle Entrate ai forfettari", () => {
    const xml = generaXmlFattura(contesto());
    expect(xml).toContain("regime forfettario ai sensi dell&apos;articolo 1, commi da 54 a 89");
    expect(xml).toContain("non soggetta a ritenuta alla fonte");
  });

  it("non emette DatiRitenuta né DatiCassaPrevidenziale", () => {
    const xml = generaXmlFattura(contesto());
    expect(xml).not.toContain("<DatiRitenuta>");
    expect(xml).not.toContain("<DatiCassaPrevidenziale>");
  });

  it("emette aliquota e imposta a zero con la natura, mai un'aliquota nuda", () => {
    const xml = generaXmlFattura(contesto());
    expect(xml).toContain("<AliquotaIVA>0.00</AliquotaIVA>");
    expect(xml).toContain("<Imposta>0.00</Imposta>");
    expect(xml).toContain("<Natura>N2.2</Natura>");
  });

  it("chiude tutti i tag che apre, radice con attributi inclusa", () => {
    const xml = generaXmlFattura(contesto());
    // L'apertura ammette attributi (la radice ne ha due), la chiusura no.
    const aperti = [...xml.matchAll(/<([A-Za-z][A-Za-z0-9:]*)(?:\s[^>]*)?>/g)].map((m) => m[1]);
    const chiusi = [...xml.matchAll(/<\/([A-Za-z][A-Za-z0-9:]*)>/g)].map((m) => m[1]);
    expect(aperti.sort()).toEqual(chiusi.sort());
    expect(aperti).toContain("p:FatturaElettronica");
  });
});

describe("generaXmlFattura — cliente privato", () => {
  const privato = cliente({
    tipologia: "privato",
    denominazione: null,
    nome: "Giuseppe",
    cognome: "Verdi",
    partitaIva: null,
    codiceFiscale: "VRDGPP85M15F205X",
    codiceDestinatario: "0000000",
  });

  it("omette IdFiscaleIVA e usa nome e cognome", () => {
    const xml = generaXmlFattura(contesto({ cliente: privato }));
    const cessionario = xml.split("<CessionarioCommittente>")[1];
    expect(cessionario).not.toContain("<IdFiscaleIVA>");
    expect(cessionario).toContain("<Nome>Giuseppe</Nome>");
    expect(cessionario).toContain("<Cognome>Verdi</Cognome>");
  });

  it("indica la PEC solo se il codice destinatario è 0000000", () => {
    const conPec = generaXmlFattura(contesto({ cliente: { ...privato, pecDestinatario: "verdi@pec.it" } }));
    expect(conPec).toContain("<PECDestinatario>verdi@pec.it</PECDestinatario>");

    const conCodice = generaXmlFattura(
      contesto({ cliente: { ...privato, codiceDestinatario: "ABC1234", pecDestinatario: "verdi@pec.it" } })
    );
    expect(conCodice).not.toContain("PECDestinatario");
  });
});

describe("generaXmlFattura — bollo", () => {
  it("aggiunge il blocco DatiBollo quando il bollo è applicato", () => {
    const xml = generaXmlFattura(contesto({ fattura: fattura({ bolloApplicato: true }) }));
    expect(xml).toContain("<BolloVirtuale>SI</BolloVirtuale>");
    expect(xml).toContain("<ImportoBollo>2.00</ImportoBollo>");
  });

  it("con bollo riaddebitato aggiunge la riga da 2 € e alza imponibile e totale", () => {
    const xml = generaXmlFattura(
      contesto({ fattura: fattura({ bolloApplicato: true, bolloRiaddebitato: true }) })
    );
    expect(xml).toContain("Imposta di bollo assolta in modo virtuale");
    expect(xml).toContain("<ImponibileImporto>1002.00</ImponibileImporto>");
    expect(xml).toContain("<ImportoTotaleDocumento>1002.00</ImportoTotaleDocumento>");
  });

  it("con bollo a carico dell'emittente non aggiunge la riga né alza il totale", () => {
    const xml = generaXmlFattura(
      contesto({ fattura: fattura({ bolloApplicato: true, bolloRiaddebitato: false }) })
    );
    expect(xml).not.toContain("Imposta di bollo assolta");
    expect(xml).toContain("<ImponibileImporto>1000.00</ImponibileImporto>");
    expect(xml).toContain("<ImportoTotaleDocumento>1000.00</ImportoTotaleDocumento>");
  });

  it("rinumera le linee in sequenza continua includendo la riga del bollo", () => {
    const righe = righeConBollo(
      fattura({ bolloApplicato: true, bolloRiaddebitato: true, righe: [riga({ numeroLinea: 7 }), riga({ id: "r2", numeroLinea: 9 })] })
    );
    expect(righe.map((r) => r.numeroLinea)).toEqual([1, 2, 3]);
  });
});

describe("generaXmlFattura — nota di credito", () => {
  it("emette TD04 con il riferimento alla fattura stornata", () => {
    const xml = generaXmlFattura(
      contesto({
        fattura: fattura({ tipoDocumento: "TD04", fatturaRiferimentoId: "f0" }),
        fatturaRiferimento: { numero: "5/2026", data: "2026-06-30" },
      })
    );
    expect(xml).toContain("<TipoDocumento>TD04</TipoDocumento>");
    expect(xml).toContain("<IdDocumento>5/2026</IdDocumento>");
    const tags = ordineTag(xml);
    expect(tags.indexOf("DatiFattureCollegate")).toBeGreaterThan(tags.indexOf("DatiGeneraliDocumento"));
  });
});

describe("nomeFileXml", () => {
  it("usa il prefisso IT, il codice fiscale e il progressivo", () => {
    expect(nomeFileXml("rssmra80a01h501u", "00001")).toBe("ITRSSMRA80A01H501U_00001.xml");
  });
});

describe("oggiRoma", () => {
  it("usa il fuso di Roma, non UTC: dopo le 22:00 d'estate non anticipa il giorno", () => {
    expect(oggiRoma(new Date("2026-08-29T22:30:00Z"))).toBe("2026-08-30");
    expect(oggiRoma(new Date("2026-08-29T12:00:00Z"))).toBe("2026-08-29");
  });
});

describe("validaFatturaPerXml", () => {
  it("non segnala errori su una fattura completa", () => {
    expect(validaFatturaPerXml(contesto(), ADESSO)).toEqual([]);
  });

  it("segnala il cliente senza né partita IVA né codice fiscale (scarto 00417)", () => {
    const errori = validaFatturaPerXml(
      contesto({ cliente: cliente({ partitaIva: null, codiceFiscale: null }) }),
      ADESSO
    );
    expect(errori.some((e) => e.codiceSdi === "00417")).toBe(true);
  });

  it("segnala un codice destinatario di lunghezza sbagliata per FPR12 (scarto 00427)", () => {
    const errori = validaFatturaPerXml(contesto({ cliente: cliente({ codiceDestinatario: "ABC123" }) }), ADESSO);
    expect(errori.some((e) => e.codiceSdi === "00427")).toBe(true);
  });

  it("segnala la PEC indicata insieme a un codice destinatario reale", () => {
    const errori = validaFatturaPerXml(
      contesto({ cliente: cliente({ codiceDestinatario: "ABC1234", pecDestinatario: "x@pec.it" }) }),
      ADESSO
    );
    expect(errori.some((e) => e.campo === "cliente.pecDestinatario")).toBe(true);
  });

  it("segnala XXXXXXX usato per un cliente italiano (scarto 00313)", () => {
    const errori = validaFatturaPerXml(
      contesto({ cliente: cliente({ codiceDestinatario: "XXXXXXX", nazione: "IT" }) }),
      ADESSO
    );
    expect(errori.some((e) => e.codiceSdi === "00313")).toBe(true);
  });

  it("segnala una fattura con data futura (scarto 00403)", () => {
    const errori = validaFatturaPerXml(contesto({ fattura: fattura({ dataEmissione: "2026-09-15" }) }), ADESSO);
    expect(errori.some((e) => e.codiceSdi === "00403")).toBe(true);
  });

  it("segnala il profilo dell'emittente incompleto", () => {
    const errori = validaFatturaPerXml(
      contesto({ emittente: emittente({ partitaIva: null, codiceFiscale: null, comune: null }) }),
      ADESSO
    );
    expect(errori.map((e) => e.campo)).toEqual(
      expect.arrayContaining(["emittente.partitaIva", "emittente.codiceFiscale", "emittente.comune"])
    );
  });

  it("segnala una nota di credito senza fattura di riferimento", () => {
    const errori = validaFatturaPerXml(contesto({ fattura: fattura({ tipoDocumento: "TD04" }) }), ADESSO);
    expect(errori.some((e) => e.campo === "fattura.fatturaRiferimento")).toBe(true);
  });

  it("segnala una fattura senza righe", () => {
    const errori = validaFatturaPerXml(contesto({ fattura: fattura({ righe: [] }) }), ADESSO);
    expect(errori.some((e) => e.campo === "fattura.righe")).toBe(true);
  });

  it("segnala un progressivo del nome file oltre i 5 caratteri (scarto 00001)", () => {
    const errori = validaFatturaPerXml(contesto({ fattura: fattura({ xmlProgressivo: "000001" }) }), ADESSO);
    expect(errori.some((e) => e.codiceSdi === "00001")).toBe(true);
  });
});
