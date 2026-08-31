import { describe, it, expect } from "vitest";
import {
  GIORNI_PREAVVISO,
  fasceDiRitardo,
  posizioniAperte,
  testoSollecito,
  totaleAperto,
  totaleScaduto,
} from "./pagamenti";
import type { Fattura, RigaFattura } from "./types";

function riga(prezzo: number): RigaFattura {
  return { id: "r1", numeroLinea: 1, descrizione: "Prestazione", quantita: 1, unitaMisura: null, prezzoUnitario: prezzo };
}

function fattura(overrides: Partial<Fattura> = {}): Fattura {
  return {
    id: "f1",
    clienteId: "c1",
    tipoDocumento: "TD01",
    fatturaRiferimentoId: null,
    anno: 2026,
    progressivo: 7,
    dataEmissione: "2026-06-01",
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
    righe: [riga(1000)],
    ...overrides,
  };
}

/** La fattura di riferimento scade il 1° luglio 2026 (1° giugno + 30 giorni). */
const SCADENZA = "2026-07-01";

describe("posizioniAperte", () => {
  it("calcola la scadenza dai giorni concordati", () => {
    const [posizione] = posizioniAperte([fattura()], new Date("2026-07-01T12:00:00Z"));
    expect(posizione.dataScadenza).toBe(SCADENZA);
    expect(posizione.giorniDiRitardo).toBe(0);
  });

  it("una fattura oltre la scadenza è scaduta, con i giorni di ritardo", () => {
    const [posizione] = posizioniAperte([fattura()], new Date("2026-07-16T12:00:00Z"));
    expect(posizione.stato).toBe("scaduta");
    expect(posizione.giorniDiRitardo).toBe(15);
  });

  it(`entro ${GIORNI_PREAVVISO} giorni dalla scadenza è "in scadenza", prima è "in corso"`, () => {
    const [inScadenza] = posizioniAperte([fattura()], new Date("2026-06-28T12:00:00Z"));
    expect(inScadenza.stato).toBe("in_scadenza");

    const [inCorso] = posizioniAperte([fattura()], new Date("2026-06-10T12:00:00Z"));
    expect(inCorso.stato).toBe("in_corso");
  });

  it("ignora le fatture già incassate e quelle annullate", () => {
    const fatture = [
      fattura({ id: "a", stato: "incassata" }),
      fattura({ id: "b", stato: "annullata" }),
      fattura({ id: "c", stato: "bozza" }),
    ];
    expect(posizioniAperte(fatture, new Date("2026-08-01T12:00:00Z"))).toHaveLength(0);
  });

  it("esclude le note di credito: sono storni, non crediti da sollecitare", () => {
    const fatture = [fattura({ id: "a" }), fattura({ id: "b", tipoDocumento: "TD04", fatturaRiferimentoId: "a" })];
    const posizioni = posizioniAperte(fatture, new Date("2026-08-01T12:00:00Z"));
    expect(posizioni).toHaveLength(1);
    expect(posizioni[0].fattura.id).toBe("a");
  });

  it("mette per prime le più in ritardo", () => {
    const fatture = [
      fattura({ id: "recente", dataEmissione: "2026-07-20" }),
      fattura({ id: "vecchia", dataEmissione: "2026-01-10" }),
    ];
    const posizioni = posizioniAperte(fatture, new Date("2026-08-01T12:00:00Z"));
    expect(posizioni.map((p) => p.fattura.id)).toEqual(["vecchia", "recente"]);
  });
});

describe("fasceDiRitardo", () => {
  const oggi = new Date("2026-08-01T12:00:00Z");

  it("separa il non scaduto dalle tre fasce di anzianità", () => {
    const fatture = [
      fattura({ id: "a", dataEmissione: "2026-07-25" }), // scade il 24/08: non scaduta
      fattura({ id: "b", dataEmissione: "2026-06-20" }), // scaduta il 20/07: 12 giorni
      fattura({ id: "c", dataEmissione: "2026-05-15" }), // scaduta il 14/06: 48 giorni
      fattura({ id: "d", dataEmissione: "2026-02-01" }), // scaduta il 03/03: oltre 60
    ];
    const fasce = fasceDiRitardo(posizioniAperte(fatture, oggi));
    expect(fasce.map((f) => f.chiave)).toEqual(["a_scadere", "entro_30", "entro_60", "oltre_60"]);
    expect(fasce.every((f) => f.quante === 1)).toBe(true);
  });

  it("non mostra le fasce vuote", () => {
    const fasce = fasceDiRitardo(posizioniAperte([fattura({ dataEmissione: "2026-07-25" })], oggi));
    expect(fasce).toHaveLength(1);
    expect(fasce[0].chiave).toBe("a_scadere");
  });

  it("somma gli importi dentro la fascia", () => {
    const fatture = [
      fattura({ id: "a", dataEmissione: "2026-06-20", righe: [riga(1000)] }),
      fattura({ id: "b", dataEmissione: "2026-06-25", righe: [riga(500)] }),
    ];
    const fasce = fasceDiRitardo(posizioniAperte(fatture, oggi));
    expect(fasce[0].totale).toBe(1500);
    expect(fasce[0].quante).toBe(2);
  });
});

describe("totali", () => {
  const oggi = new Date("2026-08-01T12:00:00Z");
  const fatture = [
    fattura({ id: "scaduta", dataEmissione: "2026-06-01", righe: [riga(1000)] }),
    fattura({ id: "futura", dataEmissione: "2026-07-25", righe: [riga(300)] }),
  ];

  it("il totale aperto comprende tutto ciò che non è ancora entrato", () => {
    expect(totaleAperto(posizioniAperte(fatture, oggi))).toBe(1300);
  });

  it("il totale scaduto comprende solo ciò che è oltre la scadenza", () => {
    expect(totaleScaduto(posizioniAperte(fatture, oggi))).toBe(1000);
  });
});

describe("testoSollecito", () => {
  it("prima della scadenza è un promemoria, non un sollecito", () => {
    const [posizione] = posizioniAperte([fattura()], new Date("2026-06-28T12:00:00Z"));
    const testo = testoSollecito(posizione, "Studio Rossi", "Giovanni");
    expect(testo).toContain("un promemoria");
    expect(testo).toContain("tra 3 giorni");
    expect(testo).not.toContain("scaduta");
  });

  it("il giorno della scadenza dice oggi, non «tra 0 giorni»", () => {
    const [posizione] = posizioniAperte([fattura()], new Date("2026-07-01T12:00:00Z"));
    expect(testoSollecito(posizione, "Studio Rossi", "Giovanni")).toContain("scade oggi");
  });

  it("entro il mese di ritardo resta leggero", () => {
    const [posizione] = posizioniAperte([fattura()], new Date("2026-07-15T12:00:00Z"));
    const testo = testoSollecito(posizione, "Studio Rossi", "Giovanni");
    expect(testo).toContain("risulta scaduta");
    expect(testo).toContain("Capita");
  });

  it("oltre i trenta giorni chiede una data, e nomina i giorni di ritardo", () => {
    const [posizione] = posizioniAperte([fattura()], new Date("2026-09-01T12:00:00Z"));
    const testo = testoSollecito(posizione, "Studio Rossi", "Giovanni");
    expect(testo).toContain("62 giorni");
    expect(testo).toContain("una data entro cui");
  });

  it("porta sempre numero, importo, scadenza e le due firme", () => {
    const [posizione] = posizioniAperte([fattura()], new Date("2026-09-01T12:00:00Z"));
    const testo = testoSollecito(posizione, "Studio Rossi", "Giovanni");
    expect(testo).toContain("7/2026");
    expect(testo).toContain("01/07/2026");
    // "1000,00 €" e non "1.000,00 €": in italiano il separatore delle migliaia
    // compare da cinque cifre in su (minimumGroupingDigits: 2 in CLDR it-IT).
    // È la convenzione tipografica corretta, non un difetto di formattazione.
    expect(testo).toContain("1000,00");
    expect(testo.startsWith("Gentile Studio Rossi,")).toBe(true);
    expect(testo.endsWith("Giovanni")).toBe(true);
  });

  it("non minaccia interessi di mora: citarli è una scelta commerciale, non un default", () => {
    const [posizione] = posizioniAperte([fattura()], new Date("2026-12-01T12:00:00Z"));
    const testo = testoSollecito(posizione, "Studio Rossi", "Giovanni").toLowerCase();
    expect(testo).not.toContain("mora");
    expect(testo).not.toContain("legale");
    expect(testo).not.toContain("diffida");
  });
});
