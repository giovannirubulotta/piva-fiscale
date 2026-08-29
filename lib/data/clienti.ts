import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Cliente } from "@/lib/domain/types";
import { mappaCliente } from "./mappers";

export async function leggiClienti(supabase: SupabaseClient<Database>, userId: string): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from("fiscale_clienti")
    .select("*")
    .eq("user_id", userId)
    .order("denominazione", { ascending: true, nullsFirst: false })
    .order("cognome", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map(mappaCliente);
}

export async function leggiCliente(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from("fiscale_clienti")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mappaCliente(data) : null;
}

export type DatiCliente = Omit<Cliente, "id">;

export async function creaCliente(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: DatiCliente
): Promise<string> {
  const { data, error } = await supabase
    .from("fiscale_clienti")
    .insert({ user_id: userId, ...verso(dati) })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function aggiornaCliente(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  dati: DatiCliente
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_clienti")
    .update({ ...verso(dati), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function eliminaCliente(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase.from("fiscale_clienti").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

/** Traduzione camelCase → snake_case, unico punto in cui i due vocabolari si toccano. */
function verso(dati: DatiCliente) {
  return {
    tipologia: dati.tipologia,
    denominazione: dati.denominazione,
    nome: dati.nome,
    cognome: dati.cognome,
    codice_fiscale: dati.codiceFiscale,
    partita_iva: dati.partitaIva,
    id_paese: dati.idPaese,
    indirizzo: dati.indirizzo,
    numero_civico: dati.numeroCivico,
    cap: dati.cap,
    comune: dati.comune,
    provincia: dati.provincia,
    nazione: dati.nazione,
    codice_destinatario: dati.codiceDestinatario,
    pec_destinatario: dati.pecDestinatario,
    email: dati.email,
    telefono: dati.telefono,
    note: dati.note,
  };
}
