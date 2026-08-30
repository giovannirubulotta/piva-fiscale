import { describe, it, expect } from "vitest";
import {
  conseguenzeEliminazione,
  motivoNonEliminabile,
  IMPORTO_BOLLO,
  SOGLIA_BOLLO,
  bolloDovuto,
  dataScadenzaPagamento,
  fattureComeIncassi,
  imponibileFiscale,
  numeroFattura,
  totaleDocumento,
  totaleRiga,
  totaleRighe,
} from "./fattura";
import type { Fattura, RigaFattura } from "./types";

function riga(overrides: Partial<RigaFattura> = {}): RigaFattura {
  return {
    id: "r1",
    numeroLinea: 1,
    descrizione: "Prestazione",
    quantita: 1,
    unitaMisura: null,
    prezzoUnitario: 100,
    ...overrides,
  };
}

function fattura(overrides: Partial<Fattura> = {}): Fattura {
  return {
    id: "f1",
    clienteId: "c1",
    tipoDocumento: "TD01",
    fatturaRiferimentoId: null,
    anno: 2026,
    progressivo: 3,
    dataEmissione: "2026-08-29",
    dataIncasso: null,
    stato: "emessa",
    bolloApplicato: false,
    bolloRiaddebitato: true,
    condizioniPagamento: "TP02",
    modalitaPagamento: "MP05",
    giorniScadenzaPagamento: 30,
    causaleAggiuntiva: null,
    note: null,
    xmlProgressivo: null,
    righe: [riga()],
    ...overrides,
  };
}

describe("totaleRiga", () => {
  it("moltiplica quantità e prezzo unitario", () => {
    expect(totaleRiga({ quantita: 3, prezzoUnitario: 150 })).toBe(450);
  });

  it("arrotonda al centesimo senza accumulare errore binario", () => {
    // 0.1 + 0.2 in float dà 0.30000000000000004: con tre righe da 0.10 il
    // totale deve restare esattamente 0.30, o si sfora la tolleranza SDI 00423.
    const righe = [
      { quantita: 1, prezzoUnitario: 0.1 },
      { quantita: 1, prezzoUnitario: 0.1 },
      { quantita: 1, prezzoUnitario: 0.1 },
    ];
    expect(totaleRighe(righe)).toBe(0.3);
  });

  it("arrotonda una quantità frazionaria al centesimo", () => {
    expect(totaleRiga({ quantita: 1.5, prezzoUnitario: 33.33 })).toBe(50);
  });
});

describe("bolloDovuto", () => {
  it("non è dovuto esattamente alla soglia di 77,47 €", () => {
    expect(bolloDovuto([{ quantita: 1, prezzoUnitario: SOGLIA_BOLLO }])).toBe(false);
  });

  it("è dovuto un centesimo sopra la soglia", () => {
    expect(bolloDovuto([{ quantita: 1, prezzoUnitario: 77.48 }])).toBe(true);
  });

  it("valuta la somma delle righe, non la singola riga", () => {
    expect(
      bolloDovuto([
        { quantita: 1, prezzoUnitario: 40 },
        { quantita: 1, prezzoUnitario: 40 },
      ])
    ).toBe(true);
  });
});

describe("totaleDocumento", () => {
  it("non aggiunge il bollo se resta a carico dell'emittente", () => {
    const f = fattura({ bolloApplicato: true, bolloRiaddebitato: false, righe: [riga({ prezzoUnitario: 1000 })] });
    expect(totaleDocumento(f)).toBe(1000);
  });

  it("aggiunge i 2 € se il bollo è riaddebitato al cliente", () => {
    const f = fattura({ bolloApplicato: true, bolloRiaddebitato: true, righe: [riga({ prezzoUnitario: 1000 })] });
    expect(totaleDocumento(f)).toBe(1000 + IMPORTO_BOLLO);
  });

  it("ignora il flag di riaddebito se il bollo non è applicato", () => {
    const f = fattura({ bolloApplicato: false, bolloRiaddebitato: true, righe: [riga({ prezzoUnitario: 50 })] });
    expect(totaleDocumento(f)).toBe(50);
  });
});

describe("imponibileFiscale", () => {
  it("include il bollo riaddebitato: è compenso e concorre al reddito forfettario", () => {
    const f = fattura({ bolloApplicato: true, bolloRiaddebitato: true, righe: [riga({ prezzoUnitario: 1000 })] });
    expect(imponibileFiscale(f)).toBe(1002);
  });

  it("esclude il bollo a carico dell'emittente: non è un ricavo", () => {
    const f = fattura({ bolloApplicato: true, bolloRiaddebitato: false, righe: [riga({ prezzoUnitario: 1000 })] });
    expect(imponibileFiscale(f)).toBe(1000);
  });
});

describe("numeroFattura", () => {
  it("compone progressivo e anno, sempre con almeno una cifra (scarto SDI 00425)", () => {
    expect(numeroFattura({ progressivo: 3, anno: 2026 })).toBe("3/2026");
    expect(/\d/.test(numeroFattura({ progressivo: 1, anno: 2026 }))).toBe(true);
  });
});

describe("dataScadenzaPagamento", () => {
  it("somma i giorni concordati alla data di emissione", () => {
    expect(dataScadenzaPagamento({ dataEmissione: "2026-08-29", giorniScadenzaPagamento: 30 })).toBe("2026-09-28");
  });

  it("attraversa correttamente il cambio d'anno", () => {
    expect(dataScadenzaPagamento({ dataEmissione: "2026-12-20", giorniScadenzaPagamento: 30 })).toBe("2027-01-19");
  });

  it("con 0 giorni resta la data di emissione", () => {
    expect(dataScadenzaPagamento({ dataEmissione: "2026-08-29", giorniScadenzaPagamento: 0 })).toBe("2026-08-29");
  });
});

describe("fattureComeIncassi", () => {
  it("mappa una fattura incassata sul contratto usato dal motore di calcolo", () => {
    const f = fattura({ stato: "incassata", dataIncasso: "2026-09-10", righe: [riga({ prezzoUnitario: 500 })] });
    const [incasso] = fattureComeIncassi([f]);
    expect(incasso).toMatchObject({
      id: "f1",
      dataIncasso: "2026-09-10",
      importoNetto: 500,
      stato: "incassata",
    });
  });

  it("porta una nota di credito con segno negativo, così storna il fatturato", () => {
    const nota = fattura({ tipoDocumento: "TD04", stato: "incassata", righe: [riga({ prezzoUnitario: 200 })] });
    expect(fattureComeIncassi([nota])[0].importoNetto).toBe(-200);
  });

  it("non conta il bollo di una nota di credito tra quelli da versare", () => {
    const nota = fattura({ tipoDocumento: "TD04", bolloApplicato: true, righe: [riga({ prezzoUnitario: 200 })] });
    expect(fattureComeIncassi([nota])[0].bolloApplicato).toBe(false);
  });

  it("tratta una bozza come da incassare, non come annullata", () => {
    expect(fattureComeIncassi([fattura({ stato: "bozza" })])[0].stato).toBe("da_incassare");
    expect(fattureComeIncassi([fattura({ stato: "emessa" })])[0].stato).toBe("da_incassare");
    expect(fattureComeIncassi([fattura({ stato: "annullata" })])[0].stato).toBe("annullata");
  });
});

describe("motivoNonEliminabile", () => {
  it("permette di eliminare un documento che nessuno storna", () => {
    const f = fattura({ id: "a" });
    expect(motivoNonEliminabile(f, [f])).toBeNull();
  });

  it("blocca se una nota di credito lo storna, e dice quale", () => {
    const f = fattura({ id: "a", progressivo: 3 });
    const nota = fattura({ id: "b", tipoDocumento: "TD04", fatturaRiferimentoId: "a", progressivo: 4 });
    const motivo = motivoNonEliminabile(f, [f, nota]);
    expect(motivo).toContain("4/2026");
    expect(motivo).toContain("eliminala prima");
  });

  it("elenca tutte le note di credito quando sono più di una", () => {
    const f = fattura({ id: "a" });
    const note = [
      fattura({ id: "b", tipoDocumento: "TD04", fatturaRiferimentoId: "a", progressivo: 4 }),
      fattura({ id: "c", tipoDocumento: "TD04", fatturaRiferimentoId: "a", progressivo: 5 }),
    ];
    const motivo = motivoNonEliminabile(f, [f, ...note]);
    expect(motivo).toContain("4/2026, 5/2026");
    expect(motivo).toContain("eliminale prima");
  });

  it("una nota di credito che storna un altro documento non blocca questo", () => {
    const f = fattura({ id: "a" });
    const altra = fattura({ id: "z" });
    const nota = fattura({ id: "b", tipoDocumento: "TD04", fatturaRiferimentoId: "z", progressivo: 4 });
    expect(motivoNonEliminabile(f, [f, altra, nota])).toBeNull();
  });

  it("una nota di credito si elimina sempre: nessuno storna uno storno", () => {
    const nota = fattura({ id: "b", tipoDocumento: "TD04", fatturaRiferimentoId: "a" });
    expect(motivoNonEliminabile(nota, [fattura({ id: "a" }), nota])).toBeNull();
  });
});

describe("conseguenzeEliminazione", () => {
  it("su una bozza mai trasmessa avvisa solo degli allegati", () => {
    const avvisi = conseguenzeEliminazione({ stato: "bozza", xmlProgressivo: null, tipoDocumento: "TD01" });
    expect(avvisi).toHaveLength(1);
    expect(avvisi[0]).toContain("allegati");
  });

  it("su un documento emesso ricorda che eliminarlo non lo annulla verso l'Agenzia", () => {
    const avvisi = conseguenzeEliminazione({ stato: "emessa", xmlProgressivo: null, tipoDocumento: "TD01" });
    expect(avvisi.join(" ")).toContain("nota di credito");
  });

  it("se un XML è già stato generato, dice che il numero di trasmissione resta bruciato", () => {
    const avvisi = conseguenzeEliminazione({ stato: "emessa", xmlProgressivo: "00007", tipoDocumento: "TD01" });
    expect(avvisi.join(" ")).toContain("00007");
    expect(avvisi.join(" ")).toContain("non verrà riutilizzato");
  });

  it("su un documento incassato avvisa dell'effetto sul calcolo dell'anno", () => {
    const avvisi = conseguenzeEliminazione({ stato: "incassata", xmlProgressivo: null, tipoDocumento: "TD01" });
    expect(avvisi.join(" ")).toContain("imponibile");
  });
});
