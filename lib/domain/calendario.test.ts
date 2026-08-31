import { describe, it, expect } from "vitest";
import {
  agenda,
  aggiungiGiorni,
  generaIcs,
  grigliaMese,
  vociCalendario,
  vociDelGiorno,
  type EventoProprio,
  type SorgentiCalendario,
} from "./calendario";
import type { Fattura, Scadenza } from "./types";
import type { Preventivo } from "./preventivo";
import type { Ricorrente } from "./ricorrenza";
import type { Attivita } from "./crm";

function sorgentiVuote(): SorgentiCalendario {
  return {
    eventi: [],
    scadenzeFiscali: [],
    scadenzePagate: new Set(),
    fatture: [],
    preventivi: [],
    ricorrenti: [],
    attivita: [],
    nomiClienti: new Map([["c1", "Studio Rossi"]]),
  };
}

function evento(overrides: Partial<EventoProprio> = {}): EventoProprio {
  return {
    id: "e1",
    titolo: "Incontro con il commercialista",
    descrizione: null,
    dataInizio: "2026-09-10",
    dataFine: null,
    oraInizio: null,
    oraFine: null,
    tuttoIlGiorno: true,
    luogo: null,
    tipo: "appuntamento",
    clienteId: null,
    trattativaId: null,
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
    progressivo: 4,
    dataEmissione: "2026-08-01",
    dataIncasso: null,
    stato: "emessa",
    bolloApplicato: false,
    bolloRiaddebitato: false,
    condizioniPagamento: "TP02",
    modalitaPagamento: "MP05",
    giorniScadenzaPagamento: 30,
    causaleAggiuntiva: null,
    note: null,
    xmlProgressivo: null,
    ricorrenteId: null,
    righe: [
      { id: "r1", numeroLinea: 1, descrizione: "Prestazione", quantita: 1, unitaMisura: null, prezzoUnitario: 1000 },
    ],
    ...overrides,
  };
}

function scadenza(overrides: Partial<Scadenza> = {}): Scadenza {
  return {
    chiave: "2025-saldo-imposta",
    tipo: "saldo_imposta",
    annoRiferimento: 2025,
    dataScadenza: "2026-06-30",
    importo: 1200,
    codiceTributo: "1790",
    descrizione: "Saldo imposta sostitutiva 2025",
    ...overrides,
  };
}

function preventivo(overrides: Partial<Preventivo> = {}): Preventivo {
  return {
    id: "p1",
    clienteId: "c1",
    anno: 2026,
    progressivo: 2,
    dataEmissione: "2026-08-20",
    validoFinoAl: "2026-09-20",
    stato: "inviato",
    fatturaId: null,
    oggetto: "Sito vetrina",
    condizioni: null,
    note: null,
    righe: [
      { id: "r1", numeroLinea: 1, descrizione: "Progetto", quantita: 1, unitaMisura: null, prezzoUnitario: 2000 },
    ],
    ...overrides,
  };
}

function ricorrente(overrides: Partial<Ricorrente> = {}): Ricorrente {
  return {
    id: "s1",
    clienteId: "c1",
    descrizione: "Manutenzione sito",
    cadenza: "mensile",
    dataInizio: "2026-07-15",
    dataFine: null,
    ultimaEmissione: "2026-07-15",
    giorniScadenzaPagamento: 30,
    modalitaPagamento: "MP05",
    condizioniPagamento: "TP02",
    causaleAggiuntiva: null,
    attiva: true,
    note: null,
    righe: [
      { id: "r1", numeroLinea: 1, descrizione: "Canone", quantita: 1, unitaMisura: null, prezzoUnitario: 300 },
    ],
    ...overrides,
  };
}

function attivita(overrides: Partial<Attivita> = {}): Attivita {
  return {
    id: "a1",
    clienteId: "c1",
    trattativaId: null,
    tipo: "chiamata",
    data: "2026-09-01",
    testo: "Sentito al telefono",
    prossimoPasso: "Richiamare per la conferma",
    dataProssimoPasso: "2026-09-12",
    fatto: false,
    ...overrides,
  };
}

const OGGI = "2026-09-10";

describe("vociCalendario", () => {
  it("raccoglie tutte e sei le sorgenti", () => {
    const voci = vociCalendario(
      {
        ...sorgentiVuote(),
        eventi: [evento()],
        scadenzeFiscali: [scadenza()],
        fatture: [fattura()],
        preventivi: [preventivo()],
        ricorrenti: [ricorrente()],
        attivita: [attivita()],
      },
      OGGI
    );
    const origini = new Set(voci.map((v) => v.origine));
    expect(origini).toEqual(
      new Set(["evento", "scadenza_fiscale", "fattura", "ricorrente", "preventivo", "attivita"])
    );
  });

  it("solo gli eventi propri sono modificabili: il resto è derivato", () => {
    const voci = vociCalendario(
      { ...sorgentiVuote(), eventi: [evento()], scadenzeFiscali: [scadenza()], fatture: [fattura()] },
      OGGI
    );
    expect(voci.filter((v) => v.modificabile).map((v) => v.origine)).toEqual(["evento"]);
  });

  it("ordina per data, e nello stesso giorno mette prima ciò che non ha un'ora", () => {
    const voci = vociCalendario(
      {
        ...sorgentiVuote(),
        eventi: [
          evento({ id: "a", titolo: "Alle nove", tuttoIlGiorno: false, oraInizio: "09:00:00" }),
          evento({ id: "b", titolo: "Tutto il giorno" }),
        ],
      },
      OGGI
    );
    expect(voci.map((v) => v.titolo)).toEqual(["Tutto il giorno", "Alle nove"]);
  });

  it("una scadenza fiscale già versata resta visibile ma cambia tono", () => {
    const voci = vociCalendario(
      { ...sorgentiVuote(), scadenzeFiscali: [scadenza()], scadenzePagate: new Set(["2025-saldo-imposta"]) },
      OGGI
    );
    expect(voci[0].tono).toBe("ok");
    expect(voci[0].dettaglio).toContain("versata");
  });

  it("una scadenza fiscale passata e non versata è rossa", () => {
    const voci = vociCalendario({ ...sorgentiVuote(), scadenzeFiscali: [scadenza()] }, "2026-07-01");
    expect(voci[0].tono).toBe("danger");
  });

  it("le fatture compaiono alla scadenza di pagamento, non alla data di emissione", () => {
    const voci = vociCalendario({ ...sorgentiVuote(), fatture: [fattura()] }, OGGI);
    // Emessa il 1° agosto con 30 giorni: scade il 31.
    expect(voci[0].data).toBe("2026-08-31");
  });

  it("le fatture già incassate e le note di credito non hanno scadenze da guardare", () => {
    const voci = vociCalendario(
      {
        ...sorgentiVuote(),
        fatture: [
          fattura({ id: "a", stato: "incassata", dataIncasso: "2026-08-20" }),
          fattura({ id: "b", tipoDocumento: "TD04" }),
          fattura({ id: "c", stato: "bozza" }),
        ],
      },
      OGGI
    );
    expect(voci).toHaveLength(0);
  });

  it("gli arretrati di un canone compaiono uno per uno, nel giorno in cui erano dovuti", () => {
    // Serie mensile dal 15 luglio, fatturata fino a luglio compreso. Al 10
    // settembre è maturato solo il 15 agosto — il 15 settembre non è ancora
    // arrivato — quindi un arretrato e la prossima in arrivo.
    const voci = vociCalendario({ ...sorgentiVuote(), ricorrenti: [ricorrente()] }, OGGI);
    const arretrati = voci.filter((v) => v.origine === "ricorrente" && v.tono === "warn");
    const inArrivo = voci.filter((v) => v.origine === "ricorrente" && v.tono === "neutro");
    expect(arretrati.map((v) => v.data)).toEqual(["2026-08-15"]);
    expect(arretrati[0].titolo).toContain("Da fatturare");
    expect(inArrivo.map((v) => v.data)).toEqual(["2026-09-15"]);
  });

  it("una serie sospesa non annuncia la prossima scadenza", () => {
    const voci = vociCalendario(
      { ...sorgentiVuote(), ricorrenti: [ricorrente({ attiva: false, ultimaEmissione: "2026-09-15" })] },
      OGGI
    );
    expect(voci).toHaveLength(0);
  });

  it("solo i preventivi ancora in attesa hanno una scadenza da temere", () => {
    const voci = vociCalendario(
      {
        ...sorgentiVuote(),
        preventivi: [
          preventivo({ id: "a" }),
          preventivo({ id: "b", stato: "accettato" }),
          preventivo({ id: "c", stato: "bozza" }),
        ],
      },
      OGGI
    );
    expect(voci).toHaveLength(1);
    expect(voci[0].data).toBe("2026-09-20");
  });

  it("un prossimo passo già fatto non resta in calendario", () => {
    const voci = vociCalendario(
      { ...sorgentiVuote(), attivita: [attivita({ fatto: true })] },
      OGGI
    );
    expect(voci).toHaveLength(0);
  });
});

describe("vociDelGiorno", () => {
  it("filtra su una data sola", () => {
    const voci = vociCalendario({ ...sorgentiVuote(), eventi: [evento()] }, OGGI);
    expect(vociDelGiorno(voci, "2026-09-10")).toHaveLength(1);
    expect(vociDelGiorno(voci, "2026-09-11")).toHaveLength(0);
  });
});

describe("grigliaMese", () => {
  it("comincia di lunedì, come si legge un calendario in Italia", () => {
    // Il 1° settembre 2026 è un martedì: la griglia parte dal 31 agosto.
    const griglia = grigliaMese(2026, 9, [], OGGI);
    expect(griglia[0].data).toBe("2026-08-31");
    expect(griglia[0].nelMese).toBe(false);
  });

  it("un mese che comincia di lunedì non si porta dietro una settimana vuota", () => {
    // Il 1° giugno 2026 è un lunedì.
    const griglia = grigliaMese(2026, 6, [], OGGI);
    expect(griglia[0].data).toBe("2026-06-01");
  });

  it("restituisce sempre settimane intere", () => {
    for (const mese of [1, 2, 5, 8, 11, 12]) {
      expect(grigliaMese(2026, mese, [], OGGI).length % 7).toBe(0);
    }
  });

  it("taglia la sesta riga quando è fatta di soli riempimenti", () => {
    const griglia = grigliaMese(2026, 6, [], OGGI);
    expect(griglia).toHaveLength(35);
  });

  it("tiene la sesta riga quando il mese ci arriva davvero", () => {
    // Il 1° agosto 2026 è un sabato: 31 giorni a partire dalla sesta casella
    // non stanno in cinque settimane.
    const griglia = grigliaMese(2026, 8, [], OGGI);
    expect(griglia).toHaveLength(42);
    expect(griglia.some((g) => g.nelMese && g.data === "2026-08-31")).toBe(true);
  });

  it("i giorni di riempimento portano le loro voci: il 31 del mese prima non sparisce", () => {
    const voci = vociCalendario(
      { ...sorgentiVuote(), eventi: [evento({ dataInizio: "2026-08-31" })] },
      OGGI
    );
    const griglia = grigliaMese(2026, 9, voci, OGGI);
    expect(griglia[0].voci).toHaveLength(1);
  });

  it("segna il giorno corrente", () => {
    const griglia = grigliaMese(2026, 9, [], OGGI);
    expect(griglia.filter((g) => g.oggi)).toHaveLength(1);
  });
});

describe("agenda", () => {
  it("mette in ritardo solo ciò che chiedeva un'azione", () => {
    const voci = vociCalendario(
      {
        ...sorgentiVuote(),
        // Scaduta e non versata: in ritardo.
        scadenzeFiscali: [scadenza({ dataScadenza: "2026-08-01" })],
        // Passata ma di sola lettura: non è un arretrato.
        eventi: [evento({ dataInizio: "2026-08-01", titolo: "Riunione passata" })],
      },
      OGGI
    );
    const risultato = agenda(voci, OGGI);
    expect(risultato.inRitardo.map((v) => v.origine)).toEqual(["scadenza_fiscale"]);
  });

  it("separa oggi dai prossimi sette giorni, estremo compreso", () => {
    const voci = vociCalendario(
      {
        ...sorgentiVuote(),
        eventi: [
          evento({ id: "a", dataInizio: OGGI }),
          evento({ id: "b", dataInizio: "2026-09-17" }),
          evento({ id: "c", dataInizio: "2026-09-18" }),
        ],
      },
      OGGI
    );
    const risultato = agenda(voci, OGGI);
    expect(risultato.oggi).toHaveLength(1);
    expect(risultato.prossimiSette).toHaveLength(1);
  });
});

describe("aggiungiGiorni", () => {
  it("attraversa il confine del mese", () => {
    expect(aggiungiGiorni("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("attraversa il 29 febbraio di un bisestile", () => {
    expect(aggiungiGiorni("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("generaIcs", () => {
  const adesso = new Date("2026-09-10T08:00:00Z");

  function ics(sorgenti: Partial<SorgentiCalendario> = {}): string {
    const voci = vociCalendario({ ...sorgentiVuote(), ...sorgenti }, OGGI);
    return generaIcs(voci, "GAR Studio", adesso);
  }

  it("apre e chiude il calendario come prescrive lo standard", () => {
    const testo = ics({ eventi: [evento()] });
    expect(testo.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(testo.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(testo).toContain("VERSION:2.0");
  });

  it("termina ogni riga con CRLF, che è obbligatorio e non una preferenza", () => {
    const testo = ics({ eventi: [evento()] });
    expect(testo.split("\r\n").length).toBeGreaterThan(10);
    expect(/[^\r]\n/.test(testo)).toBe(false);
  });

  it("un evento a tutto il giorno ha DTEND al giorno dopo, perché è esclusivo", () => {
    const testo = ics({ eventi: [evento({ dataInizio: "2026-09-10" })] });
    expect(testo).toContain("DTSTART;VALUE=DATE:20260910");
    expect(testo).toContain("DTEND;VALUE=DATE:20260911");
  });

  it("un evento con un'ora la scrive come ora locale fluttuante", () => {
    const testo = ics({
      eventi: [evento({ tuttoIlGiorno: false, oraInizio: "09:30:00" })],
    });
    expect(testo).toContain("DTSTART:20260910T093000");
    expect(testo).not.toContain("DTSTART:20260910T093000Z");
  });

  it("protegge virgole e punti e virgola, che nello standard separano i campi", () => {
    const testo = ics({ eventi: [evento({ titolo: "Rossi, Bianchi; e soci" })] });
    expect(testo).toContain("SUMMARY:Rossi\\, Bianchi\\; e soci");
  });

  it("trasforma gli a capo in \\n invece di spezzare la riga", () => {
    const testo = ics({ eventi: [evento({ titolo: "Prima riga\nSeconda riga" })] });
    expect(testo).toContain("SUMMARY:Prima riga\\nSeconda riga");
  });

  it("piega le righe lunghe a 75 ottetti, continuandole con uno spazio", () => {
    const testo = ics({ eventi: [evento({ titolo: "à".repeat(120) })] });
    for (const riga of testo.split("\r\n")) {
      expect(Buffer.from(riga, "utf8").length).toBeLessThanOrEqual(75);
    }
  });

  it("non spezza un carattere accentato a metà", () => {
    const titolo = "à".repeat(120);
    const testo = ics({ eventi: [evento({ titolo })] });
    // Ricomponendo le righe piegate si deve riottenere il titolo intatto:
    // un taglio in mezzo a un carattere multibyte lo corromperebbe.
    const ricomposto = testo.replace(/\r\n /g, "");
    expect(ricomposto).toContain(`SUMMARY:${titolo}`);
  });

  it("l'UID resta stabile tra due generazioni, così i lettori non ricreano tutto", () => {
    const primo = ics({ eventi: [evento()] });
    const secondo = generaIcs(
      vociCalendario({ ...sorgentiVuote(), eventi: [evento()] }, "2026-12-01"),
      "GAR Studio",
      new Date("2026-12-01T08:00:00Z")
    );
    const uid = (testo: string) => testo.split("\r\n").find((r) => r.startsWith("UID:"));
    expect(uid(primo)).toBe(uid(secondo));
  });

  it("un calendario vuoto è comunque un file valido", () => {
    const testo = ics();
    expect(testo).toContain("BEGIN:VCALENDAR");
    expect(testo).not.toContain("BEGIN:VEVENT");
  });
});
