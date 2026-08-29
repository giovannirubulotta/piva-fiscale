import type { ProfiloFiscale, RiepilogoAnno } from "./types";
import { round2 } from "./calcolo";

export interface RigoLm {
  codice: string;
  etichetta: string;
  valore: number;
  unita: "euro" | "percentuale";
  nota?: string;
  /**
   * true quando il valore riportato dall'app è una stima o un proxy che
   * andrebbe confrontato con un dato che l'app non conosce con certezza
   * (es. contributi realmente versati per cassa, acconti realmente
   * accreditati): non un errore, ma un punto da controllare prima di
   * trascrivere il valore in dichiarazione.
   */
  daVerificare?: boolean;
}

export interface Attestazioni {
  codiceAteco: string;
  aliquotaApplicata: number;
  nuovaAttivitaAgevolata: boolean;
}

export interface QuadroLm {
  anno: number;
  attestazioni: Attestazioni;
  righi: RigoLm[];
}

/**
 * Mappa il riepilogo dell'anno (già calcolato dal dominio) sui righi della
 * sezione del Quadro LM dedicata al regime forfettario nel modello Redditi
 * PF (art. 1 commi 54-89 L. 190/2014). Numerazione dei righi (LM21, LM22-27,
 * LM34-39, LM40-42, LM43-44, LM45, LM46-47, LM49) verificata il 28/08/2026 su
 * più fonti indipendenti concordanti (vedi DECISIONS.md) — l'etichetta di
 * sezione ("II" o "III") non è invece riportata qui perché le stesse fonti
 * sono discordanti su questo singolo dettaglio dopo l'abolizione, dal
 * modello Redditi PF 2025, della precedente sezione "Tassa piatta
 * incrementale": verifica il numero di sezione sulle istruzioni ufficiali
 * del modello dell'anno di presentazione.
 *
 * Questa funzione gestisce solo il caso di una singola attività (un solo
 * codice ATECO, un solo coefficiente) e assume nessuna perdita pregressa,
 * nessun credito d'imposta, nessuna ritenuta e nessuna eccedenza da anni
 * precedenti: sono tutti scenari che l'app non traccia. Dove l'app non ha
 * il dato reale (contributi versati per cassa, acconti realmente versati)
 * usa il proprio valore calcolato per competenza come proxy e lo marca
 * `daVerificare`.
 */
export function generaQuadroLm(
  riepilogo: RiepilogoAnno,
  profilo: ProfiloFiscale & { codiceAteco: string },
  accontiVersatiTotale: number
): QuadroLm {
  const lm34 = riepilogo.imponibile;
  // I contributi deducibili trovano capienza solo fino al reddito lordo:
  // l'eventuale eccedenza (LM49) non genera un reddito negativo, ma resta
  // deducibile dal reddito complessivo IRPEF (quadro RN) — non da questa
  // imposta sostitutiva.
  const lm35 = Math.min(riepilogo.contributiInps, lm34);
  const lm49 = round2(Math.max(0, riepilogo.contributiInps - lm34));
  const lm36 = round2(lm34 - lm35);
  const lm37 = 0; // perdite pregresse: non tracciate dall'app
  const lm38 = round2(Math.max(0, lm36 - lm37));
  const lm39 = round2(lm38 * riepilogo.aliquotaSostitutivaApplicata);
  const lm40 = 0; // crediti d'imposta: non tracciati dall'app
  const lm41 = 0; // ritenute: non tracciate dall'app
  const lm42 = round2(lm39 - lm40 - lm41);
  const lm43 = 0; // eccedenze anno precedente: non tracciate dall'app
  const lm45 = accontiVersatiTotale;
  const differenza = round2(lm42 - lm43 - lm45);
  const lm46 = differenza > 0 ? differenza : 0;
  const lm47 = differenza < 0 ? round2(-differenza) : 0;

  const righi: RigoLm[] = [
    {
      codice: "LM22-27",
      etichetta: "Ricavi/compensi incassati nell'anno",
      valore: riepilogo.fatturatoIncassato,
      unita: "euro",
      nota: "Principio di cassa: solo gli incassi effettivi dell'anno, non le fatture emesse.",
    },
    {
      codice: "LM22-27",
      etichetta: "Coefficiente di redditività applicato",
      valore: round2(profilo.coefficienteRedditivita * 100),
      unita: "percentuale",
    },
    {
      codice: "LM34",
      etichetta: "Reddito forfettario lordo",
      valore: lm34,
      unita: "euro",
      nota: "Ricavi × coefficiente di redditività.",
    },
    {
      codice: "LM35",
      etichetta: "Contributi previdenziali dedotti",
      valore: lm35,
      unita: "euro",
      nota: "L'app usa i contributi INPS calcolati per competenza come proxy: in dichiarazione va indicato l'importo realmente versato nell'anno (per cassa), che può differire.",
      daVerificare: true,
    },
    { codice: "LM36", etichetta: "Reddito netto", valore: lm36, unita: "euro" },
    {
      codice: "LM37",
      etichetta: "Perdite pregresse",
      valore: lm37,
      unita: "euro",
      nota: "Non tracciate dall'app: se ne hai, verificale con il commercialista prima di lasciare questo rigo a zero.",
    },
    { codice: "LM38", etichetta: "Base imponibile netta", valore: lm38, unita: "euro" },
    {
      codice: "LM39",
      etichetta: `Imposta sostitutiva (${(riepilogo.aliquotaSostitutivaApplicata * 100).toFixed(0)}%)`,
      valore: lm39,
      unita: "euro",
    },
    {
      codice: "LM40-41",
      etichetta: "Crediti d'imposta e ritenute",
      valore: round2(lm40 + lm41),
      unita: "euro",
      nota: "Non tracciati dall'app: se hai ritenute subite o crediti d'imposta, aggiungili prima di trascrivere il rigo.",
    },
    { codice: "LM42", etichetta: "Imposta al netto di crediti e ritenute", valore: lm42, unita: "euro" },
    {
      codice: "LM43-44",
      etichetta: "Eccedenze da anni precedenti",
      valore: lm43,
      unita: "euro",
      nota: "Non tracciate dall'app.",
    },
    {
      codice: "LM45",
      etichetta: "Acconti versati (codici 1790 e 1791)",
      valore: lm45,
      unita: "euro",
      nota: "Somma degli acconti che hai segnato come pagati nello scadenzario per quest'anno: verifica che corrisponda a quanto realmente versato con F24.",
      daVerificare: true,
    },
    {
      codice: "LM46",
      etichetta: "Saldo a debito (codice 1792)",
      valore: lm46,
      unita: "euro",
    },
    {
      codice: "LM47",
      etichetta: "Saldo a credito",
      valore: lm47,
      unita: "euro",
    },
    ...(lm49 > 0
      ? [
          {
            codice: "LM49",
            etichetta: "Contributi eccedenti non capienti nel reddito forfettario",
            valore: lm49,
            unita: "euro" as const,
            nota: "Non deducibili da questa imposta sostitutiva: restano deducibili dal reddito complessivo IRPEF (quadro RN), se presente.",
          },
        ]
      : []),
  ];

  return {
    anno: riepilogo.anno,
    attestazioni: {
      codiceAteco: profilo.codiceAteco,
      aliquotaApplicata: riepilogo.aliquotaSostitutivaApplicata,
      nuovaAttivitaAgevolata: riepilogo.aliquotaSostitutivaApplicata < 0.15,
    },
    righi,
  };
}
