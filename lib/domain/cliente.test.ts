import { describe, it, expect } from "vitest";
import {
  clientePronto,
  codiceDestinatarioValido,
  datiMancanti,
  identificativoFiscale,
  nomeCliente,
} from "./cliente";
import { validaFatturaPerXml } from "./fatturaXml";
import type { Cliente, DatiEmittente, Fattura } from "./types";

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

describe("nomeCliente", () => {
  it("preferisce la denominazione quando c'è", () => {
    expect(nomeCliente({ denominazione: "Beta S.r.l.", nome: "Mario", cognome: "Rossi" })).toBe("Beta S.r.l.");
  });

  it("compone nome e cognome per le persone fisiche", () => {
    expect(nomeCliente({ denominazione: null, nome: "Mario", cognome: "Rossi" })).toBe("Mario Rossi");
  });

  it("regge un cognome senza nome", () => {
    expect(nomeCliente({ denominazione: null, nome: null, cognome: "Rossi" })).toBe("Rossi");
  });

  it("non restituisce mai una stringa vuota, che in elenco sarebbe una riga invisibile", () => {
    expect(nomeCliente({ denominazione: "   ", nome: null, cognome: null })).toBe("Senza nome");
  });
});

describe("identificativoFiscale", () => {
  it("etichetta la partita IVA e la preferisce al codice fiscale", () => {
    expect(identificativoFiscale({ partitaIva: "09876543210", codiceFiscale: "RSSMRA80A01H501U" })).toBe(
      "P.IVA 09876543210"
    );
  });

  it("ripiega sul codice fiscale", () => {
    expect(identificativoFiscale({ partitaIva: null, codiceFiscale: "RSSMRA80A01H501U" })).toBe(
      "C.F. RSSMRA80A01H501U"
    );
  });

  it("restituisce null se non c'è nessuno dei due", () => {
    expect(identificativoFiscale({ partitaIva: null, codiceFiscale: null })).toBeNull();
  });
});

describe("codiceDestinatarioValido", () => {
  it("accetta sette caratteri alfanumerici, normalizzando il maiuscolo", () => {
    expect(codiceDestinatarioValido("abc1234")).toBe(true);
    expect(codiceDestinatarioValido("0000000")).toBe(true);
  });

  it("rifiuta sei caratteri, che sono il formato riservato alla PA", () => {
    expect(codiceDestinatarioValido("ABC123")).toBe(false);
  });
});

describe("clientePronto e datiMancanti", () => {
  it("riconosce un cliente completo", () => {
    expect(clientePronto(cliente())).toBe(true);
    expect(datiMancanti(cliente())).toEqual([]);
  });

  it("elenca cosa manca invece di limitarsi a bloccare", () => {
    const incompleto = cliente({ partitaIva: null, codiceFiscale: null, cap: null, codiceDestinatario: "ABC123" });
    expect(clientePronto(incompleto)).toBe(false);
    expect(datiMancanti(incompleto)).toEqual([
      "partita IVA o codice fiscale",
      "CAP",
      "codice destinatario a 7 caratteri",
    ]);
  });
});

/**
 * Il rischio che l'estrazione voleva chiudere: l'interfaccia diceva "pronto"
 * mentre il generatore XML rifiutava, o viceversa. Questo test lega le due
 * definizioni, così divergere costa un test rosso invece di un file scartato
 * dallo SDI.
 */
describe("coerenza fra clientePronto e la validazione XML", () => {
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
    iban: null,
    bolloRiaddebitato: true,
  };

  const fattura: Fattura = {
    id: "f1",
    clienteId: "c1",
    tipoDocumento: "TD01",
    fatturaRiferimentoId: null,
    anno: 2026,
    progressivo: 1,
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
    xmlProgressivo: null,
    ricorrenteId: null,
    righe: [{ id: "r1", numeroLinea: 1, descrizione: "Consulenza", quantita: 1, unitaMisura: null, prezzoUnitario: 100 }],
  };

  const adesso = new Date("2026-08-29T12:00:00Z");

  const casi: { nome: string; cliente: Cliente }[] = [
    { nome: "completo", cliente: cliente() },
    { nome: "senza identificativo fiscale", cliente: cliente({ partitaIva: null, codiceFiscale: null }) },
    { nome: "senza CAP", cliente: cliente({ cap: null }) },
    { nome: "senza comune", cliente: cliente({ comune: null }) },
    { nome: "senza indirizzo", cliente: cliente({ indirizzo: null }) },
    { nome: "codice destinatario a 6 caratteri", cliente: cliente({ codiceDestinatario: "ABC123" }) },
    { nome: "privato con solo codice fiscale", cliente: cliente({ partitaIva: null, codiceFiscale: "VRDGPP85M15F205X", codiceDestinatario: "0000000" }) },
  ];

  for (const caso of casi) {
    it(`concorda sul caso: ${caso.nome}`, () => {
      const erroriSulCliente = validaFatturaPerXml(
        { fattura, cliente: caso.cliente, emittente },
        adesso
      ).filter((errore) => errore.campo.startsWith("cliente."));

      expect(clientePronto(caso.cliente)).toBe(erroriSulCliente.length === 0);
    });
  }
});
