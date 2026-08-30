import { describe, it, expect } from "vitest";
import {
  FASI_APERTE,
  PROBABILITA_SUGGERITA,
  passiDaFare,
  pipeline,
  tassoDiConversione,
  trattativeFerme,
  valoreAperto,
  valorePerCliente,
  valorePonderato,
  type Attivita,
  type Trattativa,
} from "./crm";

function trattativa(overrides: Partial<Trattativa> = {}): Trattativa {
  return {
    id: "t1",
    clienteId: "c1",
    titolo: "Sito vetrina",
    fase: "proposta",
    valoreStimato: 3000,
    probabilita: 60,
    dataPrevista: "2026-10-01",
    dataChiusura: null,
    motivoChiusura: null,
    note: null,
    aggiornataIl: "2026-08-01T10:00:00Z",
    ...overrides,
  };
}

function attivita(overrides: Partial<Attivita> = {}): Attivita {
  return {
    id: "a1",
    clienteId: "c1",
    trattativaId: null,
    tipo: "chiamata",
    data: "2026-08-20",
    testo: "Chiamata di aggiornamento",
    prossimoPasso: null,
    dataProssimoPasso: null,
    fatto: false,
    ...overrides,
  };
}

describe("valore della pipeline", () => {
  const trattative = [
    trattativa({ id: "a", fase: "contatto", valoreStimato: 1000, probabilita: 10 }),
    trattativa({ id: "b", fase: "proposta", valoreStimato: 2000, probabilita: 50 }),
    trattativa({ id: "c", fase: "vinta", valoreStimato: 9000, probabilita: 100, dataChiusura: "2026-07-01" }),
    trattativa({ id: "d", fase: "persa", valoreStimato: 5000, probabilita: 0, dataChiusura: "2026-07-15" }),
  ];

  it("il valore aperto somma solo le trattative non chiuse", () => {
    expect(valoreAperto(trattative)).toBe(3000);
  });

  it("il valore ponderato pesa ciascuna per la sua probabilità", () => {
    // 1000×0,10 + 2000×0,50
    expect(valorePonderato(trattative)).toBe(1100);
  });

  it("le trattative chiuse non entrano nel ponderato, nemmeno le vinte", () => {
    // Una vinta è fatturato, non previsione: contarla due volte gonfia il futuro.
    expect(valorePonderato([trattativa({ fase: "vinta", valoreStimato: 10_000, probabilita: 100, dataChiusura: "2026-07-01" })])).toBe(0);
  });
});

describe("pipeline", () => {
  it("restituisce sempre tutte le fasi aperte, anche quelle vuote", () => {
    const colonne = pipeline([trattativa({ fase: "proposta" })]);
    expect(colonne.map((c) => c.fase)).toEqual(FASI_APERTE);
    expect(colonne.find((c) => c.fase === "contatto")?.trattative).toHaveLength(0);
  });

  it("ordina per valore decrescente dentro la colonna e ne somma il totale", () => {
    const colonne = pipeline([
      trattativa({ id: "piccola", fase: "contatto", valoreStimato: 500 }),
      trattativa({ id: "grande", fase: "contatto", valoreStimato: 4000 }),
    ]);
    const contatto = colonne.find((c) => c.fase === "contatto")!;
    expect(contatto.trattative.map((t) => t.id)).toEqual(["grande", "piccola"]);
    expect(contatto.totale).toBe(4500);
  });
});

describe("trattativeFerme", () => {
  const oggi = "2026-09-01";

  it("segnala le trattative aperte senza contatti recenti", () => {
    const ferme = trattativeFerme([trattativa()], [attivita({ data: "2026-07-01" })], oggi);
    expect(ferme).toHaveLength(1);
    expect(ferme[0].giorniDaUltimoContatto).toBe(62);
    expect(ferme[0].ultimoContatto).toBe("2026-07-01");
  });

  it("non segnala quelle seguite di recente", () => {
    expect(trattativeFerme([trattativa()], [attivita({ data: "2026-08-28" })], oggi)).toHaveLength(0);
  });

  it("senza attività registrate usa l'ultimo aggiornamento della trattativa", () => {
    const ferme = trattativeFerme([trattativa({ aggiornataIl: "2026-06-15T09:00:00Z" })], [], oggi);
    expect(ferme[0].giorniDaUltimoContatto).toBe(78);
    expect(ferme[0].ultimoContatto).toBeNull();
  });

  it("le trattative chiuse non sono mai ferme: sono finite", () => {
    const chiusa = trattativa({ fase: "persa", dataChiusura: "2026-02-01", aggiornataIl: "2026-02-01T09:00:00Z" });
    expect(trattativeFerme([chiusa], [], oggi)).toHaveLength(0);
  });

  it("mette per prime le più ferme", () => {
    const ferme = trattativeFerme(
      [
        trattativa({ id: "recente", clienteId: "c1" }),
        trattativa({ id: "antica", clienteId: "c2" }),
      ],
      [attivita({ clienteId: "c1", data: "2026-08-01" }), attivita({ id: "a2", clienteId: "c2", data: "2026-05-01" })],
      oggi
    );
    expect(ferme.map((f) => f.trattativa.id)).toEqual(["antica", "recente"]);
  });
});

describe("passiDaFare", () => {
  it("tiene solo i passi con una data e non ancora fatti", () => {
    const elenco = passiDaFare([
      attivita({ id: "senza-data", prossimoPasso: "Richiamare" }),
      attivita({ id: "fatto", prossimoPasso: "Inviare", dataProssimoPasso: "2026-08-10", fatto: true }),
      attivita({ id: "buono", prossimoPasso: "Preventivo", dataProssimoPasso: "2026-09-05" }),
    ]);
    expect(elenco.map((a) => a.id)).toEqual(["buono"]);
  });

  it("ordina dal più scaduto al più lontano", () => {
    const elenco = passiDaFare([
      attivita({ id: "dopo", prossimoPasso: "b", dataProssimoPasso: "2026-09-20" }),
      attivita({ id: "prima", prossimoPasso: "a", dataProssimoPasso: "2026-08-01" }),
    ]);
    expect(elenco.map((a) => a.id)).toEqual(["prima", "dopo"]);
  });
});

describe("tassoDiConversione", () => {
  it("è nullo finché non si è chiuso nulla: zero su zero non è zero per cento", () => {
    const tasso = tassoDiConversione([trattativa({ fase: "proposta" })]);
    expect(tasso.percentuale).toBeNull();
  });

  it("conta vinte e perse e somma il valore vinto", () => {
    const tasso = tassoDiConversione([
      trattativa({ id: "v1", fase: "vinta", valoreStimato: 3000, dataChiusura: "2026-05-01" }),
      trattativa({ id: "v2", fase: "vinta", valoreStimato: 1000, dataChiusura: "2026-06-01" }),
      trattativa({ id: "p1", fase: "persa", valoreStimato: 9000, dataChiusura: "2026-06-10" }),
      trattativa({ id: "aperta", fase: "proposta" }),
    ]);
    expect(tasso.vinte).toBe(2);
    expect(tasso.perse).toBe(1);
    expect(tasso.percentuale).toBe(67);
    expect(tasso.valoreVinto).toBe(4000);
  });
});

describe("valorePerCliente", () => {
  const documento = (over: Partial<Parameters<typeof valorePerCliente>[0][number]> = {}) => ({
    clienteId: "c1",
    tipoDocumento: "TD01",
    dataEmissione: "2026-03-01",
    totale: 1000,
    annullata: false,
    ...over,
  });

  it("somma i documenti emessi per cliente", () => {
    const valori = valorePerCliente([documento(), documento({ dataEmissione: "2026-05-01", totale: 500 })]);
    expect(valori.get("c1")?.fatturatoTotale).toBe(1500);
    expect(valori.get("c1")?.documenti).toBe(2);
    expect(valori.get("c1")?.ultimaFattura).toBe("2026-05-01");
  });

  it("le note di credito sottraggono", () => {
    const valori = valorePerCliente([documento(), documento({ tipoDocumento: "TD04", totale: 300 })]);
    expect(valori.get("c1")?.fatturatoTotale).toBe(700);
  });

  it("i documenti annullati non contano", () => {
    const valori = valorePerCliente([documento(), documento({ totale: 9999, annullata: true })]);
    expect(valori.get("c1")?.fatturatoTotale).toBe(1000);
    expect(valori.get("c1")?.documenti).toBe(1);
  });

  it("tiene i clienti separati", () => {
    const valori = valorePerCliente([documento(), documento({ clienteId: "c2", totale: 200 })]);
    expect(valori.get("c1")?.fatturatoTotale).toBe(1000);
    expect(valori.get("c2")?.fatturatoTotale).toBe(200);
  });
});

describe("probabilità suggerite", () => {
  it("crescono lungo le fasi aperte: una proposta inviata vale più di un primo contatto", () => {
    expect(PROBABILITA_SUGGERITA.contatto).toBeLessThan(PROBABILITA_SUGGERITA.qualificata);
    expect(PROBABILITA_SUGGERITA.qualificata).toBeLessThan(PROBABILITA_SUGGERITA.proposta);
  });

  it("le fasi chiuse sono certezze, non stime", () => {
    expect(PROBABILITA_SUGGERITA.vinta).toBe(100);
    expect(PROBABILITA_SUGGERITA.persa).toBe(0);
  });
});
