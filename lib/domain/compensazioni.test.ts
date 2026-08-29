import { describe, it, expect } from "vitest";
import { riepilogoCompensazioni, saldoDisponibile, SOGLIA_VISTO_CONFORMITA } from "./compensazioni";
import type { CreditoDisponibile } from "./types";

function credito(overrides: Partial<CreditoDisponibile>): CreditoDisponibile {
  return {
    id: crypto.randomUUID(),
    tipologia: "imposta_sostitutiva",
    annoMaturazione: 2026,
    importo: 1000,
    utilizzato: false,
    annoUtilizzo: null,
    dataUtilizzo: null,
    note: null,
    ...overrides,
  };
}

describe("SOGLIA_VISTO_CONFORMITA", () => {
  it("è 5.000 €", () => {
    expect(SOGLIA_VISTO_CONFORMITA).toBe(5000);
  });
});

describe("riepilogoCompensazioni", () => {
  it("ignora i crediti non ancora utilizzati", () => {
    const crediti = [credito({ utilizzato: false, importo: 6000 })];
    expect(riepilogoCompensazioni(crediti)).toEqual([]);
  });

  it("somma per tipologia e anno di utilizzo, senza richiedere il visto sotto soglia", () => {
    const crediti = [
      credito({ tipologia: "imposta_sostitutiva", importo: 2000, utilizzato: true, annoUtilizzo: 2027 }),
      credito({ tipologia: "imposta_sostitutiva", importo: 1500, utilizzato: true, annoUtilizzo: 2027 }),
    ];
    const riepilogo = riepilogoCompensazioni(crediti);
    expect(riepilogo).toHaveLength(1);
    expect(riepilogo[0]).toMatchObject({ tipologia: "imposta_sostitutiva", anno: 2027, totaleUtilizzato: 3500 });
    expect(riepilogo[0].richiedeVistoConformita).toBe(false);
  });

  it("segnala il visto di conformità richiesto sopra 5.000 € per la stessa tipologia e anno", () => {
    const crediti = [
      credito({ tipologia: "irpef", importo: 3000, utilizzato: true, annoUtilizzo: 2027 }),
      credito({ tipologia: "irpef", importo: 2500, utilizzato: true, annoUtilizzo: 2027 }),
    ];
    const riepilogo = riepilogoCompensazioni(crediti);
    expect(riepilogo[0].totaleUtilizzato).toBe(5500);
    expect(riepilogo[0].richiedeVistoConformita).toBe(true);
  });

  it("non richiede il visto esattamente alla soglia (5.000 € non è 'sopra')", () => {
    const crediti = [credito({ tipologia: "irap", importo: 5000, utilizzato: true, annoUtilizzo: 2027 })];
    expect(riepilogoCompensazioni(crediti)[0].richiedeVistoConformita).toBe(false);
  });

  it("non applica la soglia ai contributi INPS: tipologia tracciata ma regola non estesa senza fonte", () => {
    const crediti = [credito({ tipologia: "inps", importo: 9000, utilizzato: true, annoUtilizzo: 2027 })];
    expect(riepilogoCompensazioni(crediti)[0].richiedeVistoConformita).toBe(false);
  });

  it("tiene separati anni diversi anche per la stessa tipologia", () => {
    const crediti = [
      credito({ tipologia: "imposta_sostitutiva", importo: 3000, utilizzato: true, annoUtilizzo: 2026 }),
      credito({ tipologia: "imposta_sostitutiva", importo: 3000, utilizzato: true, annoUtilizzo: 2027 }),
    ];
    const riepilogo = riepilogoCompensazioni(crediti);
    expect(riepilogo).toHaveLength(2);
    expect(riepilogo.every((r) => !r.richiedeVistoConformita)).toBe(true);
  });
});

describe("saldoDisponibile", () => {
  it("somma solo i crediti non ancora utilizzati", () => {
    const crediti = [
      credito({ importo: 1000, utilizzato: false }),
      credito({ importo: 500, utilizzato: true, annoUtilizzo: 2027 }),
      credito({ importo: 250, utilizzato: false }),
    ];
    expect(saldoDisponibile(crediti)).toBe(1250);
  });

  it("restituisce 0 senza crediti", () => {
    expect(saldoDisponibile([])).toBe(0);
  });
});
