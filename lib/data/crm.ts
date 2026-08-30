import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";
import type { Attivita, FaseTrattativa, TipoAttivita, Trattativa } from "@/lib/domain/crm";

/**
 * Accesso a trattative e attività. Come per il resto di `lib/data`, il client
 * autenticato arriva da fuori: qui non si sa nulla del contesto di richiesta.
 *
 * Le colonne `fase` e `tipo` sono `text` con un vincolo di controllo sul
 * database, non un enum Postgres: aggiungere un valore a un enum richiede una
 * migrazione con lock sulla tabella, mentre qui basta cambiare il `check`. Il
 * cast al tipo TypeScript avviene in un punto solo, nei mapper qui sotto, che
 * è anche il confine dove un valore inatteso andrebbe intercettato.
 */

function mappaTrattativa(riga: Tables<"fiscale_trattative">): Trattativa {
  return {
    id: riga.id,
    clienteId: riga.cliente_id,
    titolo: riga.titolo,
    fase: riga.fase as FaseTrattativa,
    valoreStimato: Number(riga.valore_stimato),
    probabilita: riga.probabilita,
    dataPrevista: riga.data_prevista,
    dataChiusura: riga.data_chiusura,
    motivoChiusura: riga.motivo_chiusura,
    note: riga.note,
    aggiornataIl: riga.updated_at,
  };
}

function mappaAttivita(riga: Tables<"fiscale_attivita">): Attivita {
  return {
    id: riga.id,
    clienteId: riga.cliente_id,
    trattativaId: riga.trattativa_id,
    tipo: riga.tipo as TipoAttivita,
    data: riga.data,
    testo: riga.testo,
    prossimoPasso: riga.prossimo_passo,
    dataProssimoPasso: riga.data_prossimo_passo,
    fatto: riga.fatto,
  };
}

export async function leggiTrattative(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Trattativa[]> {
  const { data, error } = await supabase
    .from("fiscale_trattative")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mappaTrattativa);
}

export async function leggiTrattativeDiCliente(
  supabase: SupabaseClient<Database>,
  userId: string,
  clienteId: string
): Promise<Trattativa[]> {
  const { data, error } = await supabase
    .from("fiscale_trattative")
    .select("*")
    .eq("user_id", userId)
    .eq("cliente_id", clienteId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mappaTrattativa);
}

export async function leggiAttivita(supabase: SupabaseClient<Database>, userId: string): Promise<Attivita[]> {
  const { data, error } = await supabase
    .from("fiscale_attivita")
    .select("*")
    .eq("user_id", userId)
    .order("data", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mappaAttivita);
}

export async function leggiAttivitaDiCliente(
  supabase: SupabaseClient<Database>,
  userId: string,
  clienteId: string
): Promise<Attivita[]> {
  const { data, error } = await supabase
    .from("fiscale_attivita")
    .select("*")
    .eq("user_id", userId)
    .eq("cliente_id", clienteId)
    .order("data", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mappaAttivita);
}

export interface NuovaTrattativa {
  clienteId: string;
  titolo: string;
  fase: FaseTrattativa;
  valoreStimato: number;
  probabilita: number;
  dataPrevista: string | null;
  note: string | null;
}

export async function creaTrattativa(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: NuovaTrattativa
): Promise<void> {
  const chiusa = dati.fase === "vinta" || dati.fase === "persa";
  const { error } = await supabase.from("fiscale_trattative").insert({
    user_id: userId,
    cliente_id: dati.clienteId,
    titolo: dati.titolo,
    fase: dati.fase,
    valore_stimato: dati.valoreStimato,
    probabilita: dati.probabilita,
    data_prevista: dati.dataPrevista,
    // Il vincolo sul database esige coerenza tra fase e data di chiusura: la si
    // rispetta qui invece di lasciare che l'insert fallisca con un messaggio
    // che l'utente non può interpretare.
    data_chiusura: chiusa ? new Date().toISOString().slice(0, 10) : null,
    note: dati.note,
  });
  if (error) throw error;
}

export async function cambiaFaseTrattativa(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  fase: FaseTrattativa,
  motivo: string | null = null
): Promise<void> {
  const chiusa = fase === "vinta" || fase === "persa";
  const { error } = await supabase
    .from("fiscale_trattative")
    .update({
      fase,
      data_chiusura: chiusa ? new Date().toISOString().slice(0, 10) : null,
      motivo_chiusura: chiusa ? motivo : null,
    })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

export async function eliminaTrattativa(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase.from("fiscale_trattative").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

export interface NuovaAttivita {
  clienteId: string;
  trattativaId: string | null;
  tipo: TipoAttivita;
  data: string;
  testo: string;
  prossimoPasso: string | null;
  dataProssimoPasso: string | null;
}

export async function creaAttivita(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: NuovaAttivita
): Promise<void> {
  const { error } = await supabase.from("fiscale_attivita").insert({
    user_id: userId,
    cliente_id: dati.clienteId,
    trattativa_id: dati.trattativaId,
    tipo: dati.tipo,
    data: dati.data,
    testo: dati.testo,
    prossimo_passo: dati.prossimoPasso,
    data_prossimo_passo: dati.dataProssimoPasso,
  });
  if (error) throw error;
}

export async function segnaPassoFatto(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_attivita")
    .update({ fatto: true })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}
