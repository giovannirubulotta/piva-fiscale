import { describe, it, expect } from "vitest";
import { valutaRequisitiForfettario, valutaSoglieForfettario } from "./requisitiForfettario";
import type { RequisitiForfettario } from "./types";

function requisiti(overrides: Partial<RequisitiForfettario>): RequisitiForfettario {
  return {
    anno: 2026,
    redditoLavoroDipendenteOltreSoglia: null,
    partecipazioniSocietaRiconducibili: null,
    committentePrevalenteExDatore: null,
    residenzaFuoriUeSee: null,
    ...overrides,
  };
}

describe("valutaRequisitiForfettario", () => {
  it("nessuna dichiarazione salvata (null) equivale a tutti i campi da verificare", () => {
    const esito = valutaRequisitiForfettario(null);
    expect(esito.esitoGlobale).toBe("da_verificare");
    expect(esito.dettagli).toHaveLength(4);
    expect(esito.dettagli.every((d) => d.esito === "da_verificare")).toBe(true);
  });

  it("tutti i campi confermati false -> esito ok", () => {
    const esito = valutaRequisitiForfettario(
      requisiti({
        redditoLavoroDipendenteOltreSoglia: false,
        partecipazioniSocietaRiconducibili: false,
        committentePrevalenteExDatore: false,
        residenzaFuoriUeSee: false,
      })
    );
    expect(esito.esitoGlobale).toBe("ok");
  });

  it("un solo campo true -> esito escluso, anche se gli altri sono confermati false", () => {
    const esito = valutaRequisitiForfettario(
      requisiti({
        redditoLavoroDipendenteOltreSoglia: false,
        partecipazioniSocietaRiconducibili: true,
        committentePrevalenteExDatore: false,
        residenzaFuoriUeSee: false,
      })
    );
    expect(esito.esitoGlobale).toBe("escluso");
    expect(esito.dettagli.find((d) => d.chiave === "partecipazioni_societa")?.esito).toBe("escluso");
  });

  it("escluso ha priorità su da_verificare quando coesistono", () => {
    const esito = valutaRequisitiForfettario(
      requisiti({
        redditoLavoroDipendenteOltreSoglia: true,
        partecipazioniSocietaRiconducibili: null,
      })
    );
    expect(esito.esitoGlobale).toBe("escluso");
  });

  it("un campo ancora null tra altri confermati false -> da_verificare, non ok", () => {
    const esito = valutaRequisitiForfettario(
      requisiti({
        redditoLavoroDipendenteOltreSoglia: false,
        partecipazioniSocietaRiconducibili: false,
        committentePrevalenteExDatore: false,
        residenzaFuoriUeSee: null,
      })
    );
    expect(esito.esitoGlobale).toBe("da_verificare");
  });
});

describe("valutaSoglieForfettario", () => {
  it("sotto 85.000 € -> sotto_permanenza", () => {
    expect(valutaSoglieForfettario(50000).esito).toBe("sotto_permanenza");
    expect(valutaSoglieForfettario(85000).esito).toBe("sotto_permanenza");
  });

  it("tra 85.000 € e 100.000 € -> sopra_permanenza", () => {
    expect(valutaSoglieForfettario(90000).esito).toBe("sopra_permanenza");
    expect(valutaSoglieForfettario(100000).esito).toBe("sopra_permanenza");
  });

  it("sopra 100.000 € -> sopra_uscita_immediata", () => {
    expect(valutaSoglieForfettario(100001).esito).toBe("sopra_uscita_immediata");
    expect(valutaSoglieForfettario(150000).esito).toBe("sopra_uscita_immediata");
  });

  it("riporta il fatturato ricevuto invariato nel risultato", () => {
    expect(valutaSoglieForfettario(42000.5).fatturatoIncassato).toBe(42000.5);
  });
});
