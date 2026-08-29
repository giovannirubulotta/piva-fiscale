import type { AliquoteAnno, Incasso, ProfiloFiscale, RiepilogoAnno } from "./types";

/** Arrotondamento a 2 decimali, evitando i classici errori di floating point. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Somma gli incassi realmente incassati in un anno solare (tassazione per
 * cassa: le fatture emesse ma non ancora incassate non concorrono al reddito).
 */
export function fatturatoIncassatoAnno(incassi: Incasso[], anno: number): number {
  const totale = incassi
    .filter((i) => i.stato === "incassata" && i.dataIncasso && new Date(i.dataIncasso).getFullYear() === anno)
    .reduce((sum, i) => sum + i.importoNetto, 0);
  return round2(totale);
}

export function calcolaImponibile(fatturatoIncassato: number, coefficienteRedditivita: number): number {
  if (fatturatoIncassato < 0) {
    throw new Error("Il fatturato incassato non può essere negativo");
  }
  if (coefficienteRedditivita <= 0 || coefficienteRedditivita > 1) {
    throw new Error("Il coefficiente di redditività deve essere compreso tra 0 e 1");
  }
  return round2(fatturatoIncassato * coefficienteRedditivita);
}

/**
 * Determina l'aliquota dell'imposta sostitutiva da applicare.
 * Se il diritto al 5% non è ancora stato verificato (null), si applica
 * per prudenza il 15% standard: è la scelta che minimizza il rischio di
 * un conguaglio in caso di verifica successiva del commercialista.
 */
export function determinaAliquotaSostitutiva(profilo: ProfiloFiscale, aliquote: AliquoteAnno): number {
  if (profilo.agevolazione5Percento === true) {
    return aliquote.aliquotaSostitutivaAgevolata;
  }
  return aliquote.aliquotaSostitutivaStandard;
}

/** Restituisce le aliquote dell'anno richiesto, o quelle dell'anno più recente disponibile come fallback prudente. */
export function aliquoteAnno(tutte: AliquoteAnno[], anno: number): AliquoteAnno | null {
  const esatte = tutte.find((a) => a.anno === anno);
  if (esatte) return esatte;
  const piuRecenti = [...tutte].sort((a, b) => b.anno - a.anno)[0];
  return piuRecenti ?? null;
}

export function primoAnnoAttivita(profilo: ProfiloFiscale, anno: number): boolean {
  if (!profilo.dataApertura) return false;
  return new Date(profilo.dataApertura).getFullYear() === anno;
}

/**
 * L'imposta sostitutiva si applica al reddito forfettario NETTO dei
 * contributi previdenziali obbligatori, non al reddito lordo: art. 1 comma
 * 64 L. 190/2014 — "il reddito [...] è ridotto dei contributi previdenziali
 * dovuti per legge" — prima di applicare l'aliquota del 15%/5%. Corregge un
 * difetto per cui l'imposta sostitutiva era calcolata sul reddito lordo,
 * sovrastimando sistematicamente l'imposta dovuta di un importo pari
 * all'aliquota sostitutiva applicata ai contributi INPS dell'anno; verificato
 * il 28/08/2026 su più fonti indipendenti (vedi DECISIONS.md). Come per
 * LM36/LM49 nel Quadro LM, la base non può scendere sotto zero: l'eventuale
 * eccedenza di contributi non capiente nel reddito forfettario non genera
 * un'imposta sostitutiva negativa.
 *
 * Approssimazione nota: qui si deducono i contributi INPS calcolati per
 * competenza sul reddito dell'anno stesso, non quelli realmente versati per
 * cassa nell'anno (che possono riferirsi in parte all'anno precedente, per
 * effetto del meccanismo di acconto/saldo) — coerente con il resto
 * dell'app, che tratta `contributiInps` come stima per competenza, e
 * segnalata come tale nel Quadro LM (rigo LM35).
 */
export function calcolaRiepilogoAnno(
  anno: number,
  incassi: Incasso[],
  profilo: ProfiloFiscale,
  aliquote: AliquoteAnno
): RiepilogoAnno {
  const fatturatoIncassato = fatturatoIncassatoAnno(incassi, anno);
  const imponibile = calcolaImponibile(fatturatoIncassato, profilo.coefficienteRedditivita);
  const aliquotaSostitutivaApplicata = determinaAliquotaSostitutiva(profilo, aliquote);
  const contributiInps = round2(imponibile * aliquote.aliquotaInps);
  const baseImponibileSostitutiva = round2(Math.max(0, imponibile - contributiInps));
  const impostaSostitutiva = round2(baseImponibileSostitutiva * aliquotaSostitutivaApplicata);
  const totaleDovuto = round2(impostaSostitutiva + contributiInps);
  const nettoStimato = round2(fatturatoIncassato - totaleDovuto);

  return {
    anno,
    fatturatoIncassato,
    imponibile,
    aliquotaSostitutivaApplicata,
    impostaSostitutiva,
    contributiInps,
    totaleDovuto,
    nettoStimato,
    primoAnno: primoAnnoAttivita(profilo, anno),
  };
}
