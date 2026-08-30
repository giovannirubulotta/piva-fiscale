import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Allegati: metadati su Postgres, contenuto su Supabase Storage.
 *
 * Il bucket `fiscale-allegati` è privato. I file non si servono mai da un URL
 * pubblico: si genera un link firmato a scadenza breve, richiesto al momento del
 * click. Un URL permanente su un documento fiscale è un documento fiscale
 * pubblicato.
 */

export const BUCKET_ALLEGATI = "fiscale-allegati";

/** Deve restare allineato al `file_size_limit` del bucket: là è vincolante, qui serve a dirlo prima. */
export const DIMENSIONE_MASSIMA_BYTE = 10 * 1024 * 1024;

export const TIPI_AMMESSI = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "text/xml",
  "application/xml",
  "text/csv",
  "text/plain",
] as const;

export interface Allegato {
  id: string;
  fatturaId: string | null;
  spesaId: string | null;
  nomeFile: string;
  percorso: string;
  tipoMime: string | null;
  dimensioneByte: number | null;
  descrizione: string | null;
  caricatoIl: string;
}

function mappa(riga: Database["public"]["Tables"]["fiscale_allegati"]["Row"]): Allegato {
  return {
    id: riga.id,
    fatturaId: riga.fattura_id,
    spesaId: riga.spesa_id,
    nomeFile: riga.nome_file,
    percorso: riga.percorso,
    tipoMime: riga.tipo_mime,
    dimensioneByte: riga.dimensione_byte,
    descrizione: riga.descrizione,
    caricatoIl: riga.caricato_il,
  };
}

export async function leggiAllegati(supabase: SupabaseClient<Database>, userId: string): Promise<Allegato[]> {
  const { data, error } = await supabase
    .from("fiscale_allegati")
    .select("*")
    .eq("user_id", userId)
    .order("caricato_il", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mappa);
}

export async function leggiAllegatiDiFattura(
  supabase: SupabaseClient<Database>,
  userId: string,
  fatturaId: string
): Promise<Allegato[]> {
  const { data, error } = await supabase
    .from("fiscale_allegati")
    .select("*")
    .eq("user_id", userId)
    .eq("fattura_id", fatturaId)
    .order("caricato_il", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mappa);
}

export async function leggiAllegato(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<Allegato | null> {
  const { data, error } = await supabase
    .from("fiscale_allegati")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mappa(data) : null;
}

export interface NuovoAllegato {
  file: File;
  descrizione: string | null;
  fatturaId: string | null;
  spesaId: string | null;
}

/**
 * Carica il file e registra la riga.
 *
 * L'ordine conta: prima lo Storage, poi Postgres. Se la riga fallisse dopo un
 * caricamento riuscito resterebbe un oggetto senza riferimento — invisibile
 * nell'interfaccia ma pagato — e per questo l'oggetto viene rimosso subito.
 * L'ordine inverso lascerebbe invece una riga che punta a un file inesistente,
 * cioè un errore visibile all'utente ogni volta che ci clicca sopra.
 *
 * Il percorso comincia con l'id dell'utente perché è la chiave su cui si
 * appoggiano le policy dello Storage: cambiarlo qui significa perdere
 * l'isolamento, non solo riordinare le cartelle.
 */
export async function caricaAllegato(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: NuovoAllegato
): Promise<void> {
  const { file } = dati;

  if (file.size === 0) throw new Error("Il file è vuoto.");
  if (file.size > DIMENSIONE_MASSIMA_BYTE) {
    throw new Error(`Il file supera i ${Math.round(DIMENSIONE_MASSIMA_BYTE / 1024 / 1024)} MB.`);
  }

  const percorso = `${userId}/${crypto.randomUUID()}${estensione(file.name)}`;

  const { error: erroreStorage } = await supabase.storage
    .from(BUCKET_ALLEGATI)
    .upload(percorso, file, { contentType: file.type || undefined, upsert: false });
  if (erroreStorage) throw erroreStorage;

  const { error: erroreRiga } = await supabase.from("fiscale_allegati").insert({
    user_id: userId,
    fattura_id: dati.fatturaId,
    spesa_id: dati.spesaId,
    nome_file: file.name,
    percorso,
    tipo_mime: file.type || null,
    dimensione_byte: file.size,
    descrizione: dati.descrizione,
  });

  if (erroreRiga) {
    await supabase.storage.from(BUCKET_ALLEGATI).remove([percorso]);
    throw erroreRiga;
  }
}

/**
 * Elimina prima la riga e poi l'oggetto: se il secondo passo fallisce resta un
 * file orfano nel bucket, che costa spazio ma non è raggiungibile da nessuno.
 * L'ordine inverso lascerebbe una riga che punta al vuoto, cioè un errore in
 * faccia all'utente. Tra i due guasti possibili si sceglie quello silenzioso e
 * innocuo invece di quello rumoroso e inutile.
 */
export async function eliminaAllegato(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<void> {
  const allegato = await leggiAllegato(supabase, userId, id);
  if (!allegato) return;

  const { error } = await supabase.from("fiscale_allegati").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;

  await supabase.storage.from(BUCKET_ALLEGATI).remove([allegato.percorso]);
}

/**
 * Link firmato a scadenza breve. Sessanta secondi bastano per un download e non
 * bastano per essere inoltrati e riusati: il link finisce nella cronologia del
 * browser, e un documento fiscale non deve restare raggiungibile da lì.
 */
export async function urlFirmato(
  supabase: SupabaseClient<Database>,
  allegato: Allegato,
  secondi = 60
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_ALLEGATI)
    .createSignedUrl(allegato.percorso, secondi, { download: allegato.nomeFile });
  if (error) throw error;
  return data.signedUrl;
}

function estensione(nome: string): string {
  const punto = nome.lastIndexOf(".");
  if (punto <= 0 || punto === nome.length - 1) return "";
  // Solo caratteri innocui: l'estensione finisce dentro il percorso dello
  // Storage, e un nome file arriva dall'utente.
  const grezza = nome.slice(punto).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(grezza) ? grezza : "";
}
