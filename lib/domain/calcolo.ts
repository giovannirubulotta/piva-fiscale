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

export function calcolaRiepilogoAnno(
  anno: number,
  incassi: Incasso[],
  profilo: ProfiloFiscale,
  aliquote: AliquoteAnno
): RiepilogoAnno {
  const fatturatoIncassato = fatturatoIncassatoAnno(incassi, anno);
  const imponibile = calcolaImponibile(fatturatoIncassato, profilo.coefficienteRedditivita);
  const aliquotaSostitutivaApplicata = determinaAliquotaSostitutiva(profilo, aliquote);
  const impostaSostitutiva = round2(imponibile * aliquotaSostitutivaApplicata);
  const contributiInps = round2(imponibile * aliquote.aliquotaInps);
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
