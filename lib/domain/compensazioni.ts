import type { CreditoDisponibile, RiepilogoCompensazione, TipologiaCredito } from "./types";
import { round2 } from "./calcolo";

/**
 * Soglia oltre la quale la compensazione orizzontale in F24 di crediti relativi
 * a imposte dirette (IRPEF e addizionali, imposte sostitutive del reddito,
 * IRAP, ritenute alla fonte) richiede il visto di conformità di un
 * intermediario abilitato — dottore commercialista, consulente del lavoro,
 * CAF, revisore legale. Sotto questa soglia la compensazione è libera; sopra,
 * il contribuente non può attestare da sé la correttezza del credito, per
 * legge, indipendentemente da quanto sia informato: non è un limite di
 * competenza, è un atto riservato a un soggetto iscritto a un albo.
 *
 * Riferimento art. 1 c. 574 L. 147/2013 (come modificato); soglia (5.000 €
 * annui per singola tipologia di credito) verificata il 28/08/2026 su fonti
 * indipendenti concordanti (vedi DECISIONS.md).
 */
export const SOGLIA_VISTO_CONFORMITA = 5000;

/**
 * Tipologie esplicitamente elencate dalle fonti verificate come soggette alla
 * soglia del visto di conformità. I contributi INPS seguono regole di
 * compensazione proprie, non incluse in quell'elenco: tracciati comunque come
 * tipologia di credito a sé, ma senza applicare qui una soglia non verificata.
 */
const TIPOLOGIE_SOGGETTE_A_VISTO: ReadonlySet<TipologiaCredito> = new Set(["irpef", "imposta_sostitutiva", "irap"]);

/**
 * Raggruppa i crediti già segnati come utilizzati per tipologia e anno di
 * utilizzo, e valuta per ciascun gruppo se supera la soglia del visto di
 * conformità. Un credito non ancora utilizzato non entra in nessun gruppo:
 * la soglia si valuta su quanto è stato effettivamente compensato in un dato
 * anno, non su quanto è semplicemente disponibile.
 */
export function riepilogoCompensazioni(crediti: CreditoDisponibile[]): RiepilogoCompensazione[] {
  const totali = new Map<string, { tipologia: TipologiaCredito; anno: number; totale: number }>();

  for (const credito of crediti) {
    if (!credito.utilizzato || credito.annoUtilizzo === null) continue;
    const chiave = `${credito.tipologia}-${credito.annoUtilizzo}`;
    const voce = totali.get(chiave) ?? { tipologia: credito.tipologia, anno: credito.annoUtilizzo, totale: 0 };
    voce.totale = round2(voce.totale + credito.importo);
    totali.set(chiave, voce);
  }

  return [...totali.values()]
    .map((v) => ({
      tipologia: v.tipologia,
      anno: v.anno,
      totaleUtilizzato: v.totale,
      richiedeVistoConformita: TIPOLOGIE_SOGGETTE_A_VISTO.has(v.tipologia) && v.totale > SOGLIA_VISTO_CONFORMITA,
    }))
    .sort((a, b) => (a.anno === b.anno ? a.tipologia.localeCompare(b.tipologia) : a.anno - b.anno));
}

/** Somma dei crediti non ancora utilizzati: quanto resta disponibile da compensare. */
export function saldoDisponibile(crediti: CreditoDisponibile[]): number {
  return round2(crediti.filter((c) => !c.utilizzato).reduce((somma, c) => somma + c.importo, 0));
}
