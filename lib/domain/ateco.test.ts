import { describe, it, expect } from "vitest";
import { normalizzaCodiceAteco, trovaCoefficienteAteco } from "./ateco";
import type { CoefficienteAteco } from "./types";

// Sottoinsieme realistico della tabella ufficiale (Allegato 4 L. 190/2014):
// copre i casi che esercitano la logica di matching (prefissi di lunghezza
// diversa che si sovrappongono, e la voce di default).
const tabella: CoefficienteAteco[] = [
  { gruppo: 2, settore: "Commercio all'ingrosso e al dettaglio", prefissoAteco: "479", coefficiente: 0.4 },
  { gruppo: 3, settore: "Commercio ambulante di prodotti alimentari e bevande", prefissoAteco: "4781", coefficiente: 0.4 },
  { gruppo: 4, settore: "Commercio ambulante di altri prodotti", prefissoAteco: "4782", coefficiente: 0.54 },
  { gruppo: 6, settore: "Intermediari del commercio", prefissoAteco: "461", coefficiente: 0.62 },
  { gruppo: 8, settore: "Attività professionali, scientifiche, tecniche", prefissoAteco: "73", coefficiente: 0.78 },
  { gruppo: 9, settore: "Altre attività economiche", prefissoAteco: "", coefficiente: 0.67 },
];

describe("normalizzaCodiceAteco", () => {
  it("rimuove i punti separatori", () => {
    expect(normalizzaCodiceAteco("73.11.02")).toBe("731102");
  });

  it("rimuove spazi e altri caratteri non numerici", () => {
    expect(normalizzaCodiceAteco(" 73.11.02 ")).toBe("731102");
  });

  it("restituisce stringa vuota per un input privo di cifre", () => {
    expect(normalizzaCodiceAteco("abc")).toBe("");
  });
});

describe("trovaCoefficienteAteco", () => {
  it("trova il gruppo dal prefisso più specifico anche con codice completo a 6 cifre", () => {
    const risultato = trovaCoefficienteAteco("73.11.02", tabella);
    expect(risultato).toEqual({ coefficiente: 0.78, gruppo: 8, settore: "Attività professionali, scientifiche, tecniche", predefinito: false });
  });

  it("preferisce il prefisso più lungo quando più prefissi corrispondono", () => {
    // "47.81.00" inizia sia per "479"? no — verifica che "4781" (gruppo 3)
    // vinca su un ipotetico prefisso più corto "47" se presente in tabella.
    const risultato = trovaCoefficienteAteco("47.81.00", tabella);
    expect(risultato).toEqual({
      coefficiente: 0.4,
      gruppo: 3,
      settore: "Commercio ambulante di prodotti alimentari e bevande",
      predefinito: false,
    });
  });

  it("non confonde prefissi simili (46.1 vs 46.19 restano nello stesso gruppo, ma 46.2 no)", () => {
    expect(trovaCoefficienteAteco("46.19.00", tabella)?.gruppo).toBe(6);
    expect(trovaCoefficienteAteco("46.20.00", tabella)?.predefinito).toBe(true);
  });

  it("ricade sul gruppo 9 di default quando nessun prefisso specifico corrisponde", () => {
    const risultato = trovaCoefficienteAteco("62.09.09", tabella);
    expect(risultato).toEqual({ coefficiente: 0.67, gruppo: 9, settore: "Altre attività economiche", predefinito: true });
  });

  it("restituisce null per un codice ATECO vuoto o non numerico", () => {
    expect(trovaCoefficienteAteco("", tabella)).toBeNull();
    expect(trovaCoefficienteAteco("n/d", tabella)).toBeNull();
  });

  it("restituisce null se la tabella è vuota (nessuna voce di default disponibile)", () => {
    expect(trovaCoefficienteAteco("73.11.02", [])).toBeNull();
  });

  it("è insensibile all'ordine delle righe nella tabella", () => {
    const mescolata = [...tabella].reverse();
    expect(trovaCoefficienteAteco("73.11.02", mescolata)?.gruppo).toBe(8);
  });
});
