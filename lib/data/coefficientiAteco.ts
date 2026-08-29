import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CoefficienteAteco } from "@/lib/domain/types";
import { mappaCoefficienteAteco } from "./mappers";

/**
 * Tabella di riferimento statica (non per-utente): non cambia da profilo a
 * profilo, quindi non richiede `userId`. Sola lettura dall'app — la
 * modifica avviene solo tramite migrazione, per tenere sotto controllo di
 * versione l'origine normativa dei coefficienti (vedi DECISIONS.md).
 */
export async function leggiCoefficientiAteco(supabase: SupabaseClient<Database>): Promise<CoefficienteAteco[]> {
  const { data, error } = await supabase.from("fiscale_coefficienti_ateco").select("*");
  if (error) throw error;
  return (data ?? []).map(mappaCoefficienteAteco);
}
