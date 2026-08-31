import { describe, it, expect } from "vitest";
import {
  aggiungiMesi,
  dataOccorrenza,
  motivoNonEmettibile,
  occorrenzeDaEmettere,
  occorrenzeMaturate,
  prossimaOccorrenza,
  riepilogoRicorrenti,
  righePerFattura,
  totaleRicorrente,
  valoreAnnuo,
  type Ricorrente,
  type RigaRicorrente,
} from "./ricorrenza";

function riga(overrides: Partial<RigaRicorrente> = {}): RigaRicorrente {
  return {
    id: "r1",
    numeroLinea: 1,
    descrizione: "Canone di manutenzione",
    quantita: 1,
    unitaMisura: null,
    prezzoUnitario: 300,
    ...overrides,
  };
}

function ricorrente(overrides: Partial<Ricorrente> = {}): Ricorrente {
  return {
    id: "s1",
    clienteId: "c1",
    descrizione: "Manutenzione sito",
    cadenza: "mensile",
    dataInizio: "2026-01-15",
    dataFine: null,
    ultimaEmissione: null,
    giorniScadenzaPagamento: 30,
    modalitaPagamento: "MP05",
    condizioniPagamento: "TP02",
    causaleAggiuntiva: null,
    attiva: true,
    note: null,
    righe: [riga()],
    ...overrides,
  };
}

describe("aggiungiMesi", () => {
  it("somma un mese normale", () => {
    expect(aggiungiMesi("2026-01-15", 1)).toBe("2026-02-15");
  });

  it("cambia anno senza inciampare", () => {
    expect(aggiungiMesi("2026-11-30", 2)).toBe("2027-01-30");
  });

  it("il 31 gennaio più un mese si ferma al 28, non trabocca a marzo", () => {
    // È l'errore classico di `setMonth`: Date accetta il 31 febbraio e lo
    // riporta al 3 marzo, spostando silenziosamente tutta la serie.
    expect(aggiungiMesi("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("negli anni bisestili si ferma al 29", () => {
    expect(aggiungiMesi("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("il 31 marzo più un mese sta nei 30 giorni di aprile", () => {
    expect(aggiungiMesi("2026-03-31", 1)).toBe("2026-04-30");
  });
});

describe("dataOccorrenza", () => {
  it("conta dall'inizio della serie, così un mese corto non accorcia i successivi", () => {
    // Concatenando si otterrebbe 28 febbraio → 28 marzo: la serie perderebbe
    // tre giorni per sempre dopo un solo febbraio.
    const s = ricorrente({ dataInizio: "2026-01-31" });
    expect(dataOccorrenza(s, 1)).toBe("2026-02-28");
    expect(dataOccorrenza(s, 2)).toBe("2026-03-31");
  });

  it("rispetta la cadenza trimestrale", () => {
    const s = ricorrente({ dataInizio: "2026-01-10", cadenza: "trimestrale" });
    expect(dataOccorrenza(s, 2)).toBe("2026-07-10");
  });
});

describe("occorrenzeMaturate", () => {
  it("comprende il giorno stesso della scadenza", () => {
    const maturate = occorrenzeMaturate(ricorrente(), "2026-02-15");
    expect(maturate).toEqual(["2026-01-15", "2026-02-15"]);
  });

  it("si ferma alla data di fine", () => {
    const s = ricorrente({ dataFine: "2026-03-01" });
    expect(occorrenzeMaturate(s, "2026-12-31")).toEqual(["2026-01-15", "2026-02-15"]);
  });

  it("prima dell'inizio non c'è ancora niente", () => {
    expect(occorrenzeMaturate(ricorrente(), "2025-12-31")).toEqual([]);
  });
});

describe("occorrenzeDaEmettere", () => {
  it("propone gli arretrati di chi è stato fermo qualche mese", () => {
    const s = ricorrente({ ultimaEmissione: "2026-01-15" });
    expect(occorrenzeDaEmettere(s, "2026-04-20")).toEqual(["2026-02-15", "2026-03-15", "2026-04-15"]);
  });

  it("dopo l'emissione non ripropone la stessa fattura", () => {
    const s = ricorrente({ ultimaEmissione: "2026-02-15" });
    expect(occorrenzeDaEmettere(s, "2026-02-20")).toEqual([]);
  });

  it("una serie sospesa non propone nulla", () => {
    const s = ricorrente({ attiva: false });
    expect(occorrenzeDaEmettere(s, "2026-06-01")).toEqual([]);
  });

  it("ma riattivandola gli arretrati sono ancora lì", () => {
    const sospesa = ricorrente({ attiva: false });
    const riattivata = { ...sospesa, attiva: true };
    expect(occorrenzeDaEmettere(riattivata, "2026-03-20")).toHaveLength(3);
  });
});

describe("prossimaOccorrenza", () => {
  it("guarda avanti, mai al giorno stesso", () => {
    expect(prossimaOccorrenza(ricorrente(), "2026-02-15")).toBe("2026-03-15");
  });

  it("è nulla quando la serie è finita", () => {
    const s = ricorrente({ dataFine: "2026-02-28" });
    expect(prossimaOccorrenza(s, "2026-03-01")).toBeNull();
  });
});

describe("valoreAnnuo", () => {
  it("un canone mensile vale dodici volte", () => {
    expect(valoreAnnuo(ricorrente())).toBe(3600);
  });

  it("un canone trimestrale vale quattro volte", () => {
    expect(valoreAnnuo(ricorrente({ cadenza: "trimestrale" }))).toBe(1200);
  });

  it("un canone annuale vale sé stesso", () => {
    expect(valoreAnnuo(ricorrente({ cadenza: "annuale" }))).toBe(300);
  });
});

describe("totaleRicorrente", () => {
  it("usa l'aritmetica in centesimi delle fatture", () => {
    const s = ricorrente({
      righe: [riga({ prezzoUnitario: 0.1 }), riga({ id: "r2", numeroLinea: 2, prezzoUnitario: 0.2 })],
    });
    expect(totaleRicorrente(s)).toBe(0.3);
  });
});

describe("motivoNonEmettibile", () => {
  it("con un arretrato maturato si emette", () => {
    expect(motivoNonEmettibile(ricorrente(), "2026-02-01")).toBeNull();
  });

  it("una serie sospesa lo dice", () => {
    expect(motivoNonEmettibile(ricorrente({ attiva: false }), "2026-02-01")).toContain("sospesa");
  });

  it("senza righe non si emette una fattura a zero", () => {
    expect(motivoNonEmettibile(ricorrente({ righe: [] }), "2026-02-01")).toContain("righe");
  });

  it("quando non c'è nulla da emettere indica la prossima data", () => {
    const s = ricorrente({ ultimaEmissione: "2026-02-15" });
    expect(motivoNonEmettibile(s, "2026-02-20")).toContain("2026-03-15");
  });

  it("una serie conclusa e saldata lo dice senza promettere date", () => {
    const s = ricorrente({ dataFine: "2026-02-28", ultimaEmissione: "2026-02-15" });
    expect(motivoNonEmettibile(s, "2026-06-01")).toContain("conclusa");
  });
});

describe("righePerFattura", () => {
  it("è una copia: modificarla non tocca la serie", () => {
    const s = ricorrente();
    const righe = righePerFattura(s);
    righe[0].prezzoUnitario = 9999;
    expect(s.righe[0].prezzoUnitario).toBe(300);
  });
});

describe("riepilogoRicorrenti", () => {
  const oggi = "2026-03-20";

  it("separa il portafoglio attivo da quello sospeso", () => {
    const r = riepilogoRicorrenti(
      [ricorrente(), ricorrente({ id: "s2", attiva: false }), ricorrente({ id: "s3", cadenza: "trimestrale" })],
      oggi
    );
    expect(r.attive).toBe(2);
    expect(r.sospese).toBe(1);
    // 3.600 del mensile + 1.200 del trimestrale; il sospeso non vale nulla.
    expect(r.valoreAnnuoAttivo).toBe(4800);
  });

  it("conta gli arretrati e quanto valgono", () => {
    const r = riepilogoRicorrenti([ricorrente({ ultimaEmissione: "2026-01-15" })], oggi);
    expect(r.arretrati).toBe(2);
    expect(r.importoArretrati).toBe(600);
  });

  it("una serie sospesa non porta arretrati nel riepilogo", () => {
    const r = riepilogoRicorrenti([ricorrente({ attiva: false })], oggi);
    expect(r.arretrati).toBe(0);
  });
});
