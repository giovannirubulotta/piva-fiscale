import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CreditoDisponibile, TipologiaCredito } from "@/lib/domain/types";
import { mappaCreditoDisponibile } from "./mappers";

export async function leggiCreditiDisponibili(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CreditoDisponibile[]> {
  const { data, error } = await supabase
    .from("fiscale_crediti_disponibili")
    .select("*")
    .eq("user_id", userId)
    .order("anno_maturazione", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mappaCreditoDisponibile);
}

export interface NuovoCredito {
  tipologia: TipologiaCredito;
  annoMaturazione: number;
  importo: number;
  note: string | null;
}

export async function creaCredito(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: NuovoCredito
): Promise<void> {
  const { error } = await supabase.from("fiscale_crediti_disponibili").insert({
    user_id: userId,
    tipologia: dati.tipologia,
    anno_maturazione: dati.annoMaturazione,
    importo: dati.importo,
    note: dati.note,
  });
  if (error) throw error;
}

export async function segnaCreditoUtilizzato(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  annoUtilizzo: number
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_crediti_disponibili")
    .update({
      utilizzato: true,
      anno_utilizzo: annoUtilizzo,
      data_utilizzo: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function segnaCreditoNonUtilizzato(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_crediti_disponibili")
    .update({
      utilizzato: false,
      anno_utilizzo: null,
      data_utilizzo: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function eliminaCredito(supabase: SupabaseClient<Database>, userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("fiscale_crediti_disponibili").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
