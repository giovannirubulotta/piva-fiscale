import type { AliquoteAnno, Incasso, ProfiloFiscale, RiepilogoAnno } from "./types";
import { aliquoteAnno, calcolaRiepilogoAnno, fatturatoIncassatoAnno } from "./calcolo";

/**
 * Ricostruisce il riepilogo di ogni anno solare già chiuso (precedente
 * all'anno corrente) in cui risultano incassi, usando le aliquote in
 * vigore in quell'anno. Serve da base per generare lo scadenzario.
 */
export function riepiloghiAnniChiusi(
  incassi: Incasso[],
  profilo: ProfiloFiscale,
  tutteLeAliquote: AliquoteAnno[],
  annoCorrente: number
): RiepilogoAnno[] {
  const anniConIncassi = new Set<number>();
  for (const i of incassi) {
    if (i.stato === "incassata" && i.dataIncasso) {
      anniConIncassi.add(new Date(i.dataIncasso).getFullYear());
    }
  }

  const risultato: RiepilogoAnno[] = [];
  for (const anno of anniConIncassi) {
    if (anno >= annoCorrente) continue;
    if (fatturatoIncassatoAnno(incassi, anno) <= 0) continue;
    const aliquote = aliquoteAnno(tutteLeAliquote, anno);
    if (!aliquote) continue;
    risultato.push(calcolaRiepilogoAnno(anno, incassi, profilo, aliquote));
  }

  return risultato.sort((a, b) => a.anno - b.anno);
}
