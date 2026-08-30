import { riepilogoDaFatturato, round2 } from "./calcolo";
import { totaleDocumento } from "./fattura";
import { valutaSoglieForfettario } from "./requisitiForfettario";
import type {
  AliquoteAnno,
  Fattura,
  Incasso,
  ProfiloFiscale,
  RiepilogoAnno,
  ValutazioneSoglieForfettario,
} from "./types";

/**
 * Previsione di chiusura dell'anno: quanto si finirà per incassare, e quindi
 * quanto andrà accantonato, se le cose proseguono come stanno andando.
 *
 * Serve a rispondere alla domanda che un forfettario si fa a metà anno — "sto
 * mettendo via abbastanza?" — mesi prima che il saldo di giugno la renda
 * retorica. Il regime tassa per cassa e paga in un'unica rata a fine periodo:
 * senza una proiezione, l'unico segnale disponibile è l'estratto conto, che
 * arriva tardi.
 *
 * Due scenari, non uno. Un numero solo verrebbe letto come una previsione
 * affidabile, che non è: la differenza tra i due estremi è essa stessa
 * l'informazione utile.
 *
 * - **Prudente** — solo ciò che è già certo o quasi: l'incassato più le fatture
 *   già emesse e non ancora pagate. Non presume nessun nuovo lavoro. È il
 *   pavimento: sotto questa cifra si finisce solo se qualcuno non paga.
 * - **Al ritmo attuale** — l'incassato proiettato sui giorni che restano.
 *   Presume che il resto dell'anno somigli alla parte già trascorsa.
 *
 * Nessuno dei due è "la" previsione, e il modulo non ne elegge uno: la
 * decisione di quanto accantonare la prende chi legge, sapendo quale ipotesi
 * sta comprando.
 */

export type ChiaveScenario = "prudente" | "ritmo";

export interface ScenarioPrevisione {
  chiave: ChiaveScenario;
  /** Frase che dichiara l'ipotesi: senza, un numero previsionale sembra un dato. */
  ipotesi: string;
  fatturatoPrevisto: number;
  riepilogo: RiepilogoAnno;
  soglie: ValutazioneSoglieForfettario;
}

export interface Previsione {
  anno: number;
  /** Giorni di attività già trascorsi nell'anno: la base su cui si proietta. */
  giorniTrascorsi: number;
  giorniDaProiettare: number;
  incassatoAdOggi: number;
  /** Fatture emesse e non ancora incassate, al netto delle note di credito. */
  emessoDaIncassare: number;
  scenari: ScenarioPrevisione[];
  /**
   * true quando la proiezione è troppo acerba per dire qualcosa: pochi giorni
   * di attività trasformano un incasso singolo in una proiezione enorme.
   */
  troppoPrestoPerProiettare: boolean;
}

/** Soglia sotto la quale il ritmo non è un ritmo ma un caso isolato. */
export const GIORNI_MINIMI_PER_PROIEZIONE = 45;

function giorniNellAnno(anno: number): number {
  return (anno % 4 === 0 && anno % 100 !== 0) || anno % 400 === 0 ? 366 : 365;
}

function giornoDellAnno(data: Date): number {
  const inizio = Date.UTC(data.getUTCFullYear(), 0, 1);
  const oggi = Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
  return Math.floor((oggi - inizio) / 86_400_000) + 1;
}

/**
 * Fatture emesse e non ancora incassate. Le note di credito (TD04) sottraggono:
 * sono importi che non entreranno mai.
 */
export function emessoDaIncassare(fatture: Fattura[]): number {
  const totale = fatture
    .filter((f) => f.stato === "emessa")
    .reduce((somma, f) => somma + (f.tipoDocumento === "TD04" ? -totaleDocumento(f) : totaleDocumento(f)), 0);
  return round2(Math.max(0, totale));
}

/**
 * @param oggi data di riferimento, iniettata invece che letta dall'orologio:
 *   una funzione che legge `new Date()` da sé non è verificabile.
 */
export function calcolaPrevisione(
  anno: number,
  incassi: Incasso[],
  fatture: Fattura[],
  profilo: ProfiloFiscale,
  aliquote: AliquoteAnno,
  oggi: Date
): Previsione {
  const incassatoAdOggi = round2(
    incassi
      .filter((i) => i.stato === "incassata" && i.dataIncasso && i.dataIncasso.slice(0, 4) === String(anno))
      .reduce((somma, i) => somma + i.importoNetto, 0)
  );
  const daIncassare = emessoDaIncassare(fatture);

  const totaleGiorni = giorniNellAnno(anno);
  // L'anno di apertura non si proietta dal 1° gennaio: dividere l'incassato per
  // giorni in cui la partita IVA non esisteva ancora sottostima il ritmo di un
  // fattore pari ai mesi di inattività.
  const aperturaNellAnno =
    profilo.dataApertura && profilo.dataApertura.slice(0, 4) === String(anno)
      ? giornoDellAnno(new Date(`${profilo.dataApertura}T00:00:00Z`))
      : 1;
  const giornoCorrente =
    oggi.getUTCFullYear() === anno ? giornoDellAnno(oggi) : oggi.getUTCFullYear() > anno ? totaleGiorni : 0;

  const giorniTrascorsi = Math.max(0, giornoCorrente - aperturaNellAnno + 1);
  const giorniDaProiettare = Math.max(0, totaleGiorni - giornoCorrente);

  const prudente = round2(incassatoAdOggi + daIncassare);
  const troppoPresto = giorniTrascorsi < GIORNI_MINIMI_PER_PROIEZIONE;

  // Il ritmo non può prevedere meno di quanto è già certo: sarebbe uno scenario
  // in cui il lavoro già fatturato smette di esistere.
  const proiezioneRitmo = troppoPresto
    ? prudente
    : round2(Math.max(prudente, (incassatoAdOggi / giorniTrascorsi) * (giorniTrascorsi + giorniDaProiettare)));

  const scenario = (chiave: ChiaveScenario, ipotesi: string, fatturato: number): ScenarioPrevisione => ({
    chiave,
    ipotesi,
    fatturatoPrevisto: fatturato,
    riepilogo: riepilogoDaFatturato(anno, fatturato, profilo, aliquote),
    soglie: valutaSoglieForfettario(fatturato),
  });

  return {
    anno,
    giorniTrascorsi,
    giorniDaProiettare,
    incassatoAdOggi,
    emessoDaIncassare: daIncassare,
    troppoPrestoPerProiettare: troppoPresto,
    scenari: [
      scenario(
        "prudente",
        daIncassare > 0
          ? "Nessun nuovo lavoro: solo l'incassato e le fatture già emesse."
          : "Nessun nuovo lavoro: solo quanto già incassato.",
        prudente
      ),
      scenario(
        "ritmo",
        troppoPresto
          ? `Servono almeno ${GIORNI_MINIMI_PER_PROIEZIONE} giorni di attività prima che un ritmo significhi qualcosa.`
          : `I prossimi ${giorniDaProiettare} giorni somigliano ai ${giorniTrascorsi} già trascorsi.`,
        proiezioneRitmo
      ),
    ],
  };
}

/**
 * Quanto manca da accantonare, dato ciò che si è già messo da parte.
 * Negativo significa che l'accantonamento è in eccesso, e va detto: un utente
 * che ha messo via troppo sta rinunciando a liquidità senza motivo.
 */
export function daAccantonareAncora(previsione: Previsione, giaAccantonato: number): number {
  const prudente = previsione.scenari.find((s) => s.chiave === "prudente");
  if (!prudente) return 0;
  return round2(prudente.riepilogo.totaleDovuto - giaAccantonato);
}
