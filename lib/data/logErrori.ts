import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Severita } from "@/lib/osservabilita/log";

export interface VoceLog {
  id: string;
  severita: Severita;
  contesto: string;
  messaggio: string;
  dettaglio: string | null;
  stack: string | null;
  quando: string;
}

export async function leggiLogErrori(
  supabase: SupabaseClient<Database>,
  userId: string,
  limite = 100
): Promise<VoceLog[]> {
  const { data, error } = await supabase
    .from("fiscale_log_errori")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    severita: row.severita as Severita,
    contesto: row.contesto,
    messaggio: row.messaggio,
    dettaglio: row.dettaglio,
    stack: row.stack,
    quando: row.created_at,
  }));
}

/** Quanti errori nelle ultime 24 ore: la soglia che fa comparire l'avviso in dashboard. */
export async function contaErroriRecenti(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const ieri = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("fiscale_log_errori")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("severita", "avviso")
    .gte("created_at", ieri);
  if (error) throw error;
  return count ?? 0;
}
