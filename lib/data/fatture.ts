import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Fattura, Incasso, StatoFattura, TipoDocumento } from "@/lib/domain/types";
import { fattureComeIncassi } from "@/lib/domain/fattura";
import { mappaFattura, mappaRigaFattura } from "./mappers";

/**
 * Accesso alle fatture. Le righe si leggono sempre insieme alla testata: senza
 * righe una fattura non ha importo, e mezza fattura in memoria è un invito a
 * calcolare totali sbagliati.
 */

export async function leggiFatture(supabase: SupabaseClient<Database>, userId: string): Promise<Fattura[]> {
  const [testate, righe] = await Promise.all([
    supabase
      .from("fiscale_fatture")
      .select("*")
      .eq("user_id", userId)
      .order("data_emissione", { ascending: false })
      .order("progressivo", { ascending: false }),
    supabase.from("fiscale_fattura_righe").select("*").eq("user_id", userId).order("numero_linea"),
  ]);
  if (testate.error) throw testate.error;
  if (righe.error) throw righe.error;

  const perFattura = new Map<string, ReturnType<typeof mappaRigaFattura>[]>();
  for (const r of righe.data ?? []) {
    const lista = perFattura.get(r.fattura_id) ?? [];
    lista.push(mappaRigaFattura(r));
    perFattura.set(r.fattura_id, lista);
  }

  return (testate.data ?? []).map((t) => mappaFattura(t, perFattura.get(t.id) ?? []));
}

/**
 * Le fatture nel formato che il motore di calcolo già conosce. Esiste perché
 * il calcolo (imponibile, scadenzario, Quadro LM) non deve sapere che la fonte
 * dei dati è cambiata da `fiscale_incassi` alle fatture: il contratto `Incasso`
 * resta il confine tra i due mondi.
 */
export async function leggiIncassiDaFatture(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Incasso[]> {
  return fattureComeIncassi(await leggiFatture(supabase, userId));
}

export async function leggiFattura(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<Fattura | null> {
  const [testata, righe] = await Promise.all([
    supabase.from("fiscale_fatture").select("*").eq("user_id", userId).eq("id", id).maybeSingle(),
    supabase.from("fiscale_fattura_righe").select("*").eq("user_id", userId).eq("fattura_id", id).order("numero_linea"),
  ]);
  if (testata.error) throw testata.error;
  if (righe.error) throw righe.error;
  if (!testata.data) return null;
  return mappaFattura(testata.data, (righe.data ?? []).map(mappaRigaFattura));
}

/**
 * Prossimo numero disponibile per anno e tipo documento. Non usa un contatore
 * separato: legge il massimo esistente, così il numero resta coerente anche se
 * una fattura viene eliminata prima di essere emessa.
 */
export async function prossimoProgressivo(
  supabase: SupabaseClient<Database>,
  userId: string,
  anno: number,
  tipoDocumento: TipoDocumento
): Promise<number> {
  const { data, error } = await supabase
    .from("fiscale_fatture")
    .select("progressivo")
    .eq("user_id", userId)
    .eq("anno", anno)
    .eq("tipo_documento", tipoDocumento)
    .order("progressivo", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.progressivo ?? 0) + 1;
}

export interface NuovaRiga {
  descrizione: string;
  quantita: number;
  unitaMisura: string | null;
  prezzoUnitario: number;
}

export interface NuovaFattura {
  clienteId: string;
  tipoDocumento: TipoDocumento;
  fatturaRiferimentoId: string | null;
  anno: number;
  progressivo: number;
  dataEmissione: string;
  stato: StatoFattura;
  bolloApplicato: boolean;
  bolloRiaddebitato: boolean;
  condizioniPagamento: string;
  modalitaPagamento: string;
  giorniScadenzaPagamento: number;
  causaleAggiuntiva: string | null;
  note: string | null;
  righe: NuovaRiga[];
}

export async function creaFattura(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: NuovaFattura
): Promise<string> {
  const { data, error } = await supabase
    .from("fiscale_fatture")
    .insert({
      user_id: userId,
      cliente_id: dati.clienteId,
      tipo_documento: dati.tipoDocumento,
      fattura_riferimento_id: dati.fatturaRiferimentoId,
      anno: dati.anno,
      progressivo: dati.progressivo,
      data_emissione: dati.dataEmissione,
      stato: dati.stato,
      bollo_applicato: dati.bolloApplicato,
      bollo_riaddebitato: dati.bolloRiaddebitato,
      condizioni_pagamento: dati.condizioniPagamento,
      modalita_pagamento: dati.modalitaPagamento,
      giorni_scadenza_pagamento: dati.giorniScadenzaPagamento,
      causale_aggiuntiva: dati.causaleAggiuntiva,
      note: dati.note,
    })
    .select("id")
    .single();
  if (error) throw error;

  const righe = dati.righe.map((riga, indice) => ({
    fattura_id: data.id,
    user_id: userId,
    numero_linea: indice + 1,
    descrizione: riga.descrizione,
    quantita: riga.quantita,
    unita_misura: riga.unitaMisura,
    prezzo_unitario: riga.prezzoUnitario,
  }));

  const inserimentoRighe = await supabase.from("fiscale_fattura_righe").insert(righe);
  if (inserimentoRighe.error) {
    // Senza righe la fattura non ha importo: meglio nessuna fattura che una a zero.
    await supabase.from("fiscale_fatture").delete().eq("id", data.id).eq("user_id", userId);
    throw inserimentoRighe.error;
  }
  return data.id;
}

export async function aggiornaStatoFattura(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  dati: { stato: StatoFattura; dataIncasso: string | null }
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_fatture")
    .update({ stato: dati.stato, data_incasso: dati.dataIncasso, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function eliminaFattura(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase.from("fiscale_fatture").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

/**
 * Assegna alla fattura un progressivo per il nome del file XML, se non ne ha
 * già uno.
 *
 * Il nome del file trasmesso allo SDI deve essere univoco per sempre — non per
 * anno — e uno scarto "brucia" comunque il nome usato: per questo i
 * progressivi vivono in una tabella con vincolo di unicità invece che in un
 * contatore ricalcolabile. In caso di collisione (violazione del vincolo) si
 * riprova con il successivo, invece di fidarsi del conteggio letto un istante
 * prima.
 */
export async function assegnaProgressivoXml(
  supabase: SupabaseClient<Database>,
  userId: string,
  fatturaId: string
): Promise<string> {
  const esistente = await supabase
    .from("fiscale_fatture")
    .select("xml_progressivo")
    .eq("user_id", userId)
    .eq("id", fatturaId)
    .maybeSingle();
  if (esistente.error) throw esistente.error;
  if (esistente.data?.xml_progressivo) return esistente.data.xml_progressivo;

  const { count, error: erroreConteggio } = await supabase
    .from("fiscale_progressivi_xml")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (erroreConteggio) throw erroreConteggio;

  for (let tentativo = (count ?? 0) + 1; tentativo <= (count ?? 0) + 50; tentativo++) {
    const progressivo = String(tentativo).padStart(5, "0");
    const { error } = await supabase
      .from("fiscale_progressivi_xml")
      .insert({ user_id: userId, progressivo, fattura_id: fatturaId });

    if (!error) {
      const aggiornamento = await supabase
        .from("fiscale_fatture")
        .update({ xml_progressivo: progressivo, xml_generato_il: new Date().toISOString() })
        .eq("id", fatturaId)
        .eq("user_id", userId);
      if (aggiornamento.error) throw aggiornamento.error;
      return progressivo;
    }
    // 23505 = violazione di unicità: quel progressivo è già stato usato, si prova il successivo.
    if (error.code !== "23505") throw error;
  }
  throw new Error("Impossibile assegnare un progressivo XML libero dopo 50 tentativi.");
}
