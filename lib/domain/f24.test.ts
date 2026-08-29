import { describe, it, expect } from "vitest";
import { generaModuliF24 } from "./f24";
import type { Scadenza, ScadenzaBollo } from "./types";

function scadenza(overrides: Partial<Scadenza>): Scadenza {
  return {
    chiave: "2026-saldo-imposta",
    tipo: "saldo_imposta",
    annoRiferimento: 2026,
    dataScadenza: "2027-06-30",
    importo: 1170,
    codiceTributo: "1792",
    descrizione: "Saldo imposta sostitutiva 2026",
    ...overrides,
  };
}

function bollo(overrides: Partial<ScadenzaBollo>): ScadenzaBollo {
  return {
    chiave: "2026-bollo-t1",
    trimestre: 1,
    anno: 2026,
    dataScadenza: "2026-05-31",
    importoDovuto: 4,
    codiceTributo: "2521",
    descrizione: "Bollo virtuale trimestre 1/2026",
    ...overrides,
  };
}

describe("generaModuliF24", () => {
  it("raggruppa più scadenze nella stessa data in un unico modulo, ordinate Erario prima di INPS", () => {
    const moduli = generaModuliF24(
      [
        scadenza({ chiave: "2026-saldo-inps", tipo: "saldo_inps", codiceTributo: "P10", importo: 2033.46, dataScadenza: "2027-06-30" }),
        scadenza({ chiave: "2026-saldo-imposta", tipo: "saldo_imposta", codiceTributo: "1792", importo: 1170, dataScadenza: "2027-06-30" }),
        scadenza({
          chiave: "2027-acconto1-imposta",
          tipo: "acconto1_imposta",
          codiceTributo: "1790",
          importo: 468,
          annoRiferimento: 2027,
          dataScadenza: "2027-06-30",
        }),
      ],
      []
    );

    expect(moduli).toHaveLength(1);
    const [modulo] = moduli;
    expect(modulo.dataScadenza).toBe("2027-06-30");
    expect(modulo.totale).toBe(3671.46);
    expect(modulo.righe.map((r) => r.sezione)).toEqual(["erario", "erario", "inps"]);
  });

  it("assegna la rateazione corretta: rata unica, 1a di 2, 2a di 2", () => {
    const moduli = generaModuliF24(
      [
        scadenza({ chiave: "2027-acconto-unico-imposta", tipo: "acconto1_imposta", codiceTributo: "1790", dataScadenza: "2027-06-30" }),
        scadenza({ chiave: "2027-acconto1-imposta", tipo: "acconto1_imposta", codiceTributo: "1790", dataScadenza: "2027-06-30" }),
        scadenza({ chiave: "2027-acconto2-imposta", tipo: "acconto2_imposta", codiceTributo: "1791", dataScadenza: "2027-11-30" }),
        scadenza({ chiave: "2027-acconto1-inps", tipo: "acconto1_inps", codiceTributo: "P10", dataScadenza: "2027-06-30" }),
        scadenza({ chiave: "2027-acconto2-inps", tipo: "acconto2_inps", codiceTributo: "P10", dataScadenza: "2027-11-30" }),
      ],
      []
    );

    const righe = moduli.flatMap((m) => m.righe);
    expect(righe.find((r) => r.chiaveScadenza === "2027-acconto-unico-imposta")?.rateazione).toBe("0101");
    expect(righe.find((r) => r.chiaveScadenza === "2027-acconto1-imposta")?.rateazione).toBe("0102");
    expect(righe.find((r) => r.chiaveScadenza === "2027-acconto2-imposta")?.rateazione).toBe("0202");
    expect(righe.find((r) => r.chiaveScadenza === "2027-acconto1-inps")?.rateazione).toBe("0102");
    expect(righe.find((r) => r.chiaveScadenza === "2027-acconto2-inps")?.rateazione).toBe("0202");
  });

  it("il bollo virtuale ha rateazione null e sezione erario", () => {
    const moduli = generaModuliF24([], [bollo({})]);
    const [modulo] = moduli;
    expect(modulo.righe[0].rateazione).toBeNull();
    expect(modulo.righe[0].sezione).toBe("erario");
    expect(modulo.righe[0].codiceTributo).toBe("2521");
  });

  it("ignora scadenze e bollo con importo zero o negativo", () => {
    const moduli = generaModuliF24([scadenza({ importo: 0 })], [bollo({ importoDovuto: 0 })]);
    expect(moduli).toEqual([]);
  });

  it("ordina i moduli per data di scadenza crescente", () => {
    const moduli = generaModuliF24(
      [scadenza({ dataScadenza: "2027-11-30" }), scadenza({ chiave: "altra", dataScadenza: "2027-06-30" })],
      []
    );
    expect(moduli.map((m) => m.dataScadenza)).toEqual(["2027-06-30", "2027-11-30"]);
  });
});
