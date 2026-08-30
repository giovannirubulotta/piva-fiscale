import { describe, it, expect } from "vitest";
import {
  giorniDiValidita,
  motivoNonConvertibile,
  numeroPreventivo,
  riepilogoPreventivi,
  righePerFattura,
  statoEffettivo,
  totalePreventivo,
  type Preventivo,
  type RigaPreventivo,
} from "./preventivo";

function riga(overrides: Partial<RigaPreventivo> = {}): RigaPreventivo {
  return {
    id: "r1",
    numeroLinea: 1,
    descrizione: "Progettazione",
    quantita: 1,
    unitaMisura: null,
    prezzoUnitario: 1000,
    ...overrides,
  };
}

function preventivo(overrides: Partial<Preventivo> = {}): Preventivo {
  return {
    id: "p1",
    clienteId: "c1",
    anno: 2026,
    progressivo: 3,
    dataEmissione: "2026-08-01",
    validoFinoAl: "2026-09-01",
    stato: "inviato",
    fatturaId: null,
    oggetto: "Sito vetrina",
    condizioni: null,
    note: null,
    righe: [riga()],
    ...overrides,
  };
}

describe("numeroPreventivo", () => {
  it("si distingue a occhio da un numero di fattura", () => {
    expect(numeroPreventivo(preventivo())).toBe("P3/2026");
  });
});

describe("totalePreventivo", () => {
  it("somma le righe con la stessa aritmetica della fattura", () => {
    const p = preventivo({
      righe: [riga({ prezzoUnitario: 1000 }), riga({ id: "r2", numeroLinea: 2, quantita: 3, prezzoUnitario: 250 })],
    });
    expect(totalePreventivo(p)).toBe(1750);
  });

  it("regge le quantità decimali senza errori di virgola mobile", () => {
    // 0,1 + 0,2 in virgola mobile fa 0,30000000000000004: l'aritmetica in
    // centesimi interi è ciò che impedisce a un totale di sballare di un cent.
    const p = preventivo({
      righe: [
        riga({ quantita: 0.1, prezzoUnitario: 100 }),
        riga({ id: "r2", numeroLinea: 2, quantita: 0.2, prezzoUnitario: 100 }),
      ],
    });
    expect(totalePreventivo(p)).toBe(30);
  });
});

describe("statoEffettivo", () => {
  it("un preventivo inviato oltre la validità risulta scaduto", () => {
    expect(statoEffettivo(preventivo(), "2026-09-15")).toBe("scaduto");
  });

  it("il giorno stesso della scadenza è ancora valido", () => {
    expect(statoEffettivo(preventivo(), "2026-09-01")).toBe("inviato");
  });

  it("una bozza non scade: non è mai stata offerta a nessuno", () => {
    expect(statoEffettivo(preventivo({ stato: "bozza" }), "2027-01-01")).toBe("bozza");
  });

  it("un accettato non decade con il calendario: la risposta c'è già stata", () => {
    expect(statoEffettivo(preventivo({ stato: "accettato" }), "2027-01-01")).toBe("accettato");
  });

  it("nemmeno un rifiutato", () => {
    expect(statoEffettivo(preventivo({ stato: "rifiutato" }), "2027-01-01")).toBe("rifiutato");
  });
});

describe("giorniDiValidita", () => {
  it("conta i giorni che restano", () => {
    expect(giorniDiValidita(preventivo(), "2026-08-25")).toBe(7);
  });

  it("diventa negativo dopo la scadenza", () => {
    expect(giorniDiValidita(preventivo(), "2026-09-11")).toBe(-10);
  });
});

describe("motivoNonConvertibile", () => {
  it("un preventivo accettato con righe si converte", () => {
    expect(motivoNonConvertibile(preventivo({ stato: "accettato" }))).toBeNull();
  });

  it("un preventivo solo inviato non si converte, e lo spiega", () => {
    const motivo = motivoNonConvertibile(preventivo({ stato: "inviato" }));
    expect(motivo).toContain("accettato");
  });

  it("non si converte due volte", () => {
    const motivo = motivoNonConvertibile(preventivo({ stato: "accettato", fatturaId: "f1" }));
    expect(motivo).toContain("già nata una fattura");
  });

  it("un preventivo senza righe non diventa una fattura vuota", () => {
    expect(motivoNonConvertibile(preventivo({ stato: "accettato", righe: [] }))).toContain("non ha righe");
  });
});

describe("righePerFattura", () => {
  it("copia le righe in ordine di linea", () => {
    const p = preventivo({
      righe: [
        riga({ id: "b", numeroLinea: 2, descrizione: "Seconda" }),
        riga({ id: "a", numeroLinea: 1, descrizione: "Prima" }),
      ],
    });
    expect(righePerFattura(p).map((r) => r.descrizione)).toEqual(["Prima", "Seconda"]);
  });

  it("è una copia, non un riferimento: modificarla non tocca il preventivo", () => {
    const p = preventivo();
    const righe = righePerFattura(p);
    righe[0].prezzoUnitario = 9999;
    expect(p.righe[0].prezzoUnitario).toBe(1000);
  });
});

describe("riepilogoPreventivi", () => {
  const oggi = "2026-09-15";
  const insieme = [
    preventivo({ id: "a", stato: "inviato", validoFinoAl: "2026-10-01", righe: [riga({ prezzoUnitario: 1000 })] }),
    preventivo({ id: "b", stato: "inviato", validoFinoAl: "2026-09-01", righe: [riga({ prezzoUnitario: 5000 })] }),
    preventivo({ id: "c", stato: "accettato", righe: [riga({ prezzoUnitario: 3000 })] }),
    preventivo({ id: "d", stato: "rifiutato", righe: [riga({ prezzoUnitario: 2000 })] }),
    preventivo({ id: "e", stato: "bozza", righe: [riga({ prezzoUnitario: 9000 })] }),
  ];

  it("conta gli scaduti a parte, non tra i rifiutati", () => {
    const r = riepilogoPreventivi(insieme, oggi);
    expect(r.scaduti).toBe(1);
    expect(r.rifiutati).toBe(1);
    expect(r.inviati).toBe(1);
  });

  it("il valore in attesa comprende solo ciò che è ancora valido", () => {
    // I 5.000 € del preventivo scaduto non sono più in attesa di risposta.
    expect(riepilogoPreventivi(insieme, oggi).valoreInAttesa).toBe(1000);
  });

  it("il tasso di accettazione ignora chi non ha risposto", () => {
    // Un accettato e un rifiutato: 50%. Lo scaduto non è un no, è un silenzio.
    expect(riepilogoPreventivi(insieme, oggi).tassoAccettazione).toBe(50);
  });

  it("senza risposte il tasso è nullo, non zero", () => {
    const soloInviati = [preventivo({ stato: "inviato", validoFinoAl: "2026-10-01" })];
    expect(riepilogoPreventivi(soloInviati, oggi).tassoAccettazione).toBeNull();
  });

  it("le bozze non entrano in nessun conteggio: non sono offerte", () => {
    const r = riepilogoPreventivi(insieme, oggi);
    expect(r.inviati + r.accettati + r.rifiutati + r.scaduti).toBe(4);
    expect(r.valoreAccettato).toBe(3000);
  });
});
