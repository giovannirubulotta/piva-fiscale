import type { RiepilogoAnno, Scadenza, ScadenzaBollo, Incasso } from "./types";
import { round2 } from "./calcolo";

/**
 * Sotto questa soglia l'acconto dell'imposta sostitutiva non è dovuto
 * (art. 1 DPR 615/1977, richiamato ogni anno dalle istruzioni Redditi PF).
 */
const SOGLIA_ESENZIONE_ACCONTO = 51.65;
/** Sotto questa soglia l'acconto va versato in un'unica soluzione entro giugno. */
const SOGLIA_RATA_UNICA_ACCONTO = 257.52;
/** Soglia oltre la quale il bollo virtuale cumulato va versato entro il trimestre, invece di essere riportato al successivo. */
const SOGLIA_BOLLO_TRIMESTRALE = 250;
const IMPORTO_BOLLO = 2;

function scadenzeSaldoEAcconto(
  riepilogoBase: RiepilogoAnno,
  tipo: "imposta" | "inps",
  annoVersamento: number
): Scadenza[] {
  const importoBase = tipo === "imposta" ? riepilogoBase.impostaSostitutiva : riepilogoBase.contributiInps;
  const anno = riepilogoBase.anno;
  const risultato: Scadenza[] = [];

  const codiceSaldo = tipo === "imposta" ? "1792" : "P10";
  const codiceAcconto1 = tipo === "imposta" ? "1790" : "P10";
  const codiceAcconto2 = tipo === "imposta" ? "1791" : "P10";
  const etichetta = tipo === "imposta" ? "imposta sostitutiva" : "contributi INPS Gestione Separata";

  // Saldo dell'anno chiuso, sempre dovuto se l'importo è positivo.
  if (importoBase > 0) {
    risultato.push({
      chiave: `${anno}-saldo-${tipo}`,
      tipo: tipo === "imposta" ? "saldo_imposta" : "saldo_inps",
      annoRiferimento: anno,
      dataScadenza: `${annoVersamento}-06-30`,
      importo: importoBase,
      codiceTributo: codiceSaldo,
      descrizione: `Saldo ${etichetta} ${anno}`,
    });
  }

  // Acconti per l'anno successivo, calcolati sul 100% dell'importo dell'anno chiuso
  // (metodo storico — un commercialista può proporre il metodo previsionale se conviene).
  // Nota: la soglia di esenzione/rata unica sotto è documentata per l'imposta sostitutiva;
  // per l'INPS Gestione Separata è applicata per coerenza ma andrebbe confermata caso per caso.
  if (importoBase >= SOGLIA_ESENZIONE_ACCONTO) {
    if (importoBase <= SOGLIA_RATA_UNICA_ACCONTO) {
      risultato.push({
        chiave: `${anno + 1}-acconto-unico-${tipo}`,
        tipo: tipo === "imposta" ? "acconto1_imposta" : "acconto1_inps",
        annoRiferimento: anno + 1,
        dataScadenza: `${annoVersamento}-06-30`,
        importo: importoBase,
        codiceTributo: codiceAcconto1,
        descrizione: `Acconto unico ${etichetta} ${anno + 1}`,
      });
    } else {
      const rata1 = round2(importoBase * 0.5);
      const rata2 = round2(importoBase - rata1);
      risultato.push({
        chiave: `${anno + 1}-acconto1-${tipo}`,
        tipo: tipo === "imposta" ? "acconto1_imposta" : "acconto1_inps",
        annoRiferimento: anno + 1,
        dataScadenza: `${annoVersamento}-06-30`,
        importo: rata1,
        codiceTributo: codiceAcconto1,
        descrizione: `1° acconto ${etichetta} ${anno + 1}`,
      });
      risultato.push({
        chiave: `${anno + 1}-acconto2-${tipo}`,
        tipo: tipo === "imposta" ? "acconto2_imposta" : "acconto2_inps",
        annoRiferimento: anno + 1,
        dataScadenza: `${annoVersamento}-11-30`,
        importo: rata2,
        codiceTributo: codiceAcconto2,
        descrizione: `2° acconto ${etichetta} ${anno + 1}`,
      });
    }
  }

  return risultato;
}

/**
 * Genera lo scadenzario di imposta sostitutiva e contributi INPS a partire
 * dai riepiloghi degli anni già chiusi. Ogni riepilogo di anno Y genera il
 * saldo (dovuto il 30/6 dell'anno Y+1) e gli acconti per l'anno Y+1.
 * Se non ci sono riepiloghi di anni precedenti (primo anno di attività),
 * non viene generata alcuna scadenza per l'anno corrente: è corretto,
 * non è un caso mancante.
 */
export function generaScadenzeAnnuali(riepiloghiAnniChiusi: RiepilogoAnno[]): Scadenza[] {
  const ordinati = [...riepiloghiAnniChiusi].sort((a, b) => a.anno - b.anno);
  const scadenze: Scadenza[] = [];
  for (const riepilogo of ordinati) {
    const annoVersamento = riepilogo.anno + 1;
    scadenze.push(...scadenzeSaldoEAcconto(riepilogo, "imposta", annoVersamento));
    scadenze.push(...scadenzeSaldoEAcconto(riepilogo, "inps", annoVersamento));
  }
  return scadenze.sort((a, b) => a.dataScadenza.localeCompare(b.dataScadenza));
}

function trimestreDiScadenza(mese: number): { trimestre: 1 | 2 | 3 | 4; scadenzaMM: string } {
  // Le fatture emesse in un trimestre generano un bollo la cui scadenza di
  // versamento cumulativo cade nel mese successivo alla chiusura trimestrale.
  if (mese <= 3) return { trimestre: 1, scadenzaMM: "05-31" };
  if (mese <= 6) return { trimestre: 2, scadenzaMM: "09-30" };
  if (mese <= 9) return { trimestre: 3, scadenzaMM: "11-30" };
  return { trimestre: 4, scadenzaMM: "02-28" };
}

/**
 * Bollo virtuale cumulato per trimestre sulle fatture senza IVA che lo
 * richiedono (fiscale_incassi.bollo_applicato = true). Sotto i 250 € il
 * versamento del trimestre può slittare al successivo: qui viene comunque
 * segnalato come dovuto nel trimestre di competenza per semplicità — è
 * un'approssimazione prudente, non un rinvio automatico.
 */
export function generaScadenzeBollo(incassi: Incasso[], anno: number): ScadenzaBollo[] {
  const conteggi = new Map<number, number>();
  for (const incasso of incassi) {
    if (!incasso.bolloApplicato) continue;
    const data = new Date(incasso.dataEmissione);
    if (data.getFullYear() !== anno) continue;
    const { trimestre } = trimestreDiScadenza(data.getMonth() + 1);
    conteggi.set(trimestre, (conteggi.get(trimestre) ?? 0) + IMPORTO_BOLLO);
  }

  const risultato: ScadenzaBollo[] = [];
  for (const [trimestre, importoDovuto] of conteggi.entries()) {
    const meseScadenza = trimestreDiScadenza(trimestre === 1 ? 1 : trimestre === 2 ? 4 : trimestre === 3 ? 7 : 10).scadenzaMM;
    const annoScadenza = trimestre === 4 ? anno + 1 : anno;
    risultato.push({
      chiave: `${anno}-bollo-t${trimestre}`,
      trimestre: trimestre as 1 | 2 | 3 | 4,
      anno,
      dataScadenza: `${annoScadenza}-${meseScadenza}`,
      importoDovuto: round2(importoDovuto),
      descrizione: `Bollo virtuale trimestre ${trimestre}/${anno}${importoDovuto < SOGLIA_BOLLO_TRIMESTRALE ? " (sotto 250 €, verifica se rinviabile al trimestre successivo)" : ""}`,
    });
  }
  return risultato.sort((a, b) => a.dataScadenza.localeCompare(b.dataScadenza));
}
