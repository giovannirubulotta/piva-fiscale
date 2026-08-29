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

function scadenzaSaldo(riepilogoBase: RiepilogoAnno, tipo: "imposta" | "inps", annoVersamento: number): Scadenza | null {
  const importoBase = tipo === "imposta" ? riepilogoBase.impostaSostitutiva : riepilogoBase.contributiInps;
  if (importoBase <= 0) return null;
  const anno = riepilogoBase.anno;
  const etichetta = tipo === "imposta" ? "imposta sostitutiva" : "contributi INPS Gestione Separata";

  return {
    chiave: `${anno}-saldo-${tipo}`,
    tipo: tipo === "imposta" ? "saldo_imposta" : "saldo_inps",
    annoRiferimento: anno,
    dataScadenza: `${annoVersamento}-06-30`,
    importo: importoBase,
    codiceTributo: tipo === "imposta" ? "1792" : "P10",
    descrizione: `Saldo ${etichetta} ${anno}`,
  };
}

/**
 * Acconto dell'imposta sostitutiva: sotto 51,65 € non è dovuto; sotto 257,52 €
 * si versa in un'unica soluzione (codice 1790) entro il 30/6; sopra, in due
 * rate — 40% entro il 30/6 (codice 1790) e 60% entro il 30/11 (codice 1791).
 * Regola generale degli acconti sulle imposte dirette (art. 17 c. 3 DPR
 * 435/2001), applicabile anche all'imposta sostitutiva forfettaria; verificata
 * il 28/08/2026 come tuttora vigente da Circolare Agenzia Entrate 9/E del
 * 2/5/2024 e da fonti indipendenti (vedi DECISIONS.md).
 */
function scadenzeAccontoImposta(riepilogoBase: RiepilogoAnno, annoVersamento: number): Scadenza[] {
  const importoBase = riepilogoBase.impostaSostitutiva;
  const anno = riepilogoBase.anno;
  if (importoBase < SOGLIA_ESENZIONE_ACCONTO) return [];

  if (importoBase <= SOGLIA_RATA_UNICA_ACCONTO) {
    return [
      {
        chiave: `${anno + 1}-acconto-unico-imposta`,
        tipo: "acconto1_imposta",
        annoRiferimento: anno + 1,
        dataScadenza: `${annoVersamento}-06-30`,
        importo: importoBase,
        codiceTributo: "1790",
        descrizione: `Acconto unico imposta sostitutiva ${anno + 1}`,
      },
    ];
  }

  const rata1 = round2(importoBase * 0.4);
  const rata2 = round2(importoBase - rata1);
  return [
    {
      chiave: `${anno + 1}-acconto1-imposta`,
      tipo: "acconto1_imposta",
      annoRiferimento: anno + 1,
      dataScadenza: `${annoVersamento}-06-30`,
      importo: rata1,
      codiceTributo: "1790",
      descrizione: `1° acconto (40%) imposta sostitutiva ${anno + 1}`,
    },
    {
      chiave: `${anno + 1}-acconto2-imposta`,
      tipo: "acconto2_imposta",
      annoRiferimento: anno + 1,
      dataScadenza: `${annoVersamento}-11-30`,
      importo: rata2,
      codiceTributo: "1791",
      descrizione: `2° acconto (60%) imposta sostitutiva ${anno + 1}`,
    },
  ];
}

/**
 * Acconto dei contributi INPS Gestione Separata: pari all'80% del saldo
 * dell'anno chiuso, sempre in due rate UGUALI del 40% ciascuna (30/6 e
 * 30/11) — a differenza dell'imposta sostitutiva, non esiste qui né una
 * soglia di esenzione né una soglia di rata unica. Regola confermata su due
 * fonti indipendenti il 28/08/2026 (vedi DECISIONS.md); corregge
 * un'approssimazione precedente che applicava per coerenza le stesse soglie
 * e la stessa ripartizione dell'imposta sostitutiva.
 */
function scadenzeAccontoInps(riepilogoBase: RiepilogoAnno, annoVersamento: number): Scadenza[] {
  const importoBase = riepilogoBase.contributiInps;
  const anno = riepilogoBase.anno;
  const rata = round2(importoBase * 0.4);
  if (rata <= 0) return [];

  return [
    {
      chiave: `${anno + 1}-acconto1-inps`,
      tipo: "acconto1_inps",
      annoRiferimento: anno + 1,
      dataScadenza: `${annoVersamento}-06-30`,
      importo: rata,
      codiceTributo: "P10",
      descrizione: `1° acconto (40%) contributi INPS Gestione Separata ${anno + 1}`,
    },
    {
      chiave: `${anno + 1}-acconto2-inps`,
      tipo: "acconto2_inps",
      annoRiferimento: anno + 1,
      dataScadenza: `${annoVersamento}-11-30`,
      importo: rata,
      codiceTributo: "P10",
      descrizione: `2° acconto (40%) contributi INPS Gestione Separata ${anno + 1}`,
    },
  ];
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
    const saldoImposta = scadenzaSaldo(riepilogo, "imposta", annoVersamento);
    const saldoInps = scadenzaSaldo(riepilogo, "inps", annoVersamento);
    if (saldoImposta) scadenze.push(saldoImposta);
    if (saldoInps) scadenze.push(saldoInps);
    scadenze.push(...scadenzeAccontoImposta(riepilogo, annoVersamento));
    scadenze.push(...scadenzeAccontoInps(riepilogo, annoVersamento));
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
 * Codice tributo del bollo virtuale sulle fatture elettroniche, per trimestre
 * di emissione: 2521 (T1), 2522 (T2), 2523 (T3), 2524 (T4) — sezione Erario
 * del modello F24, campo rateazione da lasciare in bianco (l'imposta si versa
 * sempre in un'unica soluzione per trimestre). Verificato il 28/08/2026 sulle
 * istruzioni di compilazione dell'Agenzia delle Entrate per il codice 2521 e
 * fonti indipendenti (vedi DECISIONS.md).
 */
function codiceTributoBollo(trimestre: 1 | 2 | 3 | 4): string {
  return `252${trimestre}`;
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
      codiceTributo: codiceTributoBollo(trimestre as 1 | 2 | 3 | 4),
      descrizione: `Bollo virtuale trimestre ${trimestre}/${anno}${importoDovuto < SOGLIA_BOLLO_TRIMESTRALE ? " (sotto 250 €, verifica se rinviabile al trimestre successivo)" : ""}`,
    });
  }
  return risultato.sort((a, b) => a.dataScadenza.localeCompare(b.dataScadenza));
}
