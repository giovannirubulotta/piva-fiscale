import type { Tables } from "@/lib/supabase/database.types";
import type { AliquoteAnno, Incasso, ProfiloFiscale } from "@/lib/domain/types";

/** Superset di Incasso con i campi anagrafici usati solo dalla UI, non dal calcolo. */
export interface IncassoCompleto extends Incasso {
  cliente: string;
  numeroFattura: string | null;
  descrizione: string | null;
}

export function mappaProfilo(row: Tables<"fiscale_profilo">): ProfiloFiscale {
  return {
    coefficienteRedditivita: Number(row.coefficiente_redditivita),
    dataApertura: row.data_apertura,
    agevolazione5Percento: row.agevolazione_5_percento,
  };
}

export function mappaAliquote(row: Tables<"fiscale_aliquote">): AliquoteAnno {
  return {
    anno: row.anno,
    aliquotaSostitutivaStandard: Number(row.aliquota_sostitutiva_standard),
    aliquotaSostitutivaAgevolata: Number(row.aliquota_sostitutiva_agevolata),
    aliquotaInps: Number(row.aliquota_inps_gestione_separata),
    massimaleInps: Number(row.massimale_inps),
    minimaleInps: Number(row.minimale_inps),
  };
}

export function mappaIncasso(row: Tables<"fiscale_incassi">): IncassoCompleto {
  return {
    id: row.id,
    dataEmissione: row.data_emissione,
    dataIncasso: row.data_incasso,
    importoNetto: Number(row.importo_netto),
    bolloApplicato: row.bollo_applicato,
    stato: row.stato as Incasso["stato"],
    cliente: row.cliente,
    numeroFattura: row.numero_fattura,
    descrizione: row.descrizione,
  };
}
