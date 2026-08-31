import { describe, it, expect } from "vitest";
import {
  classifica,
  componiCsv,
  fatturatoPerCliente,
  periodiPredefiniti,
  rigaCsv,
  riepilogoOperativo,
  spesePerCategoria,
  spesePerFornitore,
  type Periodo,
} from "./report";
import type { Fattura } from "./types";

function fattura(overrides: Partial<Fattura> = {}): Fattura {
  return {
    id: "f1",
    clienteId: "c1",
    tipoDocumento: "TD01",
    fatturaRiferimentoId: null,
    anno: 2026,
    progressivo: 1,
    dataEmissione: "2026-03-10",
    dataIncasso: null,
    stato: "emessa",
    bolloApplicato: false,
    bolloRiaddebitato: false,
    condizioniPagamento: "TP02",
    modalitaPagamento: "MP05",
    giorniScadenzaPagamento: 30,
    causaleAggiuntiva: null,
    note: null,
    xmlProgressivo: null,
    ricorrenteId: null,
    righe: [
      { id: "r1", numeroLinea: 1, descrizione: "Prestazione", quantita: 1, unitaMisura: null, prezzoUnitario: 1000 },
    ],
    ...overrides,
  };
}

const ANNO: Periodo = { da: "2026-01-01", a: "2026-12-31", etichetta: "Anno 2026" };

describe("periodiPredefiniti", () => {
  it("il trimestre di agosto va da luglio a settembre", () => {
    const trimestre = periodiPredefiniti("2026-08-30").find((p) => p.etichetta === "Trimestre");
    expect(trimestre).toMatchObject({ da: "2026-07-01", a: "2026-09-30" });
  });

  it("il mese corrente finisce l'ultimo giorno, anche a febbraio", () => {
    const mese = periodiPredefiniti("2026-02-10").find((p) => p.etichetta === "Mese corrente");
    expect(mese).toMatchObject({ da: "2026-02-01", a: "2026-02-28" });
  });
});

describe("riepilogoOperativo", () => {
  it("separa quello che hai fatturato da quello che hai preso", () => {
    const r = riepilogoOperativo(
      [
        fattura({ id: "a", dataEmissione: "2026-02-01", dataIncasso: "2026-03-01", stato: "incassata" }),
        fattura({ id: "b", dataEmissione: "2026-04-01" }),
      ],
      ANNO
    );
    expect(r.emesso).toBe(2000);
    expect(r.incassato).toBe(1000);
    expect(r.daIncassare).toBe(1000);
  });

  it("l'incassato segue la data di incasso, non quella di emissione", () => {
    // Fattura di dicembre 2025 pagata a gennaio 2026: è reddito del 2026.
    const fatture = [
      fattura({ dataEmissione: "2025-12-20", dataIncasso: "2026-01-15", stato: "incassata" }),
    ];
    expect(riepilogoOperativo(fatture, ANNO).incassato).toBe(1000);
    expect(riepilogoOperativo(fatture, ANNO).emesso).toBe(0);
  });

  it("il non incassato comprende gli arretrati più vecchi del periodo", () => {
    // È il credito che si dimentica: emesso l'anno prima, mai pagato.
    const r = riepilogoOperativo([fattura({ dataEmissione: "2025-11-01" })], ANNO);
    expect(r.daIncassare).toBe(1000);
    expect(r.emesso).toBe(0);
  });

  it("una nota di credito storna il fatturato", () => {
    const r = riepilogoOperativo(
      [
        fattura({ id: "a" }),
        fattura({
          id: "b",
          tipoDocumento: "TD04",
          righe: [
            { id: "r", numeroLinea: 1, descrizione: "Storno", quantita: 1, unitaMisura: null, prezzoUnitario: 300 },
          ],
        }),
      ],
      ANNO
    );
    expect(r.emesso).toBe(700);
  });

  it("le annullate non sono mai esistite", () => {
    const r = riepilogoOperativo([fattura({ stato: "annullata" })], ANNO);
    expect(r.emesso).toBe(0);
    expect(r.numeroFatture).toBe(0);
  });

  it("la media ignora le note di credito: nessuno emette una fattura media negativa", () => {
    const r = riepilogoOperativo(
      [
        fattura({ id: "a", righe: [{ id: "r", numeroLinea: 1, descrizione: "x", quantita: 1, unitaMisura: null, prezzoUnitario: 1000 }] }),
        fattura({ id: "b", righe: [{ id: "r", numeroLinea: 1, descrizione: "x", quantita: 1, unitaMisura: null, prezzoUnitario: 3000 }] }),
        fattura({
          id: "c",
          tipoDocumento: "TD04",
          righe: [{ id: "r", numeroLinea: 1, descrizione: "x", quantita: 1, unitaMisura: null, prezzoUnitario: 500 }],
        }),
      ],
      ANNO
    );
    expect(r.numeroFatture).toBe(2);
    expect(r.fatturaMedia).toBe(2000);
    expect(r.numeroNoteCredito).toBe(1);
  });

  it("senza fatture la media è zero, non una divisione per zero", () => {
    expect(riepilogoOperativo([], ANNO).fatturaMedia).toBe(0);
  });
});

describe("classifica", () => {
  it("somma per chiave, ordina per importo e calcola la quota", () => {
    const c = classifica([
      { chiave: "a", etichetta: "Alfa", importo: 300 },
      { chiave: "b", etichetta: "Beta", importo: 700 },
      { chiave: "a", etichetta: "Alfa", importo: 200 },
    ]);
    expect(c.map((v) => v.etichetta)).toEqual(["Beta", "Alfa"]);
    expect(c[0]).toMatchObject({ totale: 700, quota: 58, conteggio: 1 });
    expect(c[1]).toMatchObject({ totale: 500, quota: 42, conteggio: 2 });
  });

  it("su un elenco vuoto non divide per zero", () => {
    expect(classifica([])).toEqual([]);
  });
});

describe("fatturatoPerCliente", () => {
  it("mostra la concentrazione: un cliente che vale più della metà si vede subito", () => {
    const nomi = new Map([
      ["c1", "Studio Rossi"],
      ["c2", "Bianchi SRL"],
    ]);
    const voci = fatturatoPerCliente(
      [
        fattura({ id: "a", clienteId: "c1" }),
        fattura({ id: "b", clienteId: "c1" }),
        fattura({ id: "c", clienteId: "c2" }),
      ],
      ANNO,
      nomi
    );
    expect(voci[0]).toMatchObject({ etichetta: "Studio Rossi", quota: 67 });
  });

  it("un cliente cancellato non fa sparire il suo fatturato", () => {
    const voci = fatturatoPerCliente([fattura()], ANNO, new Map());
    expect(voci[0].etichetta).toBe("Cliente rimosso");
  });
});

describe("aggregazioni delle spese", () => {
  const spese = [
    { data: "2026-02-01", descrizione: "Hosting", categoria: "Servizi", importo: 120, fornitoreId: "f1" },
    { data: "2026-03-01", descrizione: "Dominio", categoria: "Servizi", importo: 30, fornitoreId: "f1" },
    { data: "2026-04-01", descrizione: "Treno", categoria: null, importo: 50, fornitoreId: null },
    { data: "2025-04-01", descrizione: "Vecchia", categoria: "Servizi", importo: 999, fornitoreId: "f1" },
  ];

  it("raggruppa per categoria e chiama le senza-categoria col loro nome", () => {
    const c = spesePerCategoria(spese, ANNO);
    expect(c[0]).toMatchObject({ etichetta: "Servizi", totale: 150 });
    expect(c[1]).toMatchObject({ etichetta: "Senza categoria", totale: 50 });
  });

  it("per fornitore conta solo ciò che ha un fornitore collegato", () => {
    const f = spesePerFornitore(spese, ANNO, new Map([["f1", "Aruba"]]));
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ etichetta: "Aruba", totale: 150, conteggio: 2 });
  });
});

describe("CSV", () => {
  it("separa con punto e virgola e usa la virgola decimale, come si aspetta Excel in italiano", () => {
    expect(rigaCsv(["Cliente", 1234.5])).toBe("Cliente;1234,50");
  });

  it("virgoletta i campi che contengono il separatore", () => {
    expect(rigaCsv(["Rossi; Bianchi e soci"])).toBe('"Rossi; Bianchi e soci"');
  });

  it("raddoppia le virgolette interne invece di romperle", () => {
    expect(rigaCsv(['Consulenza "urgente"'])).toBe('"Consulenza ""urgente"""');
  });

  it("apre con il BOM, senza il quale Excel su Windows sbaglia gli accenti", () => {
    expect(componiCsv(["a"], [["società"]]).startsWith("﻿")).toBe(true);
  });

  it("chiude le righe con CRLF", () => {
    expect(componiCsv(["a"], [["b"]])).toBe("﻿a\r\nb\r\n");
  });
});
