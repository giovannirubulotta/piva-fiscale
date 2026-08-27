import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AliquoteAnno } from "@/lib/domain/types";
import { mappaAliquote } from "./mappers";

export async function leggiAliquote(supabase: SupabaseClient<Database>): Promise<AliquoteAnno[]> {
  const { data, error } = await supabase.from("fiscale_aliquote").select("*").order("anno", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mappaAliquote);
}

export async function salvaAliquote(supabase: SupabaseClient<Database>, aliquote: AliquoteAnno): Promise<void> {
  const { error } = await supabase.from("fiscale_aliquote").upsert({
    anno: aliquote.anno,
    aliquota_sostitutiva_standard: aliquote.aliquotaSostitutivaStandard,
    aliquota_sostitutiva_agevolata: aliquote.aliquotaSostitutivaAgevolata,
    aliquota_inps_gestione_separata: aliquote.aliquotaInps,
    massimale_inps: aliquote.massimaleInps,
    minimale_inps: aliquote.minimaleInps,
  });
  if (error) throw error;
}
