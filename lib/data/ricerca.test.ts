import { describe, it, expect } from "vitest";
import { LUNGHEZZA_MINIMA, ripuliscTermine } from "./ricerca";

describe("ripuliscTermine", () => {
  it("lascia intatto un termine normale", () => {
    expect(ripuliscTermine("Studio Rossi")).toBe("Studio Rossi");
  });

  it("neutralizza i jolly di like: chi cerca «50%» non deve ottenere mezzo archivio", () => {
    expect(ripuliscTermine("50%")).toBe("50");
    expect(ripuliscTermine("acconto_saldo")).toBe("acconto saldo");
  });

  it("toglie la virgola, che dentro or() separa le condizioni", () => {
    expect(ripuliscTermine("Rossi, Mario")).toBe("Rossi Mario");
  });

  it("toglie parentesi e barre rovesce, che chiudono o sfuggono la sintassi del filtro", () => {
    expect(ripuliscTermine("Rossi (SRL)")).toBe("Rossi SRL");
    expect(ripuliscTermine("a\\b")).toBe("a b");
  });

  it("normalizza gli spazi e toglie quelli ai bordi", () => {
    expect(ripuliscTermine("  Studio   Rossi  ")).toBe("Studio Rossi");
  });

  it("un termine fatto solo di caratteri pericolosi resta sotto la soglia e non interroga nulla", () => {
    expect(ripuliscTermine("%,_").length).toBeLessThan(LUNGHEZZA_MINIMA);
  });
});
