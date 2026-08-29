import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { LavoroDipendente } from "@/lib/domain/types";
import { mappaLavoroDipendente } from "./mappers";

export async function leggiLavoroDipendente(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<LavoroDipendente[]> {
  const { data, error } = await supabase
    .from("fiscale_lavoro_dipendente")
    .select("*")
    .eq("user_id", userId)
    .order("anno", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mappaLavoroDipendente);
}

export interface NuovoLavoroDipendente {
  anno: number;
  datoreLavoro: string | null;
  redditoImponibile: number;
  ritenuteIrpef: number;
  addizionaleRegionale: number;
  addizionaleComunale: number;
  note: string | null;
}

export async function creaLavoroDipendente(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: NuovoLavoroDipendente
): Promise<void> {
  const { error } = await supabase.from("fiscale_lavoro_dipendente").insert({
    user_id: userId,
    anno: dati.anno,
    datore_lavoro: dati.datoreLavoro,
    reddito_imponibile: dati.redditoImponibile,
    ritenute_irpef: dati.ritenuteIrpef,
    addizionale_regionale: dati.addizionaleRegionale,
    addizionale_comunale: dati.addizionaleComunale,
    note: dati.note,
  });
  if (error) throw error;
}

export async function eliminaLavoroDipendente(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase.from("fiscale_lavoro_dipendente").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
