import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";
import type { Nota } from "@/lib/domain/nota";

function mappa(riga: Tables<"fiscale_note">): Nota {
  return {
    id: riga.id,
    titolo: riga.titolo,
    testo: riga.testo,
    clienteId: riga.cliente_id,
    trattativaId: riga.trattativa_id,
    fissata: riga.fissata,
    etichette: riga.etichette ?? [],
    creataIl: riga.created_at,
    aggiornataIl: riga.updated_at,
  };
}

export async function leggiNote(supabase: SupabaseClient<Database>, userId: string): Promise<Nota[]> {
  const { data, error } = await supabase
    .from("fiscale_note")
    .select("*")
    .eq("user_id", userId)
    .order("fissata", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mappa);
}

export async function leggiNotaSingola(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<Nota | null> {
  const { data, error } = await supabase
    .from("fiscale_note")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mappa(data) : null;
}

/** Le note di un cliente, comprese quelle attaccate a una sua trattativa. */
export async function leggiNoteDiCliente(
  supabase: SupabaseClient<Database>,
  userId: string,
  clienteId: string
): Promise<Nota[]> {
  const { data, error } = await supabase
    .from("fiscale_note")
    .select("*")
    .eq("user_id", userId)
    .eq("cliente_id", clienteId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mappa);
}

export interface NuovaNota {
  titolo: string | null;
  testo: string;
  clienteId: string | null;
  trattativaId: string | null;
  etichette: string[];
}

export async function creaNota(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: NuovaNota
): Promise<string> {
  const { data, error } = await supabase
    .from("fiscale_note")
    .insert({
      user_id: userId,
      titolo: dati.titolo,
      testo: dati.testo,
      cliente_id: dati.clienteId,
      trattativa_id: dati.trattativaId,
      etichette: dati.etichette,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function aggiornaNota(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  dati: NuovaNota
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_note")
    .update({
      titolo: dati.titolo,
      testo: dati.testo,
      cliente_id: dati.clienteId,
      trattativa_id: dati.trattativaId,
      etichette: dati.etichette,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

/**
 * Fissare non tocca `updated_at`: appuntare una nota in cima non è
 * modificarla, e se lo fosse la nota salterebbe anche in testa
 * all'ordinamento per data, spostando tutto il resto.
 */
export async function cambiaFissaggio(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  fissata: boolean
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_note")
    .update({ fissata })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

export async function eliminaNota(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase.from("fiscale_note").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}
