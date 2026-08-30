import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";

/**
 * Il listino delle prestazioni ricorrenti.
 *
 * Le voci si **disattivano**, non si eliminano: una prestazione che non offri
 * più resta comunque citata nelle fatture già emesse, e un elenco storico con
 * dei buchi è peggio di un elenco lungo. L'eliminazione vera esiste comunque,
 * per le voci create per sbaglio.
 */

export interface VoceListino {
  id: string;
  descrizione: string;
  prezzoUnitario: number;
  unitaMisura: string | null;
  categoria: string | null;
  attivo: boolean;
  note: string | null;
}

function mappa(riga: Tables<"fiscale_listino">): VoceListino {
  return {
    id: riga.id,
    descrizione: riga.descrizione,
    prezzoUnitario: Number(riga.prezzo_unitario),
    unitaMisura: riga.unita_misura,
    categoria: riga.categoria,
    attivo: riga.attivo,
    note: riga.note,
  };
}

export async function leggiListino(
  supabase: SupabaseClient<Database>,
  userId: string,
  soloAttive = false
): Promise<VoceListino[]> {
  let query = supabase.from("fiscale_listino").select("*").eq("user_id", userId);
  if (soloAttive) query = query.eq("attivo", true);

  const { data, error } = await query.order("categoria", { ascending: true }).order("descrizione", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mappa);
}

export interface NuovaVoceListino {
  descrizione: string;
  prezzoUnitario: number;
  unitaMisura: string | null;
  categoria: string | null;
  note: string | null;
}

export async function creaVoceListino(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: NuovaVoceListino
): Promise<void> {
  const { error } = await supabase.from("fiscale_listino").insert({
    user_id: userId,
    descrizione: dati.descrizione,
    prezzo_unitario: dati.prezzoUnitario,
    unita_misura: dati.unitaMisura,
    categoria: dati.categoria,
    note: dati.note,
  });
  if (error) throw error;
}

export async function cambiaAttivazioneVoce(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  attivo: boolean
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_listino")
    .update({ attivo })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

export async function eliminaVoceListino(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase.from("fiscale_listino").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}
