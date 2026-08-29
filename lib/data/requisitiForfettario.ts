import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { RequisitiForfettario } from "@/lib/domain/types";
import { mappaRequisitiForfettario } from "./mappers";

export async function leggiRequisitiForfettario(
  supabase: SupabaseClient<Database>,
  userId: string,
  anno: number
): Promise<RequisitiForfettario | null> {
  const { data, error } = await supabase
    .from("fiscale_requisiti_forfettario")
    .select("*")
    .eq("user_id", userId)
    .eq("anno", anno)
    .maybeSingle();
  if (error) throw error;
  return data ? mappaRequisitiForfettario(data) : null;
}

export async function salvaRequisitiForfettario(
  supabase: SupabaseClient<Database>,
  userId: string,
  requisiti: RequisitiForfettario
): Promise<void> {
  const { error } = await supabase.from("fiscale_requisiti_forfettario").upsert(
    {
      user_id: userId,
      anno: requisiti.anno,
      reddito_lavoro_dipendente_oltre_soglia: requisiti.redditoLavoroDipendenteOltreSoglia,
      partecipazioni_societa_riconducibili: requisiti.partecipazioniSocietaRiconducibili,
      committente_prevalente_ex_datore: requisiti.committentePrevalenteExDatore,
      residenza_fuori_ue_see: requisiti.residenzaFuoriUeSee,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,anno" }
  );
  if (error) throw error;
}
