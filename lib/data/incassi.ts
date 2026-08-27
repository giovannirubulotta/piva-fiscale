import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Incasso } from "@/lib/domain/types";
import { mappaIncasso, type IncassoCompleto } from "./mappers";

export async function leggiIncassi(supabase: SupabaseClient<Database>, userId: string): Promise<IncassoCompleto[]> {
  const { data, error } = await supabase
    .from("fiscale_incassi")
    .select("*")
    .eq("user_id", userId)
    .order("data_emissione", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mappaIncasso);
}

export interface NuovoIncasso {
  numeroFattura: string | null;
  cliente: string;
  descrizione: string | null;
  dataEmissione: string;
  dataIncasso: string | null;
  importoNetto: number;
  bolloApplicato: boolean;
  stato: Incasso["stato"];
}

export async function creaIncasso(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: NuovoIncasso
): Promise<void> {
  const { error } = await supabase.from("fiscale_incassi").insert({
    user_id: userId,
    numero_fattura: dati.numeroFattura,
    cliente: dati.cliente,
    descrizione: dati.descrizione,
    data_emissione: dati.dataEmissione,
    data_incasso: dati.dataIncasso,
    importo_netto: dati.importoNetto,
    bollo_applicato: dati.bolloApplicato,
    stato: dati.stato,
  });
  if (error) throw error;
}

export async function aggiornaStatoIncasso(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  dati: { stato: Incasso["stato"]; dataIncasso: string | null }
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_incassi")
    .update({ stato: dati.stato, data_incasso: dati.dataIncasso })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function eliminaIncasso(supabase: SupabaseClient<Database>, userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("fiscale_incassi").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
