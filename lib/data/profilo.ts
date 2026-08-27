import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ProfiloFiscale } from "@/lib/domain/types";
import { mappaProfilo } from "./mappers";

export interface ProfiloCompleto extends ProfiloFiscale {
  partitaIva: string | null;
  codiceAteco: string;
}

export async function leggiProfilo(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ProfiloCompleto | null> {
  const { data, error } = await supabase.from("fiscale_profilo").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...mappaProfilo(data),
    partitaIva: data.partita_iva,
    codiceAteco: data.codice_ateco,
  };
}

export interface DatiProfiloModificabili {
  partitaIva: string | null;
  codiceAteco: string;
  coefficienteRedditivita: number;
  dataApertura: string | null;
  agevolazione5Percento: boolean | null;
  note?: string | null;
}

export async function salvaProfilo(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: DatiProfiloModificabili
): Promise<void> {
  const { error } = await supabase.from("fiscale_profilo").upsert({
    user_id: userId,
    partita_iva: dati.partitaIva,
    codice_ateco: dati.codiceAteco,
    coefficiente_redditivita: dati.coefficienteRedditivita,
    data_apertura: dati.dataApertura,
    agevolazione_5_percento: dati.agevolazione5Percento,
    note: dati.note ?? null,
  });
  if (error) throw error;
}
