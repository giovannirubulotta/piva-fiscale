import { describe, it, expect } from "vitest";
import { GRUPPI_NAV, VOCI_BARRA_INFERIORE, voceAttiva } from "./navigazione";

describe("voceAttiva", () => {
  it("evidenzia la voce della pagina corrente", () => {
    expect(voceAttiva("/fatture", "/fatture")).toBe(true);
  });

  it("resta evidenziata sulle pagine figlie", () => {
    expect(voceAttiva("/fatture", "/fatture/nuova")).toBe(true);
    expect(voceAttiva("/clienti", "/clienti/abc-123")).toBe(true);
  });

  it("non confonde due sezioni con lo stesso prefisso", () => {
    expect(voceAttiva("/fatture", "/fatturexyz")).toBe(false);
  });

  it("la dashboard è attiva solo sulla radice, non ovunque", () => {
    expect(voceAttiva("/", "/")).toBe(true);
    expect(voceAttiva("/", "/spese")).toBe(false);
  });
});

describe("mappa di navigazione", () => {
  it("non contiene voci duplicate tra i gruppi", () => {
    const href = GRUPPI_NAV.flatMap((g) => g.voci.map((v) => v.href));
    expect(new Set(href).size).toBe(href.length);
  });

  it("ogni voce della barra inferiore esiste anche nel menu completo", () => {
    const tutte = new Set(GRUPPI_NAV.flatMap((g) => g.voci.map((v) => v.href)));
    for (const voce of VOCI_BARRA_INFERIORE) {
      expect(tutte.has(voce.href), `${voce.href} manca dal menu completo`).toBe(true);
    }
  });

  it("la barra inferiore resta a quattro voci: oltre, i bersagli scendono sotto i 44px", () => {
    expect(VOCI_BARRA_INFERIORE.length).toBeLessThanOrEqual(4);
  });
});
