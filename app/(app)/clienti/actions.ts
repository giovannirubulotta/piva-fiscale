"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import { aggiornaCliente, creaCliente, eliminaCliente, type DatiCliente } from "@/lib/data/clienti";
import type { TipologiaCliente } from "@/lib/domain/types";

const TIPOLOGIE: readonly TipologiaCliente[] = [
  "privato",
  "societa",
  "professionista",
  "pubblica_amministrazione",
  "associazione",
  "estero",
];

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

function testo(formData: FormData, campo: string): string | null {
  const valore = String(formData.get(campo) ?? "").trim();
  return valore === "" ? null : valore;
}

/** Estrae e valida i dati comuni a creazione e modifica. */
function leggiDati(formData: FormData): DatiCliente | string {
  const tipologia = String(formData.get("tipologia") ?? "");
  if (!TIPOLOGIE.includes(tipologia as TipologiaCliente)) return "Seleziona una tipologia valida.";

  const denominazione = testo(formData, "denominazione");
  const nome = testo(formData, "nome");
  const cognome = testo(formData, "cognome");
  if (!denominazione && !cognome) {
    return "Indica la denominazione (aziende) oppure nome e cognome (persone fisiche).";
  }

  const codiceDestinatario = (testo(formData, "codiceDestinatario") ?? "0000000").toUpperCase();
  if (!/^[A-Z0-9]{6,7}$/.test(codiceDestinatario)) {
    return "Il codice destinatario deve essere di 6 o 7 caratteri alfanumerici (usa 0000000 se non lo conosci).";
  }

  return {
    tipologia: tipologia as TipologiaCliente,
    denominazione,
    nome,
    cognome,
    codiceFiscale: testo(formData, "codiceFiscale")?.toUpperCase() ?? null,
    partitaIva: testo(formData, "partitaIva"),
    idPaese: (testo(formData, "idPaese") ?? "IT").toUpperCase(),
    indirizzo: testo(formData, "indirizzo"),
    numeroCivico: testo(formData, "numeroCivico"),
    cap: testo(formData, "cap"),
    comune: testo(formData, "comune"),
    provincia: testo(formData, "provincia")?.toUpperCase() ?? null,
    nazione: (testo(formData, "nazione") ?? "IT").toUpperCase(),
    codiceDestinatario,
    pecDestinatario: testo(formData, "pecDestinatario"),
    email: testo(formData, "email"),
    telefono: testo(formData, "telefono"),
    note: testo(formData, "note"),
  };
}

export async function salvaNuovoCliente(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();
  const dati = leggiDati(formData);
  if (typeof dati === "string") return { ...statoVuoto, errore: dati };

  try {
    await creaCliente(supabase, user.id, dati);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "clienti.salvaNuovoCliente",
      messaggio: "Creazione cliente non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }
  revalidatePath("/clienti");
  redirect("/clienti");
}

export async function salvaModificaCliente(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ...statoVuoto, errore: "Cliente non identificato." };

  const dati = leggiDati(formData);
  if (typeof dati === "string") return { ...statoVuoto, errore: dati };

  try {
    await aggiornaCliente(supabase, user.id, id, dati);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "clienti.salvaModificaCliente",
      messaggio: "Modifica cliente non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }
  revalidatePath("/clienti");
  redirect("/clienti");
}

export async function rimuoviCliente(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id"));
  try {
    await eliminaCliente(supabase, user.id, id);
  } catch (causa) {
    // Il vincolo di integrità impedisce di cancellare un cliente con fatture:
    // è voluto — cancellarlo lascerebbe fatture senza intestatario. Si registra
    // comunque, perché lo stesso catch coprirebbe anche un guasto diverso.
    await registraErrore(supabase, user.id, {
      contesto: "clienti.rimuoviCliente",
      messaggio: "Eliminazione cliente rifiutata o non riuscita.",
      severita: "avviso",
      causa,
    });
    redirect("/clienti?errore=cliente-con-fatture");
  }
  revalidatePath("/clienti");
}
