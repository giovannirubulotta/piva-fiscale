import { describe, it, expect } from "vitest";
import {
  anteprima,
  etichetteUsate,
  filtra,
  intestazione,
  normalizzaEtichette,
  ordina,
  type Nota,
} from "./nota";

function nota(overrides: Partial<Nota> = {}): Nota {
  return {
    id: "n1",
    titolo: null,
    testo: "Chiamare Rossi\nVuole il preventivo entro venerdì",
    clienteId: null,
    trattativaId: null,
    fissata: false,
    etichette: [],
    creataIl: "2026-09-01T10:00:00Z",
    aggiornataIl: "2026-09-01T10:00:00Z",
    ...overrides,
  };
}

describe("intestazione", () => {
  it("usa il titolo quando c'è", () => {
    expect(intestazione(nota({ titolo: "Idee per il sito" }))).toBe("Idee per il sito");
  });

  it("altrimenti prende la prima riga, che è quasi sempre di cosa parla la nota", () => {
    expect(intestazione(nota())).toBe("Chiamare Rossi");
  });

  it("salta le righe vuote iniziali", () => {
    expect(intestazione(nota({ testo: "\n\n  \nPrima riga vera" }))).toBe("Prima riga vera");
  });

  it("accorcia una prima riga interminabile", () => {
    const lunga = "a".repeat(200);
    expect(intestazione(nota({ testo: lunga })).length).toBe(80);
  });

  it("un titolo di soli spazi non conta come titolo", () => {
    expect(intestazione(nota({ titolo: "   " }))).toBe("Chiamare Rossi");
  });
});

describe("anteprima", () => {
  it("salta la prima riga, che è già l'intestazione", () => {
    expect(anteprima(nota())).toBe("Vuole il preventivo entro venerdì");
  });

  it("con un titolo esplicito mostra il testo dall'inizio", () => {
    expect(anteprima(nota({ titolo: "Rossi" }))).toContain("Chiamare Rossi");
  });

  it("una nota di una riga sola non ha anteprima, e va bene così", () => {
    expect(anteprima(nota({ testo: "Solo questa" }))).toBe("");
  });
});

describe("ordina", () => {
  it("le fissate stanno sopra, poi le più recenti", () => {
    const risultato = ordina([
      nota({ id: "vecchia", aggiornataIl: "2026-01-01T00:00:00Z" }),
      nota({ id: "recente", aggiornataIl: "2026-09-01T00:00:00Z" }),
      nota({ id: "fissata", fissata: true, aggiornataIl: "2025-01-01T00:00:00Z" }),
    ]);
    expect(risultato.map((n) => n.id)).toEqual(["fissata", "recente", "vecchia"]);
  });

  it("non modifica l'elenco di partenza", () => {
    const originale = [nota({ id: "a" }), nota({ id: "b", fissata: true })];
    ordina(originale);
    expect(originale[0].id).toBe("a");
  });
});

describe("filtra", () => {
  const note = [
    nota({ id: "a", testo: "Riunione a Città Studi" }),
    nota({ id: "b", testo: "Preventivo per Bianchi", etichette: ["urgente"] }),
  ];

  it("ignora gli accenti: chi cerca di fretta non li scrive", () => {
    expect(filtra(note, "citta").map((n) => n.id)).toEqual(["a"]);
  });

  it("ignora le maiuscole", () => {
    expect(filtra(note, "BIANCHI").map((n) => n.id)).toEqual(["b"]);
  });

  it("cerca anche nelle etichette", () => {
    expect(filtra(note, "urgente").map((n) => n.id)).toEqual(["b"]);
  });

  it("un termine vuoto non filtra niente", () => {
    expect(filtra(note, "   ")).toHaveLength(2);
  });
});

describe("etichetteUsate", () => {
  it("ordina per frequenza e, a pari merito, in ordine alfabetico", () => {
    const risultato = etichetteUsate([
      nota({ etichette: ["urgente", "fisco"] }),
      nota({ etichette: ["urgente"] }),
      nota({ etichette: ["clienti"] }),
    ]);
    expect(risultato.map((e) => e.etichetta)).toEqual(["urgente", "clienti", "fisco"]);
    expect(risultato[0].conteggio).toBe(2);
  });
});

describe("normalizzaEtichette", () => {
  it("separa sulle virgole e toglie gli spazi", () => {
    expect(normalizzaEtichette("urgente, fisco ,clienti")).toEqual(["urgente", "fisco", "clienti"]);
  });

  it("porta in minuscolo, così «Urgente» e «urgente» non diventano due etichette", () => {
    expect(normalizzaEtichette("Urgente, urgente ")).toEqual(["urgente"]);
  });

  it("comprime gli spazi interni", () => {
    expect(normalizzaEtichette("da    fare")).toEqual(["da fare"]);
  });

  it("scarta i pezzi vuoti", () => {
    expect(normalizzaEtichette("uno,,  ,due")).toEqual(["uno", "due"]);
  });

  it("si ferma a otto: oltre, le etichette smettono di classificare", () => {
    expect(normalizzaEtichette("a,b,c,d,e,f,g,h,i,l")).toHaveLength(8);
  });
});
