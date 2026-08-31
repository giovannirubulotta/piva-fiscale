import { describe, it, expect } from "vitest";
import { cronologia, riepilogoRapporto, type SorgentiCronologia } from "./cronologia";
import type { Fattura } from "./types";
import type { Preventivo } from "./preventivo";
import type { Nota } from "./nota";
import type { Attivita } from "./crm";
import type { EventoProprio } from "./calendario";

const OGGI = "2026-09-10";

function vuote(): SorgentiCronologia {
  return { attivita: [], note: [], preventivi: [], fatture: [], eventi: [] };
}

function fattura(overrides: Partial<Fattura> = {}): Fattura {
  return {
    id: "f1",
    clienteId: "c1",
    tipoDocumento: "TD01",
    fatturaRiferimentoId: null,
    anno: 2026,
    progressivo: 1,
    dataEmissione: "2026-06-01",
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

function attivita(overrides: Partial<Attivita> = {}): Attivita {
  return {
    id: "a1",
    clienteId: "c1",
    trattativaId: null,
    tipo: "chiamata",
    data: "2026-09-01",
    testo: "Sentito al telefono",
    prossimoPasso: null,
    dataProssimoPasso: null,
    fatto: false,
    ...overrides,
  };
}

function nota(overrides: Partial<Nota> = {}): Nota {
  return {
    id: "n1",
    titolo: "Preferenze grafiche",
    testo: "Vuole i toni caldi",
    clienteId: "c1",
    trattativaId: null,
    fissata: false,
    etichette: ["design"],
    creataIl: "2026-05-01T10:00:00Z",
    aggiornataIl: "2026-08-20T10:00:00Z",
    ...overrides,
  };
}

function preventivo(overrides: Partial<Preventivo> = {}): Preventivo {
  return {
    id: "p1",
    clienteId: "c1",
    anno: 2026,
    progressivo: 1,
    dataEmissione: "2026-04-01",
    validoFinoAl: "2026-05-01",
    stato: "accettato",
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

function evento(overrides: Partial<EventoProprio> = {}): EventoProprio {
  return {
    id: "e1",
    titolo: "Sopralluogo",
    descrizione: null,
    dataInizio: "2026-09-20",
    dataFine: null,
    oraInizio: "10:00:00",
    oraFine: null,
    tuttoIlGiorno: false,
    luogo: "In sede",
    tipo: "appuntamento",
    clienteId: "c1",
    trattativaId: null,
    ...overrides,
  };
}

describe("cronologia", () => {
  it("mette tutto in un flusso solo, dal più recente", () => {
    const voci = cronologia(
      {
        attivita: [attivita()],
        note: [nota()],
        preventivi: [preventivo()],
        fatture: [fattura()],
        eventi: [evento()],
      },
      OGGI
    );
    expect(voci.map((v) => v.data)).toEqual([
      "2026-09-20", // evento futuro
      "2026-09-01", // contatto
      "2026-08-20", // nota (data di ultima modifica)
      "2026-06-01", // fattura
      "2026-04-01", // preventivo
    ]);
  });

  it("una fattura incassata produce due voci: l'emissione e l'incasso", () => {
    const voci = cronologia(
      { ...vuote(), fatture: [fattura({ dataIncasso: "2026-07-15", stato: "incassata" })] },
      OGGI
    );
    expect(voci.map((v) => v.tipo)).toEqual(["incasso", "fattura"]);
    // Sono due fatti a mesi di distanza: schiacciarli cancellerebbe proprio
    // l'informazione di quanto ci ha messo a pagare.
    expect(voci[0].dettaglio).toContain("44 giorni");
  });

  it("il prossimo passo è una voce a sé, alla sua data", () => {
    const voci = cronologia(
      {
        ...vuote(),
        attivita: [attivita({ prossimoPasso: "Richiamare", dataProssimoPasso: "2026-09-25" })],
      },
      OGGI
    );
    expect(voci[0]).toMatchObject({ titolo: "Richiamare", data: "2026-09-25", futuro: true });
  });

  it("un prossimo passo già fatto non compare", () => {
    const voci = cronologia(
      {
        ...vuote(),
        attivita: [attivita({ prossimoPasso: "Richiamare", dataProssimoPasso: "2026-09-25", fatto: true })],
      },
      OGGI
    );
    expect(voci).toHaveLength(1);
  });

  it("un prossimo passo scaduto è rosso e non è futuro", () => {
    const voci = cronologia(
      {
        ...vuote(),
        attivita: [attivita({ prossimoPasso: "Richiamare", dataProssimoPasso: "2026-08-01" })],
      },
      OGGI
    );
    const passo = voci.find((v) => v.titolo === "Richiamare");
    expect(passo).toMatchObject({ tono: "danger", futuro: false });
  });

  it("una nota di credito entra con importo negativo", () => {
    const voci = cronologia({ ...vuote(), fatture: [fattura({ tipoDocumento: "TD04" })] }, OGGI);
    expect(voci[0].importo).toBeLessThan(0);
    expect(voci[0].titolo).toContain("Nota di credito");
  });

  it("una fattura annullata non è mai esistita", () => {
    const voci = cronologia({ ...vuote(), fatture: [fattura({ stato: "annullata" })] }, OGGI);
    expect(voci).toHaveLength(0);
  });

  it("un preventivo scaduto lo dice, e non finge di essere ancora valido", () => {
    const voci = cronologia({ ...vuote(), preventivi: [preventivo({ stato: "inviato" })] }, OGGI);
    expect(voci[0].tono).toBe("warn");
    expect(voci[0].dettaglio).toContain("scaduto");
  });
});

describe("riepilogoRapporto", () => {
  it("l'ultimo contatto ignora ciò che deve ancora succedere", () => {
    const sorgenti = { ...vuote(), attivita: [attivita()], eventi: [evento()] };
    const voci = cronologia(sorgenti, OGGI);
    const riepilogo = riepilogoRapporto(voci, [], OGGI);
    // L'evento è il 20 settembre: è in programma, non è un contatto avvenuto.
    expect(riepilogo.ultimoContatto).toBe("2026-09-01");
    expect(riepilogo.giorniDaUltimoContatto).toBe(9);
    expect(riepilogo.inProgramma).toHaveLength(1);
  });

  it("i giorni medi di incasso si calcolano solo sulle fatture pagate", () => {
    const fatture = [
      fattura({ id: "a", dataEmissione: "2026-01-01", dataIncasso: "2026-01-31", stato: "incassata" }),
      fattura({ id: "b", dataEmissione: "2026-02-01", dataIncasso: "2026-03-13", stato: "incassata" }),
      // Ancora aperta: includerla darebbe una media che migliora da sola col
      // passare del tempo, cioè un numero senza significato.
      fattura({ id: "c", dataEmissione: "2026-08-01" }),
    ];
    const riepilogo = riepilogoRapporto(cronologia({ ...vuote(), fatture }, OGGI), fatture, OGGI);
    expect(riepilogo.giorniMediDiIncasso).toBe(35);
    expect(riepilogo.fattureNonPagate).toBe(1);
  });

  it("senza fatture pagate la media è nulla, non zero", () => {
    const fatture = [fattura()];
    const riepilogo = riepilogoRapporto(cronologia({ ...vuote(), fatture }, OGGI), fatture, OGGI);
    expect(riepilogo.giorniMediDiIncasso).toBeNull();
  });

  it("il fatturato totale non conta le note di credito come ricavo", () => {
    const fatture = [fattura({ id: "a" }), fattura({ id: "b", tipoDocumento: "TD04" })];
    const riepilogo = riepilogoRapporto(cronologia({ ...vuote(), fatture }, OGGI), fatture, OGGI);
    expect(riepilogo.fatturatoTotale).toBe(1000);
  });

  it("un cliente senza storia non rompe niente", () => {
    const riepilogo = riepilogoRapporto([], [], OGGI);
    expect(riepilogo.ultimoContatto).toBeNull();
    expect(riepilogo.giorniDaUltimoContatto).toBeNull();
    expect(riepilogo.fatturatoTotale).toBe(0);
  });
});
