import { describe, it, expect } from "vitest";
import {
  round2,
  fatturatoIncassatoAnno,
  calcolaImponibile,
  determinaAliquotaSostitutiva,
  primoAnnoAttivita,
  calcolaRiepilogoAnno,
  aliquoteAnno,
} from "./calcolo";
import type { AliquoteAnno, Incasso, ProfiloFiscale } from "./types";

const aliquote2026: AliquoteAnno = {
  anno: 2026,
  aliquotaSostitutivaStandard: 0.15,
  aliquotaSostitutivaAgevolata: 0.05,
  aliquotaInps: 0.2607,
  massimaleInps: 122295,
  minimaleInps: 18808,
};

const profiloBase: ProfiloFiscale = {
  coefficienteRedditivita: 0.78,
  dataApertura: "2026-07-31",
  agevolazione5Percento: null,
};

function incasso(overrides: Partial<Incasso>): Incasso {
  return {
    id: crypto.randomUUID(),
    dataEmissione: "2026-08-01",
    dataIncasso: "2026-08-10",
    importoNetto: 1000,
    bolloApplicato: false,
    stato: "incassata",
    ...overrides,
  };
}

describe("round2", () => {
  it("arrotonda correttamente evitando errori di floating point", () => {
    expect(round2(7800 * 0.2607)).toBe(2033.46);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});

describe("fatturatoIncassatoAnno", () => {
  it("somma solo gli incassi effettivamente incassati nell'anno", () => {
    const incassi = [
      incasso({ importoNetto: 1000, dataIncasso: "2026-03-01", stato: "incassata" }),
      incasso({ importoNetto: 500, dataIncasso: "2027-01-05", stato: "incassata" }), // altro anno
      incasso({ importoNetto: 2000, dataIncasso: null, stato: "da_incassare" }), // non incassata
      incasso({ importoNetto: 300, dataIncasso: "2026-09-01", stato: "annullata" }), // annullata
    ];
    expect(fatturatoIncassatoAnno(incassi, 2026)).toBe(1000);
  });

  it("restituisce 0 se non ci sono incassi", () => {
    expect(fatturatoIncassatoAnno([], 2026)).toBe(0);
  });
});

describe("calcolaImponibile", () => {
  it("applica il coefficiente di redditività", () => {
    expect(calcolaImponibile(10000, 0.78)).toBe(7800);
  });

  it("rifiuta un fatturato negativo", () => {
    expect(() => calcolaImponibile(-1, 0.78)).toThrow();
  });

  it("rifiuta un coefficiente fuori range", () => {
    expect(() => calcolaImponibile(1000, 1.2)).toThrow();
    expect(() => calcolaImponibile(1000, 0)).toThrow();
  });
});

describe("determinaAliquotaSostitutiva", () => {
  it("usa il 15% per prudenza quando l'agevolazione non è verificata", () => {
    expect(determinaAliquotaSostitutiva(profiloBase, aliquote2026)).toBe(0.15);
  });

  it("usa il 5% solo se esplicitamente confermato", () => {
    const profilo: ProfiloFiscale = { ...profiloBase, agevolazione5Percento: true };
    expect(determinaAliquotaSostitutiva(profilo, aliquote2026)).toBe(0.05);
  });

  it("usa il 15% se esplicitamente escluso", () => {
    const profilo: ProfiloFiscale = { ...profiloBase, agevolazione5Percento: false };
    expect(determinaAliquotaSostitutiva(profilo, aliquote2026)).toBe(0.15);
  });
});

describe("primoAnnoAttivita", () => {
  it("riconosce l'anno di apertura", () => {
    expect(primoAnnoAttivita(profiloBase, 2026)).toBe(true);
    expect(primoAnnoAttivita(profiloBase, 2027)).toBe(false);
  });
});

describe("aliquoteAnno", () => {
  const aliquote2027: AliquoteAnno = { ...aliquote2026, anno: 2027, aliquotaSostitutivaStandard: 0.16 };

  it("restituisce l'anno esatto se presente", () => {
    expect(aliquoteAnno([aliquote2026, aliquote2027], 2026)?.aliquotaSostitutivaStandard).toBe(0.15);
  });

  it("usa l'anno più recente come fallback prudente se l'anno richiesto manca", () => {
    expect(aliquoteAnno([aliquote2026, aliquote2027], 2030)?.anno).toBe(2027);
  });

  it("restituisce null se non c'è alcuna aliquota disponibile", () => {
    expect(aliquoteAnno([], 2026)).toBeNull();
  });
});

describe("calcolaRiepilogoAnno", () => {
  it("calcola il riepilogo su un caso concreto (10.000 € incassati, 15%)", () => {
    const incassi = [incasso({ importoNetto: 10000, dataIncasso: "2026-08-15" })];
    const riepilogo = calcolaRiepilogoAnno(2026, incassi, profiloBase, aliquote2026);

    expect(riepilogo.fatturatoIncassato).toBe(10000);
    expect(riepilogo.imponibile).toBe(7800);
    expect(riepilogo.impostaSostitutiva).toBe(1170); // 7800 * 0.15
    expect(riepilogo.contributiInps).toBe(2033.46); // 7800 * 0.2607
    expect(riepilogo.totaleDovuto).toBe(3203.46);
    expect(riepilogo.nettoStimato).toBe(6796.54);
    expect(riepilogo.primoAnno).toBe(true);
  });

  it("calcola il riepilogo con l'aliquota agevolata al 5%", () => {
    const incassi = [incasso({ importoNetto: 10000, dataIncasso: "2026-08-15" })];
    const profilo: ProfiloFiscale = { ...profiloBase, agevolazione5Percento: true };
    const riepilogo = calcolaRiepilogoAnno(2026, incassi, profilo, aliquote2026);

    expect(riepilogo.impostaSostitutiva).toBe(390); // 7800 * 0.05
    expect(riepilogo.totaleDovuto).toBe(2423.46);
  });

  it("restituisce zero su un anno senza incassi", () => {
    const riepilogo = calcolaRiepilogoAnno(2026, [], profiloBase, aliquote2026);
    expect(riepilogo.fatturatoIncassato).toBe(0);
    expect(riepilogo.totaleDovuto).toBe(0);
  });
});
