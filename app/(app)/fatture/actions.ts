"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import {
  aggiornaStatoFattura,
  creaFattura,
  eliminaFattura,
  prossimoProgressivo,
  type NuovaRiga,
} from "@/lib/data/fatture";
import { bolloDovuto } from "@/lib/domain/fattura";
import type { StatoFattura, TipoDocumento } from "@/lib/domain/types";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

/**
 * Le righe arrivano come array paralleli dal form (descrizione[], quantita[],
 * prezzo[]): si ricompongono qui e si scartano quelle vuote, perché un form con
 * righe aggiungibili lascia sempre qualche slot non compilato.
 */
function leggiRighe(formData: FormData): NuovaRiga[] {
  const descrizioni = formData.getAll("rigaDescrizione").map(String);
  const quantita = formData.getAll("rigaQuantita").map((v) => Number(v));
  const prezzi = formData.getAll("rigaPrezzo").map((v) => Number(v));
  const unita = formData.getAll("rigaUnita").map(String);

  return descrizioni
    .map((descrizione, i) => ({
      descrizione: descrizione.trim(),
      quantita: Number.isFinite(quantita[i]) && quantita[i] > 0 ? quantita[i] : 1,
      unitaMisura: unita[i]?.trim() || null,
      prezzoUnitario: Number.isFinite(prezzi[i]) ? prezzi[i] : 0,
    }))
    .filter((riga) => riga.descrizione !== "");
}

export async function salvaNuovaFattura(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const clienteId = String(formData.get("clienteId") ?? "");
  const tipoDocumento = String(formData.get("tipoDocumento") ?? "TD01") as TipoDocumento;
  const dataEmissione = String(formData.get("dataEmissione") ?? "");
  const fatturaRiferimentoId = String(formData.get("fatturaRiferimentoId") ?? "") || null;

  if (!clienteId) return { ...statoVuoto, errore: "Seleziona un cliente." };
  if (!dataEmissione) return { ...statoVuoto, errore: "Indica la data del documento." };
  if (tipoDocumento === "TD04" && !fatturaRiferimentoId) {
    return { ...statoVuoto, errore: "Una nota di credito deve indicare la fattura che storna." };
  }

  const righe = leggiRighe(formData);
  if (righe.length === 0) return { ...statoVuoto, errore: "Aggiungi almeno una riga con descrizione e importo." };
  if (righe.every((r) => r.prezzoUnitario === 0)) {
    return { ...statoVuoto, errore: "Le righe hanno tutte importo zero." };
  }

  const anno = Number(dataEmissione.slice(0, 4));
  const bolloRiaddebitato = formData.get("bolloRiaddebitato") === "on";
  // Il bollo non è una scelta libera: sopra 77,47 € è dovuto per legge. Si
  // ricalcola qui invece di fidarsi del valore arrivato dal form.
  const bolloApplicato = tipoDocumento === "TD01" && bolloDovuto(righe);

  let id: string;
  try {
    id = await creaFattura(supabase, user.id, {
      clienteId,
      tipoDocumento,
      fatturaRiferimentoId,
      anno,
      progressivo: await prossimoProgressivo(supabase, user.id, anno, tipoDocumento),
      dataEmissione,
      stato: String(formData.get("stato") ?? "bozza") as StatoFattura,
      bolloApplicato,
      bolloRiaddebitato,
      condizioniPagamento: String(formData.get("condizioniPagamento") ?? "TP02"),
      modalitaPagamento: String(formData.get("modalitaPagamento") ?? "MP05"),
      giorniScadenzaPagamento: Number(formData.get("giorniScadenzaPagamento") ?? 30),
      causaleAggiuntiva: String(formData.get("causaleAggiuntiva") ?? "").trim() || null,
      note: String(formData.get("note") ?? "").trim() || null,
      righe,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "fatture.salvaNuovaFattura",
      messaggio: "Creazione documento non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/fatture");
  revalidatePath("/");
  redirect(`/fatture/${id}`);
}

export async function segnaIncassata(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id"));
  const data = String(formData.get("dataIncasso") ?? "") || new Date().toISOString().slice(0, 10);
  await aggiornaStatoFattura(supabase, user.id, id, { stato: "incassata", dataIncasso: data });
  revalidatePath("/fatture");
  revalidatePath("/");
  revalidatePath(`/fatture/${id}`);
}

export async function cambiaStatoFattura(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id"));
  const stato = String(formData.get("stato")) as StatoFattura;
  // Uscire da "incassata" azzera la data: lasciarla darebbe una data di incasso
  // a un documento che non risulta incassato.
  await aggiornaStatoFattura(supabase, user.id, id, {
    stato,
    dataIncasso: stato === "incassata" ? new Date().toISOString().slice(0, 10) : null,
  });
  revalidatePath("/fatture");
  revalidatePath("/");
  revalidatePath(`/fatture/${id}`);
}

export async function rimuoviFattura(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  await eliminaFattura(supabase, user.id, String(formData.get("id")));
  revalidatePath("/fatture");
  revalidatePath("/");
  redirect("/fatture");
}
