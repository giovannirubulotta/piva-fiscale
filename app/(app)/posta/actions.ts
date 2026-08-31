"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import {
  credenziali,
  eliminaCasella,
  registraInvio,
  registraVerifica,
  salvaCasella,
} from "@/lib/data/casella";
import { cifraturaDisponibile } from "@/lib/domain/cifratura";
import { ErrorePosta, invia, verifica } from "@/lib/posta/client";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
  messaggio?: string;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

function porta(valore: FormDataEntryValue | null, predefinita: number): number {
  const numero = Number(valore);
  return Number.isInteger(numero) && numero > 0 && numero < 65536 ? numero : predefinita;
}

export async function salvaConfigurazione(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  if (!cifraturaDisponibile()) {
    return {
      ...statoVuoto,
      errore:
        "Manca la chiave di cifratura (CHIAVE_CIFRATURA). Senza, la password della casella verrebbe salvata in chiaro: la configurazione non viene accettata.",
    };
  }

  const indirizzo = String(formData.get("indirizzo") ?? "").trim();
  const imapHost = String(formData.get("imapHost") ?? "").trim();
  const smtpHost = String(formData.get("smtpHost") ?? "").trim();
  const imapPassword = String(formData.get("imapPassword") ?? "");
  const smtpPasswordGrezza = String(formData.get("smtpPassword") ?? "");

  if (!indirizzo.includes("@")) return { ...statoVuoto, errore: "Indica l'indirizzo della casella." };
  if (!imapHost) return { ...statoVuoto, errore: "Indica il server della posta in entrata (IMAP)." };
  if (!smtpHost) return { ...statoVuoto, errore: "Indica il server della posta in uscita (SMTP)." };
  if (!imapPassword) return { ...statoVuoto, errore: "Serve la password della casella." };

  const imapUtente = String(formData.get("imapUtente") ?? "").trim() || indirizzo;

  try {
    await salvaCasella(supabase, user.id, {
      indirizzo,
      nomeMittente: String(formData.get("nomeMittente") ?? "").trim() || null,
      imapHost,
      imapPorta: porta(formData.get("imapPorta"), 993),
      imapUtente,
      imapPassword,
      smtpHost,
      smtpPorta: porta(formData.get("smtpPorta"), 465),
      smtpUtente: String(formData.get("smtpUtente") ?? "").trim() || imapUtente,
      // Quasi tutti i provider usano le stesse credenziali per entrambi:
      // chiederle due volte sarebbe un modo per farne sbagliare una.
      smtpPassword: smtpPasswordGrezza || imapPassword,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "posta.salvaConfigurazione",
      messaggio: "Salvataggio della configurazione della casella non riuscito.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/posta");
  return { errore: null, successo: true, messaggio: "Configurazione salvata. Ora provala." };
}

/**
 * Prova il collegamento senza spedire niente.
 *
 * È un'azione a sé e non un controllo dentro il salvataggio: se la verifica
 * fallisse durante il salvataggio, la configurazione andrebbe persa e
 * bisognerebbe riscrivere tutto, password compresa, per provare una porta
 * diversa.
 */
export async function provaCollegamento(): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const credenzialiCasella = await credenziali(supabase, user.id).catch(() => null);
  if (!credenzialiCasella) {
    return { ...statoVuoto, errore: "Nessuna casella configurata, o chiave di cifratura mancante." };
  }

  try {
    await verifica(credenzialiCasella);
    await registraVerifica(supabase, user.id, null);
  } catch (causa) {
    const spiegazione = causa instanceof ErrorePosta ? causa.message : "Collegamento non riuscito.";
    await registraVerifica(supabase, user.id, spiegazione);
    await registraErrore(supabase, user.id, {
      contesto: "posta.provaCollegamento",
      messaggio: spiegazione,
      causa,
    });
    revalidatePath("/posta");
    return { ...statoVuoto, errore: spiegazione };
  }

  revalidatePath("/posta");
  return { errore: null, successo: true, messaggio: "Entrata e uscita funzionano." };
}

export async function inviaMessaggio(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const a = String(formData.get("a") ?? "").trim();
  const oggetto = String(formData.get("oggetto") ?? "").trim();
  const testo = String(formData.get("testo") ?? "").trim();

  if (!a.includes("@")) return { ...statoVuoto, errore: "Indica un destinatario valido." };
  if (!oggetto) return { ...statoVuoto, errore: "Un messaggio senza oggetto finisce nello spam." };
  if (!testo) return { ...statoVuoto, errore: "Scrivi il messaggio." };

  const credenzialiCasella = await credenziali(supabase, user.id).catch(() => null);
  if (!credenzialiCasella) {
    return { ...statoVuoto, errore: "Nessuna casella configurata." };
  }

  try {
    await invia(credenzialiCasella, { a, oggetto, testo });
    // Il registro si scrive **dopo** l'invio riuscito: al contrario resterebbe
    // traccia di un messaggio mai partito, e alla domanda «gliel'ho già
    // mandato?» il software risponderebbe di sì sbagliando.
    await registraInvio(supabase, user.id, {
      destinatario: a,
      oggetto,
      clienteId: String(formData.get("clienteId") ?? "") || null,
      fatturaId: String(formData.get("fatturaId") ?? "") || null,
      preventivoId: String(formData.get("preventivoId") ?? "") || null,
      conAllegato: false,
    });
  } catch (causa) {
    const spiegazione = causa instanceof ErrorePosta ? causa.message : "Invio non riuscito.";
    await registraErrore(supabase, user.id, {
      contesto: "posta.inviaMessaggio",
      messaggio: spiegazione,
      causa,
    });
    return { ...statoVuoto, errore: spiegazione };
  }

  revalidatePath("/posta");
  return { errore: null, successo: true, messaggio: `Inviato a ${a}.` };
}

export async function dimenticaCasella(): Promise<void> {
  const { supabase, user } = await richiediUtente();

  try {
    await eliminaCasella(supabase, user.id);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "posta.dimenticaCasella",
      messaggio: "Rimozione della casella non riuscita.",
      causa,
    });
  }

  revalidatePath("/posta");
}
