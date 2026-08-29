import type { Scadenza, ScadenzaBollo, TipoScadenza } from "./types";
import { round2 } from "./calcolo";

export type SezioneF24 = "erario" | "inps";

export interface RigaF24 {
  sezione: SezioneF24;
  codiceTributo: string;
  annoRiferimento: number;
  /**
   * Formato "NNRR" (rata corrente/rate totali), es. "0102" = prima di due
   * rate, "0202" = seconda di due, "0101" = rata unica. `null` quando il
   * tributo non prevede la compilazione di questo campo (bollo virtuale:
   * si versa sempre in un'unica soluzione per trimestre, campo lasciato in
   * bianco per istruzione esplicita dell'Agenzia delle Entrate).
   */
  rateazione: string | null;
  importo: number;
  descrizione: string;
  chiaveScadenza: string;
}

export interface ModuloF24 {
  dataScadenza: string;
  righe: RigaF24[];
  totale: number;
}

/**
 * Valore del campo "rateazione/regione/prov./mese rif." per una scadenza
 * annuale (imposta sostitutiva o INPS Gestione Separata). Segue la
 * convenzione generale NNRR degli acconti/saldi da modello F24: rata
 * corrente su due cifre, rate totali su due cifre. Verificata il 28/08/2026
 * su fonti indipendenti per i codici 1790/1791 (vedi DECISIONS.md); in caso
 * di dubbio o di rateazioni concorrenti con altri tributi, verifica sempre
 * il valore sul sito dell'Agenzia delle Entrate o con il tuo intermediario
 * prima dell'invio.
 */
function rateazioneScadenzaAnnuale(s: Scadenza): string | null {
  const perTipo: Record<TipoScadenza, string | null> = {
    saldo_imposta: "0101",
    saldo_inps: "0101",
    // L'acconto unico dell'imposta sostitutiva (sotto 257,52 €) ha comunque
    // tipo "acconto1_imposta": si distingue dal caso a due rate solo tramite
    // la chiave, che generaScadenzeAnnuali marca con "-acconto-unico-".
    acconto1_imposta: s.chiave.includes("acconto-unico") ? "0101" : "0102",
    acconto2_imposta: "0202",
    // L'acconto INPS è sempre in due rate uguali, mai in rata unica.
    acconto1_inps: "0102",
    acconto2_inps: "0202",
  };
  return perTipo[s.tipo];
}

function sezioneDiCodice(codiceTributo: string): SezioneF24 {
  return codiceTributo === "P10" ? "inps" : "erario";
}

/**
 * Raggruppa le scadenze annuali (imposta sostitutiva, INPS) e il bollo
 * virtuale in moduli F24 per data di versamento: ogni scadenza che cade
 * nello stesso giorno va compilata sullo stesso modello F24, in righe
 * distinte per sezione (Erario/INPS) e codice tributo. Riceve già solo le
 * scadenze non pagate: non filtra da sé lo stato di pagamento, che vive nel
 * livello dati (fiscale_scadenze_stato), non nel dominio.
 */
export function generaModuliF24(scadenzeAnnuali: Scadenza[], scadenzeBollo: ScadenzaBollo[]): ModuloF24[] {
  const perData = new Map<string, RigaF24[]>();

  const aggiungiRiga = (dataScadenza: string, riga: RigaF24) => {
    const righe = perData.get(dataScadenza) ?? [];
    righe.push(riga);
    perData.set(dataScadenza, righe);
  };

  for (const s of scadenzeAnnuali) {
    if (s.importo <= 0) continue;
    aggiungiRiga(s.dataScadenza, {
      sezione: sezioneDiCodice(s.codiceTributo),
      codiceTributo: s.codiceTributo,
      annoRiferimento: s.annoRiferimento,
      rateazione: rateazioneScadenzaAnnuale(s),
      importo: s.importo,
      descrizione: s.descrizione,
      chiaveScadenza: s.chiave,
    });
  }

  for (const b of scadenzeBollo) {
    if (b.importoDovuto <= 0) continue;
    aggiungiRiga(b.dataScadenza, {
      sezione: "erario",
      codiceTributo: b.codiceTributo,
      annoRiferimento: b.anno,
      rateazione: null,
      importo: b.importoDovuto,
      descrizione: b.descrizione,
      chiaveScadenza: b.chiave,
    });
  }

  const moduli: ModuloF24[] = [...perData.entries()].map(([dataScadenza, righe]) => ({
    dataScadenza,
    righe: righe.sort((a, b) =>
      a.sezione === b.sezione ? a.codiceTributo.localeCompare(b.codiceTributo) : a.sezione.localeCompare(b.sezione)
    ),
    totale: round2(righe.reduce((somma, r) => somma + r.importo, 0)),
  }));

  return moduli.sort((a, b) => a.dataScadenza.localeCompare(b.dataScadenza));
}
