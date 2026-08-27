import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface Spesa {
  id: string;
  data: string;
  descrizione: string;
  categoria: string | null;
  importo: number;
}

export async function leggiSpese(supabase: SupabaseClient<Database>, userId: string): Promise<Spesa[]> {
  const { data, error } = await supabase
    .from("fiscale_spese")
    .select("*")
    .eq("user_id", userId)
    .order("data", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    data: r.data,
    descrizione: r.descrizione,
    categoria: r.categoria,
    importo: Number(r.importo),
  }));
}

export interface NuovaSpesa {
  data: string;
  descrizione: string;
  categoria: string | null;
  importo: number;
}

export async function creaSpesa(supabase: SupabaseClient<Database>, userId: string, dati: NuovaSpesa): Promise<void> {
  const { error } = await supabase.from("fiscale_spese").insert({
    user_id: userId,
    data: dati.data,
    descrizione: dati.descrizione,
    categoria: dati.categoria,
    importo: dati.importo,
  });
  if (error) throw error;
}

export async function eliminaSpesa(supabase: SupabaseClient<Database>, userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("fiscale_spese").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
