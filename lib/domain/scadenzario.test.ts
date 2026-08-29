import { describe, it, expect } from "vitest";
import { generaScadenzeAnnuali, generaScadenzeBollo } from "./scadenzario";
import type { RiepilogoAnno, Incasso } from "./types";

function riepilogo(overrides: Partial<RiepilogoAnno>): RiepilogoAnno {
  return {
    anno: 2026,
    fatturatoIncassato: 10000,
    imponibile: 7800,
    aliquotaSostitutivaApplicata: 0.15,
    impostaSostitutiva: 1170,
    contributiInps: 2033.46,
    totaleDovuto: 3203.46,
    nettoStimato: 6796.54,
    primoAnno: true,
    ...overrides,
  };
}

describe("generaScadenzeAnnuali", () => {
  it("non genera nulla per il primo anno se non ci sono riepiloghi precedenti", () => {
    expect(generaScadenzeAnnuali([])).toEqual([]);
  });

  it("genera saldo 2026 e acconti 2027 al 30/6 e 30/11 del 2027, sopra la soglia rata unica", () => {
    const scadenze = generaScadenzeAnnuali([riepilogo({})]);

    const saldoImposta = scadenze.find((s) => s.chiave === "2026-saldo-imposta");
    expect(saldoImposta?.importo).toBe(1170);
    expect(saldoImposta?.dataScadenza).toBe("2027-06-30");
    expect(saldoImposta?.codiceTributo).toBe("1792");

    const saldoInps = scadenze.find((s) => s.chiave === "2026-saldo-inps");
    expect(saldoInps?.importo).toBe(2033.46);
    expect(saldoInps?.codiceTributo).toBe("P10");

    // 1170 > 257,52 -> due rate 40%/60% (art. 17 c. 3 DPR 435/2001)
    const acconto1 = scadenze.find((s) => s.chiave === "2027-acconto1-imposta");
    const acconto2 = scadenze.find((s) => s.chiave === "2027-acconto2-imposta");
    expect(acconto1?.importo).toBe(468);
    expect(acconto1?.dataScadenza).toBe("2027-06-30");
    expect(acconto2?.importo).toBe(702);
    expect(acconto2?.dataScadenza).toBe("2027-11-30");

    // acconto INPS: 80% del saldo dell'anno precedente, due rate UGUALI del 40%
    const accontoInps1 = scadenze.find((s) => s.chiave === "2027-acconto1-inps");
    const accontoInps2 = scadenze.find((s) => s.chiave === "2027-acconto2-inps");
    expect(accontoInps1?.importo).toBe(813.38);
    expect(accontoInps1?.dataScadenza).toBe("2027-06-30");
    expect(accontoInps2?.importo).toBe(813.38);
    expect(accontoInps2?.dataScadenza).toBe("2027-11-30");
  });

  it("usa la rata unica se l'importo dell'imposta è sotto la soglia di 257,52 €", () => {
    const scadenze = generaScadenzeAnnuali([riepilogo({ impostaSostitutiva: 200, contributiInps: 100 })]);
    const accontoUnico = scadenze.find((s) => s.chiave === "2027-acconto-unico-imposta");
    expect(accontoUnico?.importo).toBe(200);
    expect(scadenze.find((s) => s.chiave === "2027-acconto2-imposta")).toBeUndefined();

    // l'acconto INPS non conosce la soglia di rata unica: resta in due rate da 40
    const accontoInps1 = scadenze.find((s) => s.chiave === "2027-acconto1-inps");
    const accontoInps2 = scadenze.find((s) => s.chiave === "2027-acconto2-inps");
    expect(accontoInps1?.importo).toBe(40);
    expect(accontoInps2?.importo).toBe(40);
  });

  it("non genera acconto imposta se l'importo è sotto la soglia di esenzione (51,65 €)", () => {
    const scadenze = generaScadenzeAnnuali([riepilogo({ impostaSostitutiva: 30, contributiInps: 20 })]);
    expect(scadenze.some((s) => s.tipo === "acconto1_imposta")).toBe(false);
    // il saldo resta comunque dovuto
    expect(scadenze.some((s) => s.chiave === "2026-saldo-imposta")).toBe(true);
  });

  it("genera comunque l'acconto INPS anche per importi minimi: non esiste una soglia di esenzione", () => {
    // A differenza dell'imposta sostitutiva, l'acconto INPS Gestione Separata
    // non ha né soglia di esenzione né soglia di rata unica: è sempre l'80%
    // del saldo precedente, in due rate uguali del 40%.
    const scadenze = generaScadenzeAnnuali([riepilogo({ impostaSostitutiva: 30, contributiInps: 20 })]);
    const accontoInps1 = scadenze.find((s) => s.chiave === "2027-acconto1-inps");
    const accontoInps2 = scadenze.find((s) => s.chiave === "2027-acconto2-inps");
    expect(accontoInps1?.importo).toBe(8);
    expect(accontoInps2?.importo).toBe(8);
  });

  it("concatena correttamente più anni consecutivi", () => {
    const scadenze = generaScadenzeAnnuali([riepilogo({ anno: 2026 }), riepilogo({ anno: 2027 })]);
    expect(scadenze.some((s) => s.chiave === "2026-saldo-imposta")).toBe(true);
    expect(scadenze.some((s) => s.chiave === "2027-saldo-imposta")).toBe(true);
    expect(scadenze.some((s) => s.chiave === "2028-acconto1-imposta")).toBe(true);
  });
});

describe("generaScadenzeBollo", () => {
  function fattura(overrides: Partial<Incasso>): Incasso {
    return {
      id: crypto.randomUUID(),
      dataEmissione: "2026-02-01",
      dataIncasso: "2026-02-10",
      importoNetto: 300,
      bolloApplicato: true,
      stato: "incassata",
      ...overrides,
    };
  }

  it("ignora le fatture senza bollo applicato", () => {
    const scadenze = generaScadenzeBollo([fattura({ bolloApplicato: false })], 2026);
    expect(scadenze).toEqual([]);
  });

  it("raggruppa il bollo per trimestre di emissione", () => {
    const incassi = [
      fattura({ dataEmissione: "2026-01-15" }), // Q1
      fattura({ dataEmissione: "2026-02-20" }), // Q1
      fattura({ dataEmissione: "2026-08-01" }), // Q3
    ];
    const scadenze = generaScadenzeBollo(incassi, 2026);

    const q1 = scadenze.find((s) => s.trimestre === 1);
    expect(q1?.importoDovuto).toBe(4); // 2 fatture * 2€
    expect(q1?.dataScadenza).toBe("2026-05-31");
    expect(q1?.codiceTributo).toBe("2521");

    const q3 = scadenze.find((s) => s.trimestre === 3);
    expect(q3?.importoDovuto).toBe(2);
    expect(q3?.dataScadenza).toBe("2026-11-30");
    expect(q3?.codiceTributo).toBe("2523");
  });
});
