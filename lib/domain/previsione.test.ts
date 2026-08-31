import { describe, it, expect } from "vitest";
import { GIORNI_MINIMI_PER_PROIEZIONE, calcolaPrevisione, daAccantonareAncora, emessoDaIncassare } from "./previsione";
import { riepilogoDaFatturato } from "./calcolo";
import type { AliquoteAnno, Fattura, Incasso, ProfiloFiscale, RigaFattura } from "./types";

const ALIQUOTE: AliquoteAnno = {
  anno: 2026,
  aliquotaSostitutivaStandard: 0.15,
  aliquotaSostitutivaAgevolata: 0.05,
  aliquotaInps: 0.2607,
  massimaleInps: 122_295,
  minimaleInps: 18_808,
};

const PROFILO: ProfiloFiscale = {
  coefficienteRedditivita: 0.78,
  dataApertura: "2025-07-01",
  agevolazione5Percento: false,
};

function incasso(overrides: Partial<Incasso> = {}): Incasso {
  return {
    id: "i1",
    dataEmissione: "2026-01-10",
    dataIncasso: "2026-01-20",
    importoNetto: 1000,
    bolloApplicato: false,
    stato: "incassata",
    ...overrides,
  };
}

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
    progressivo: 1,
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

/** 1° luglio 2026: 182 giorni trascorsi, 183 da proiettare. */
const META_ANNO = new Date("2026-07-01T12:00:00Z");

describe("emessoDaIncassare", () => {
  it("somma solo le fatture emesse e non ancora incassate", () => {
    const fatture = [
      fattura({ id: "a", stato: "emessa", righe: [riga(1000)] }),
      fattura({ id: "b", stato: "incassata", righe: [riga(5000)] }),
      fattura({ id: "c", stato: "annullata", righe: [riga(9000)] }),
    ];
    expect(emessoDaIncassare(fatture)).toBe(1000);
  });

  it("sottrae le note di credito ancora aperte", () => {
    const fatture = [
      fattura({ id: "a", righe: [riga(1000)] }),
      fattura({ id: "b", tipoDocumento: "TD04", fatturaRiferimentoId: "a", righe: [riga(300)] }),
    ];
    expect(emessoDaIncassare(fatture)).toBe(700);
  });

  it("non scende sotto zero: una nota di credito più grande dell'emesso non è un credito verso di noi", () => {
    const fatture = [
      fattura({ id: "a", righe: [riga(100)] }),
      fattura({ id: "b", tipoDocumento: "TD04", fatturaRiferimentoId: "a", righe: [riga(400)] }),
    ];
    expect(emessoDaIncassare(fatture)).toBe(0);
  });
});

describe("calcolaPrevisione", () => {
  it("lo scenario prudente somma incassato ed emesso, senza presumere nuovo lavoro", () => {
    const previsione = calcolaPrevisione(
      2026,
      [incasso({ importoNetto: 10_000 })],
      [fattura({ righe: [riga(2_000)] })],
      PROFILO,
      ALIQUOTE,
      META_ANNO
    );
    const prudente = previsione.scenari.find((s) => s.chiave === "prudente")!;
    expect(prudente.fatturatoPrevisto).toBe(12_000);
  });

  it("lo scenario a ritmo proietta l'incassato sull'anno intero", () => {
    // 10.000 € in 182 giorni → circa 20.055 € su 365.
    const previsione = calcolaPrevisione(2026, [incasso({ importoNetto: 10_000 })], [], PROFILO, ALIQUOTE, META_ANNO);
    expect(previsione.giorniTrascorsi).toBe(182);
    expect(previsione.giorniDaProiettare).toBe(183);
    const ritmo = previsione.scenari.find((s) => s.chiave === "ritmo")!;
    expect(ritmo.fatturatoPrevisto).toBeCloseTo(20_054.95, 1);
  });

  it("il ritmo non può mai scendere sotto il prudente", () => {
    // Un solo incasso a gennaio e una fattura enorme ancora aperta: proiettare
    // il ritmo darebbe meno di quanto è già certo.
    const previsione = calcolaPrevisione(
      2026,
      [incasso({ importoNetto: 500 })],
      [fattura({ righe: [riga(30_000)] })],
      PROFILO,
      ALIQUOTE,
      META_ANNO
    );
    const prudente = previsione.scenari.find((s) => s.chiave === "prudente")!;
    const ritmo = previsione.scenari.find((s) => s.chiave === "ritmo")!;
    expect(ritmo.fatturatoPrevisto).toBe(prudente.fatturatoPrevisto);
  });

  it("nei primi giorni non proietta: un incasso isolato non è un ritmo", () => {
    const inizioAnno = new Date("2026-01-20T12:00:00Z");
    const previsione = calcolaPrevisione(2026, [incasso({ importoNetto: 5_000 })], [], PROFILO, ALIQUOTE, inizioAnno);
    expect(previsione.giorniTrascorsi).toBeLessThan(GIORNI_MINIMI_PER_PROIEZIONE);
    expect(previsione.troppoPrestoPerProiettare).toBe(true);
    const ritmo = previsione.scenari.find((s) => s.chiave === "ritmo")!;
    // Senza il freno sarebbero oltre 91.000 €, cioè un falso allarme di uscita
    // dal regime forfettario generato da un solo bonifico di gennaio.
    expect(ritmo.fatturatoPrevisto).toBe(5_000);
  });

  it("nell'anno di apertura proietta dalla data di apertura, non dal 1° gennaio", () => {
    const profiloApertoAMarzo: ProfiloFiscale = { ...PROFILO, dataApertura: "2026-03-01" };
    const previsione = calcolaPrevisione(
      2026,
      [incasso({ importoNetto: 10_000 })],
      [],
      profiloApertoAMarzo,
      ALIQUOTE,
      META_ANNO
    );
    // Dal 1° marzo al 1° luglio: 123 giorni, non 182.
    expect(previsione.giorniTrascorsi).toBe(123);
    const ritmo = previsione.scenari.find((s) => s.chiave === "ritmo")!;
    // Proiettando dal 1° gennaio si otterrebbero ~20.000 €, sottostimando di un
    // terzo il ritmo reale di chi ha aperto a marzo.
    expect(ritmo.fatturatoPrevisto).toBeGreaterThan(24_000);
  });

  it("applica al fatturato previsto le stesse regole del riepilogo reale", () => {
    const previsione = calcolaPrevisione(2026, [incasso({ importoNetto: 10_000 })], [], PROFILO, ALIQUOTE, META_ANNO);
    for (const scenario of previsione.scenari) {
      expect(scenario.riepilogo).toEqual(
        riepilogoDaFatturato(2026, scenario.fatturatoPrevisto, PROFILO, ALIQUOTE)
      );
    }
  });

  it("segnala il superamento della soglia sullo scenario che lo produce", () => {
    const previsione = calcolaPrevisione(
      2026,
      [incasso({ importoNetto: 50_000 })],
      [fattura({ righe: [riga(40_000)] })],
      PROFILO,
      ALIQUOTE,
      META_ANNO
    );
    const prudente = previsione.scenari.find((s) => s.chiave === "prudente")!;
    expect(prudente.fatturatoPrevisto).toBe(90_000);
    expect(prudente.soglie.esito).toBe("sopra_permanenza");
  });

  it("ignora gli incassi di altri anni", () => {
    const previsione = calcolaPrevisione(
      2026,
      [incasso({ importoNetto: 10_000 }), incasso({ id: "vecchio", dataIncasso: "2025-05-01", importoNetto: 99_000 })],
      [],
      PROFILO,
      ALIQUOTE,
      META_ANNO
    );
    expect(previsione.incassatoAdOggi).toBe(10_000);
  });
});

describe("daAccantonareAncora", () => {
  it("è la differenza tra il dovuto prudente e quanto già messo da parte", () => {
    const previsione = calcolaPrevisione(2026, [incasso({ importoNetto: 10_000 })], [], PROFILO, ALIQUOTE, META_ANNO);
    const dovuto = previsione.scenari.find((s) => s.chiave === "prudente")!.riepilogo.totaleDovuto;
    expect(daAccantonareAncora(previsione, 0)).toBe(dovuto);
    expect(daAccantonareAncora(previsione, dovuto)).toBe(0);
  });

  it("diventa negativo se si è accantonato più del dovuto", () => {
    const previsione = calcolaPrevisione(2026, [incasso({ importoNetto: 10_000 })], [], PROFILO, ALIQUOTE, META_ANNO);
    expect(daAccantonareAncora(previsione, 100_000)).toBeLessThan(0);
  });
});
