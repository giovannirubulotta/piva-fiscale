"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import {
  cambiaFaseTrattativa,
  creaAttivita,
  creaTrattativa,
  eliminaTrattativa,
  segnaPassoFatto,
} from "@/lib/data/crm";
import { FASI_APERTE, FASI_CHIUSE, type FaseTrattativa, type TipoAttivita } from "@/lib/domain/crm";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

const FASI_VALIDE = [...FASI_APERTE, ...FASI_CHIUSE];
const TIPI_VALIDI: TipoAttivita[] = ["chiamata", "email", "incontro", "messaggio", "nota"];

/** Il valore arriva da un <select>, ma un form si può manomettere: si valida comunque. */
function faseValida(valore: string): FaseTrattativa | null {
  return (FASI_VALIDE as string[]).includes(valore) ? (valore as FaseTrattativa) : null;
}

export async function aggiungiTrattativa(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const clienteId = String(formData.get("clienteId") ?? "");
  const titolo = String(formData.get("titolo") ?? "").trim();
  const fase = faseValida(String(formData.get("fase") ?? "contatto"));
  const valore = Number(formData.get("valoreStimato") ?? 0);
  const probabilita = Number(formData.get("probabilita") ?? 0);

  if (!clienteId) return { ...statoVuoto, errore: "Scegli il cliente." };
  if (!titolo) return { ...statoVuoto, errore: "Dai un titolo alla trattativa." };
  if (!fase) return { ...statoVuoto, errore: "Fase non valida." };
  if (!Number.isFinite(valore) || valore < 0) return { ...statoVuoto, errore: "Il valore non può essere negativo." };
  if (!Number.isInteger(probabilita) || probabilita < 0 || probabilita > 100) {
    return { ...statoVuoto, errore: "La probabilità va da 0 a 100." };
  }

  try {
    await creaTrattativa(supabase, user.id, {
      clienteId,
      titolo,
      fase,
      valoreStimato: valore,
      probabilita,
      dataPrevista: String(formData.get("dataPrevista") ?? "") || null,
      note: String(formData.get("note") ?? "").trim() || null,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "crm.aggiungiTrattativa",
      messaggio: "Creazione trattativa non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/crm");
  revalidatePath("/clienti", "layout");
  return { errore: null, successo: true };
}

export async function spostaTrattativa(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  const fase = faseValida(String(formData.get("fase") ?? ""));
  if (!id || !fase) return;

  try {
    await cambiaFaseTrattativa(supabase, user.id, id, fase, String(formData.get("motivo") ?? "").trim() || null);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "crm.spostaTrattativa",
      messaggio: "Cambio di fase non riuscito.",
      causa,
    });
  }

  revalidatePath("/crm");
  revalidatePath("/clienti", "layout");
}

export async function rimuoviTrattativa(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await eliminaTrattativa(supabase, user.id, id);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "crm.rimuoviTrattativa",
      messaggio: "Eliminazione trattativa non riuscita.",
      causa,
    });
  }

  revalidatePath("/crm");
  revalidatePath("/clienti", "layout");
}

export async function aggiungiAttivita(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const clienteId = String(formData.get("clienteId") ?? "");
  const testo = String(formData.get("testo") ?? "").trim();
  const tipoGrezzo = String(formData.get("tipo") ?? "nota");
  const tipo = TIPI_VALIDI.includes(tipoGrezzo as TipoAttivita) ? (tipoGrezzo as TipoAttivita) : null;
  const data = String(formData.get("data") ?? "");

  if (!clienteId) return { ...statoVuoto, errore: "Scegli il cliente." };
  if (!testo) return { ...statoVuoto, errore: "Scrivi cosa è successo." };
  if (!tipo) return { ...statoVuoto, errore: "Tipo di attività non valido." };
  if (!data) return { ...statoVuoto, errore: "Indica la data." };

  const prossimoPasso = String(formData.get("prossimoPasso") ?? "").trim() || null;
  const dataProssimoPasso = String(formData.get("dataProssimoPasso") ?? "") || null;

  // Un impegno senza data non finisce in nessun elenco e viene dimenticato:
  // meglio dirlo subito che accoglierlo e perderlo.
  if (prossimoPasso && !dataProssimoPasso) {
    return { ...statoVuoto, errore: "Un prossimo passo senza data non comparirà tra le cose da fare: indica quando." };
  }

  try {
    await creaAttivita(supabase, user.id, {
      clienteId,
      trattativaId: String(formData.get("trattativaId") ?? "") || null,
      tipo,
      data,
      testo,
      prossimoPasso,
      dataProssimoPasso,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "crm.aggiungiAttivita",
      messaggio: "Registrazione attività non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/crm");
  revalidatePath("/clienti", "layout");
  return { errore: null, successo: true };
}

export async function completaPasso(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await segnaPassoFatto(supabase, user.id, id);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "crm.completaPasso",
      messaggio: "Aggiornamento del prossimo passo non riuscito.",
      causa,
    });
  }

  revalidatePath("/crm");
  revalidatePath("/clienti", "layout");
}
