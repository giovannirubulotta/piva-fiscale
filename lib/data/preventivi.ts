import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Preventivo, StatoPreventivo } from "@/lib/domain/preventivo";

/**
 * Accesso ai preventivi. Segue le stesse convenzioni di `fatture.ts`: il client
 * autenticato arriva da fuori, e le righe si leggono insieme al documento
 * perché un preventivo senza righe non è mai qualcosa che si vuole mostrare.
 */

type RigaGrezza = Database["public"]["Tables"]["fiscale_preventivo_righe"]["Row"];
type PreventivoGrezzo = Database["public"]["Tables"]["fiscale_preventivi"]["Row"] & {
  fiscale_preventivo_righe: RigaGrezza[] | null;
};

function mappa(riga: PreventivoGrezzo): Preventivo {
  return {
    id: riga.id,
    clienteId: riga.cliente_id,
    anno: riga.anno,
    progressivo: riga.progressivo,
    dataEmissione: riga.data_emissione,
    validoFinoAl: riga.valido_fino_al,
    stato: riga.stato as StatoPreventivo,
    fatturaId: riga.fattura_id,
    oggetto: riga.oggetto,
    condizioni: riga.condizioni,
    note: riga.note,
    righe: (riga.fiscale_preventivo_righe ?? [])
      .map((r) => ({
        id: r.id,
        numeroLinea: r.numero_linea,
        descrizione: r.descrizione,
        quantita: Number(r.quantita),
        unitaMisura: r.unita_misura,
        prezzoUnitario: Number(r.prezzo_unitario),
      }))
      .sort((a, b) => a.numeroLinea - b.numeroLinea),
  };
}

const SELEZIONE = "*, fiscale_preventivo_righe(*)";

export async function leggiPreventivi(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Preventivo[]> {
  const { data, error } = await supabase
    .from("fiscale_preventivi")
    .select(SELEZIONE)
    .eq("user_id", userId)
    .order("anno", { ascending: false })
    .order("progressivo", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((riga) => mappa(riga as PreventivoGrezzo));
}

export async function leggiPreventivo(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<Preventivo | null> {
  const { data, error } = await supabase
    .from("fiscale_preventivi")
    .select(SELEZIONE)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mappa(data as PreventivoGrezzo) : null;
}

/** Il prossimo numero libero dell'anno. Serie separata da quella delle fatture. */
export async function prossimoProgressivoPreventivo(
  supabase: SupabaseClient<Database>,
  userId: string,
  anno: number
): Promise<number> {
  const { data, error } = await supabase
    .from("fiscale_preventivi")
    .select("progressivo")
    .eq("user_id", userId)
    .eq("anno", anno)
    .order("progressivo", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.progressivo ?? 0) + 1;
}

export interface NuovaRigaPreventivo {
  descrizione: string;
  quantita: number;
  unitaMisura: string | null;
  prezzoUnitario: number;
}

export interface NuovoPreventivo {
  clienteId: string;
  anno: number;
  progressivo: number;
  dataEmissione: string;
  validoFinoAl: string;
  stato: StatoPreventivo;
  oggetto: string | null;
  condizioni: string | null;
  note: string | null;
  righe: NuovaRigaPreventivo[];
}

export async function creaPreventivo(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: NuovoPreventivo
): Promise<string> {
  const { data, error } = await supabase
    .from("fiscale_preventivi")
    .insert({
      user_id: userId,
      cliente_id: dati.clienteId,
      anno: dati.anno,
      progressivo: dati.progressivo,
      data_emissione: dati.dataEmissione,
      valido_fino_al: dati.validoFinoAl,
      stato: dati.stato,
      oggetto: dati.oggetto,
      condizioni: dati.condizioni,
      note: dati.note,
    })
    .select("id")
    .single();
  if (error) throw error;

  const righe = dati.righe.map((riga, indice) => ({
    preventivo_id: data.id,
    user_id: userId,
    numero_linea: indice + 1,
    descrizione: riga.descrizione,
    quantita: riga.quantita,
    unita_misura: riga.unitaMisura,
    prezzo_unitario: riga.prezzoUnitario,
  }));

  const inserimento = await supabase.from("fiscale_preventivo_righe").insert(righe);
  if (inserimento.error) {
    // Stessa scelta delle fatture: senza righe il documento non ha importo, e
    // un preventivo a zero è peggio di un preventivo mancante.
    await supabase.from("fiscale_preventivi").delete().eq("id", data.id).eq("user_id", userId);
    throw inserimento.error;
  }
  return data.id;
}

export async function cambiaStatoPreventivo(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  stato: StatoPreventivo
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_preventivi")
    .update({ stato })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

/** Registra la fattura nata da questo preventivo, così non se ne generi una seconda. */
export async function collegaFattura(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  fatturaId: string
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_preventivi")
    .update({ fattura_id: fatturaId })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

export async function eliminaPreventivo(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase.from("fiscale_preventivi").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}
