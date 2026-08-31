import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";
import type { EventoProprio } from "@/lib/domain/calendario";

/**
 * Gli eventi **propri** del calendario, cioè l'unica sorgente memorizzata.
 * Scadenze fiscali, fatture, canoni e preventivi non passano di qui: sono
 * derivati in `lib/domain/calendario.ts` dai dati che già esistono.
 */

function mappa(riga: Tables<"fiscale_eventi">): EventoProprio {
  return {
    id: riga.id,
    titolo: riga.titolo,
    descrizione: riga.descrizione,
    dataInizio: riga.data_inizio,
    dataFine: riga.data_fine,
    oraInizio: riga.ora_inizio,
    oraFine: riga.ora_fine,
    tuttoIlGiorno: riga.tutto_il_giorno,
    luogo: riga.luogo,
    tipo: riga.tipo as EventoProprio["tipo"],
    clienteId: riga.cliente_id,
    trattativaId: riga.trattativa_id,
  };
}

export async function leggiEventi(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<EventoProprio[]> {
  const { data, error } = await supabase
    .from("fiscale_eventi")
    .select("*")
    .eq("user_id", userId)
    .order("data_inizio", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mappa);
}

export interface NuovoEvento {
  titolo: string;
  descrizione: string | null;
  dataInizio: string;
  dataFine: string | null;
  oraInizio: string | null;
  oraFine: string | null;
  tuttoIlGiorno: boolean;
  luogo: string | null;
  tipo: EventoProprio["tipo"];
  clienteId: string | null;
  trattativaId: string | null;
}

export async function creaEvento(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: NuovoEvento
): Promise<void> {
  const { error } = await supabase.from("fiscale_eventi").insert({
    user_id: userId,
    titolo: dati.titolo,
    descrizione: dati.descrizione,
    data_inizio: dati.dataInizio,
    data_fine: dati.dataFine,
    ora_inizio: dati.oraInizio,
    ora_fine: dati.oraFine,
    tutto_il_giorno: dati.tuttoIlGiorno,
    luogo: dati.luogo,
    tipo: dati.tipo,
    cliente_id: dati.clienteId,
    trattativa_id: dati.trattativaId,
  });
  if (error) throw error;
}

export async function eliminaEvento(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase.from("fiscale_eventi").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}
