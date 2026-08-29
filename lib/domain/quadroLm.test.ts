import { describe, it, expect } from "vitest";
import { generaQuadroLm } from "./quadroLm";
import type { ProfiloFiscale, RiepilogoAnno } from "./types";

function riepilogo(overrides: Partial<RiepilogoAnno>): RiepilogoAnno {
  return {
    anno: 2026,
    fatturatoIncassato: 10000,
    imponibile: 7800,
    aliquotaSostitutivaApplicata: 0.15,
    impostaSostitutiva: 864.98,
    contributiInps: 2033.46,
    totaleDovuto: 2898.44,
    nettoStimato: 7101.56,
    primoAnno: false,
    ...overrides,
  };
}

function profilo(overrides: Partial<ProfiloFiscale & { codiceAteco: string }> = {}): ProfiloFiscale & { codiceAteco: string } {
  return {
    coefficienteRedditivita: 0.78,
    dataApertura: "2024-01-01",
    agevolazione5Percento: false,
    codiceAteco: "62.01.00",
    ...overrides,
  };
}

describe("generaQuadroLm", () => {
  it("calcola i righi principali dal riepilogo dell'anno", () => {
    const quadro = generaQuadroLm(riepilogo({}), profilo(), 936);

    const lm34 = quadro.righi.find((r) => r.codice === "LM34");
    expect(lm34?.valore).toBe(7800);

    const lm35 = quadro.righi.find((r) => r.codice === "LM35");
    expect(lm35?.valore).toBe(2033.46);
    expect(lm35?.daVerificare).toBe(true);

    const lm36 = quadro.righi.find((r) => r.codice === "LM36");
    expect(lm36?.valore).toBe(7800 - 2033.46);

    const lm39 = quadro.righi.find((r) => r.codice === "LM39");
    // (7800 - 2033,46) * 0.15 = 864,98 — coerente con calcolaRiepilogoAnno,
    // che applica la stessa deduzione (vedi lib/domain/calcolo.ts).
    expect(lm39?.valore).toBe(864.98);

    const lm45 = quadro.righi.find((r) => r.codice === "LM45");
    expect(lm45?.valore).toBe(936);
  });

  it("calcola il saldo a debito quando l'imposta supera gli acconti versati", () => {
    const quadro = generaQuadroLm(riepilogo({}), profilo(), 500);
    const lm46 = quadro.righi.find((r) => r.codice === "LM46");
    const lm47 = quadro.righi.find((r) => r.codice === "LM47");
    expect(lm46?.valore).toBe(364.98); // 864,98 - 500
    expect(lm47?.valore).toBe(0);
  });

  it("calcola il saldo a credito quando gli acconti versati superano l'imposta dovuta", () => {
    const quadro = generaQuadroLm(riepilogo({}), profilo(), 1500);
    const lm46 = quadro.righi.find((r) => r.codice === "LM46");
    const lm47 = quadro.righi.find((r) => r.codice === "LM47");
    expect(lm46?.valore).toBe(0);
    expect(lm47?.valore).toBe(635.02); // 1500 - 864,98
  });

  it("genera il rigo LM49 solo quando i contributi eccedono il reddito lordo", () => {
    const contributiEccedenti = riepilogo({ imponibile: 1000, contributiInps: 1500, impostaSostitutiva: 150 });
    const quadro = generaQuadroLm(contributiEccedenti, profilo(), 0);
    const lm49 = quadro.righi.find((r) => r.codice === "LM49");
    expect(lm49?.valore).toBe(500);

    const senzaEccedenza = generaQuadroLm(riepilogo({}), profilo(), 0);
    expect(senzaEccedenza.righi.some((r) => r.codice === "LM49")).toBe(false);
  });

  it("riporta le attestazioni dal profilo e dal riepilogo", () => {
    const quadro = generaQuadroLm(riepilogo({ aliquotaSostitutivaApplicata: 0.05 }), profilo({ codiceAteco: "73.11.02" }), 0);
    expect(quadro.attestazioni.codiceAteco).toBe("73.11.02");
    expect(quadro.attestazioni.aliquotaApplicata).toBe(0.05);
    expect(quadro.attestazioni.nuovaAttivitaAgevolata).toBe(true);
  });
});
