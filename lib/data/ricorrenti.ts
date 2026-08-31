import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Cadenza, Ricorrente } from "@/lib/domain/ricorrenza";

/**
 * Accesso ai canoni ricorrenti. Stesse convenzioni di `preventivi.ts`: client
 * autenticato iniettato da fuori, righe lette insieme al documento.
 */

type RigaGrezza = Database["public"]["Tables"]["fiscale_ricorrente_righe"]["Row"];
type RicorrenteGrezzo = Database["public"]["Tables"]["fiscale_ricorrenti"]["Row"] & {
  fiscale_ricorrente_righe: RigaGrezza[] | null;
};

function mappa(riga: RicorrenteGrezzo): Ricorrente {
  return {
    id: riga.id,
    clienteId: riga.cliente_id,
    descrizione: riga.descrizione,
    cadenza: riga.cadenza as Cadenza,
    dataInizio: riga.data_inizio,
    dataFine: riga.data_fine,
    ultimaEmissione: riga.ultima_emissione,
    giorniScadenzaPagamento: riga.giorni_scadenza_pagamento,
    modalitaPagamento: riga.modalita_pagamento,
    condizioniPagamento: riga.condizioni_pagamento,
    causaleAggiuntiva: riga.causale_aggiuntiva,
    attiva: riga.attiva,
    note: riga.note,
    righe: (riga.fiscale_ricorrente_righe ?? [])
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

const SELEZIONE = "*, fiscale_ricorrente_righe(*)";

export async function leggiRicorrenti(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Ricorrente[]> {
  const { data, error } = await supabase
    .from("fiscale_ricorrenti")
    .select(SELEZIONE)
    .eq("user_id", userId)
    .order("attiva", { ascending: false })
    .order("descrizione", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((riga) => mappa(riga as RicorrenteGrezzo));
}

export async function leggiRicorrente(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<Ricorrente | null> {
  const { data, error } = await supabase
    .from("fiscale_ricorrenti")
    .select(SELEZIONE)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mappa(data as RicorrenteGrezzo) : null;
}

export interface NuovaRigaRicorrente {
  descrizione: string;
  quantita: number;
  unitaMisura: string | null;
  prezzoUnitario: number;
}

export interface NuovoRicorrente {
  clienteId: string;
  descrizione: string;
  cadenza: Cadenza;
  dataInizio: string;
  dataFine: string | null;
  giorniScadenzaPagamento: number;
  modalitaPagamento: string;
  condizioniPagamento: string;
  causaleAggiuntiva: string | null;
  note: string | null;
  righe: NuovaRigaRicorrente[];
}

export async function creaRicorrente(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: NuovoRicorrente
): Promise<string> {
  const { data, error } = await supabase
    .from("fiscale_ricorrenti")
    .insert({
      user_id: userId,
      cliente_id: dati.clienteId,
      descrizione: dati.descrizione,
      cadenza: dati.cadenza,
      data_inizio: dati.dataInizio,
      data_fine: dati.dataFine,
      giorni_scadenza_pagamento: dati.giorniScadenzaPagamento,
      modalita_pagamento: dati.modalitaPagamento,
      condizioni_pagamento: dati.condizioniPagamento,
      causale_aggiuntiva: dati.causaleAggiuntiva,
      note: dati.note,
    })
    .select("id")
    .single();
  if (error) throw error;

  const righe = dati.righe.map((riga, indice) => ({
    ricorrente_id: data.id,
    user_id: userId,
    numero_linea: indice + 1,
    descrizione: riga.descrizione,
    quantita: riga.quantita,
    unita_misura: riga.unitaMisura,
    prezzo_unitario: riga.prezzoUnitario,
  }));

  const inserimento = await supabase.from("fiscale_ricorrente_righe").insert(righe);
  if (inserimento.error) {
    // Come per preventivi e fatture: una serie senza righe genererebbe
    // fatture a zero ogni mese, il che è peggio di una serie mancante.
    await supabase.from("fiscale_ricorrenti").delete().eq("id", data.id).eq("user_id", userId);
    throw inserimento.error;
  }
  return data.id;
}

export async function cambiaAttivazioneRicorrente(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  attiva: boolean
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_ricorrenti")
    .update({ attiva, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

/**
 * Registra fin dove la serie è stata fatturata.
 *
 * Si scrive **dopo** che la fattura esiste davvero: al contrario, un errore
 * nell'emissione lascerebbe la serie convinta di aver già fatturato un mese
 * che non è mai stato fatturato, e quel canone non lo recupererebbe più
 * nessuno.
 */
export async function segnaUltimaEmissione(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  data: string
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_ricorrenti")
    .update({ ultima_emissione: data, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

export async function eliminaRicorrente(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase.from("fiscale_ricorrenti").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}
