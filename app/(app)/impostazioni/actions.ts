"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import { salvaDatiEmittente, salvaProfilo } from "@/lib/data/profilo";
import { salvaAliquote } from "@/lib/data/aliquote";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

export async function aggiornaProfilo(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const coefficiente = Number(formData.get("coefficiente_redditivita"));
  if (!Number.isFinite(coefficiente) || coefficiente <= 0 || coefficiente > 100) {
    return { ...statoVuoto, errore: "Il coefficiente di redditività deve essere una percentuale tra 0 e 100." };
  }

  const agevolazioneRaw = String(formData.get("agevolazione_5_percento") ?? "da_verificare");
  const agevolazione5Percento = agevolazioneRaw === "si" ? true : agevolazioneRaw === "no" ? false : null;

  try {
    await salvaProfilo(supabase, user.id, {
      partitaIva: String(formData.get("partita_iva") ?? "") || null,
      codiceAteco: String(formData.get("codice_ateco") ?? "73.11.02"),
      coefficienteRedditivita: coefficiente / 100,
      dataApertura: String(formData.get("data_apertura") ?? "") || null,
      agevolazione5Percento,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "impostazioni.aggiornaProfilo",
      messaggio: "Salvataggio profilo fiscale non riuscito.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/", "layout");
  return { errore: null, successo: true };
}

export async function aggiornaAliquote(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const anno = Number(formData.get("anno"));
  const standard = Number(formData.get("aliquota_sostitutiva_standard"));
  const agevolata = Number(formData.get("aliquota_sostitutiva_agevolata"));
  const inps = Number(formData.get("aliquota_inps"));
  const massimale = Number(formData.get("massimale_inps"));
  const minimale = Number(formData.get("minimale_inps"));

  if ([anno, standard, agevolata, inps, massimale, minimale].some((v) => !Number.isFinite(v))) {
    return { ...statoVuoto, errore: "Controlla che tutti i valori siano numeri validi." };
  }

  try {
    await salvaAliquote(supabase, {
      anno,
      aliquotaSostitutivaStandard: standard / 100,
      aliquotaSostitutivaAgevolata: agevolata / 100,
      aliquotaInps: inps / 100,
      massimaleInps: massimale,
      minimaleInps: minimale,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "impostazioni.aggiornaAliquote",
      messaggio: "Salvataggio aliquote non riuscito.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/", "layout");
  return { errore: null, successo: true };
}

export async function aggiornaDatiEmittente(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const testo = (campo: string): string | null => {
    const valore = String(formData.get(campo) ?? "").trim();
    return valore === "" ? null : valore;
  };

  const codiceFiscale = testo("codiceFiscale")?.toUpperCase() ?? null;
  // Il codice fiscale entra nel nome del file XML e identifica il trasmittente:
  // un valore malformato non produce un errore qui ma uno scarto dallo SDI.
  if (codiceFiscale && !/^[A-Z0-9]{11,16}$/.test(codiceFiscale)) {
    return { ...statoVuoto, errore: "Il codice fiscale deve avere tra 11 e 16 caratteri alfanumerici." };
  }

  const iban = testo("iban")?.replace(/\s/g, "").toUpperCase() ?? null;
  if (iban && !/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) {
    return { ...statoVuoto, errore: "L'IBAN non sembra valido: controlla che sia completo." };
  }

  try {
    await salvaDatiEmittente(supabase, user.id, {
      codiceFiscale,
      nome: testo("nome"),
      cognome: testo("cognome"),
      indirizzo: testo("indirizzo"),
      numeroCivico: testo("numeroCivico"),
      cap: testo("cap"),
      comune: testo("comune"),
      provincia: testo("provincia")?.toUpperCase() ?? null,
      nazione: (testo("nazione") ?? "IT").toUpperCase(),
      email: testo("email"),
      telefono: testo("telefono"),
      iban,
      bolloRiaddebitato: formData.get("bolloRiaddebitato") === "on",
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "impostazioni.aggiornaDatiEmittente",
      messaggio: "Salvataggio dati emittente non riuscito.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/impostazioni");
  revalidatePath("/fatture");
  return { errore: null, successo: true };
}
