import "server-only";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import type { CredenzialiComplete, CredenzialiImap } from "@/lib/data/casella";

/**
 * Il collegamento alla casella di posta.
 *
 * ## Perché è lento, e perché non si aggiusta scrivendo meglio
 *
 * Un client di posta resta connesso: apre la sessione IMAP una volta e la
 * tiene, quindi aprire una cartella costa millisecondi. Qui l'applicazione
 * gira su funzioni serverless, che nascono e muoiono con la richiesta e non
 * possono tenere niente aperto tra l'una e l'altra. Ogni caricamento della
 * posta paga quindi da capo: TCP, handshake TLS, LOGIN, SELECT, FETCH — da uno
 * a tre secondi.
 *
 * Non è un difetto di implementazione, è il modello di esecuzione. Le
 * conseguenze pratiche sono due, e sono scritte nel codice qui sotto:
 * si chiede al server **il minimo indispensabile** (le buste per l'elenco, il
 * corpo solo del messaggio che si apre davvero), e si chiude sempre la
 * connessione, anche quando qualcosa va storto — una connessione lasciata
 * aperta consuma uno dei pochi slot simultanei che i provider concedono, e il
 * caricamento successivo verrebbe rifiutato.
 */

/** Oltre questo, la richiesta muore comunque per timeout della piattaforma. */
const ATTESA_MS = 15_000;

export interface Busta {
  uid: number;
  da: { nome: string | null; indirizzo: string };
  a: string[];
  oggetto: string;
  data: string;
  letto: boolean;
  conAllegati: boolean;
  anteprima: string | null;
}

export interface Messaggio extends Busta {
  testo: string;
  html: string | null;
}

export class ErrorePosta extends Error {
  constructor(
    message: string,
    /** Il messaggio grezzo del server, per la diagnostica: non si mostra all'utente. */
    readonly causa?: unknown
  ) {
    super(message);
    this.name = "ErrorePosta";
  }
}

/**
 * Traduce gli errori del protocollo in frasi che dicono cosa fare.
 *
 * «AUTHENTICATIONFAILED» è la risposta del server, non una spiegazione: chi la
 * legge deve sapere che la password dedicata va rigenerata, non che il codice
 * ha ricevuto un codice di errore.
 */
function spiega(errore: unknown): string {
  const testo = errore instanceof Error ? errore.message : String(errore);

  if (/AUTHENTICATIONFAILED|Invalid credentials|LOGIN failed/i.test(testo)) {
    return "Il server ha rifiutato le credenziali. Se il provider richiede una password dedicata alle applicazioni, quella principale non funziona: generane una dal pannello della casella.";
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(testo)) {
    return "Il server di posta non è raggiungibile a quell'indirizzo: controlla il nome dell'host.";
  }
  if (/ECONNREFUSED/i.test(testo)) {
    return "Il server ha rifiutato la connessione su quella porta. Di solito IMAP è 993 e SMTP 465.";
  }
  if (/timeout|ETIMEDOUT/i.test(testo)) {
    return "Il server non ha risposto in tempo. Può essere lento o bloccare le connessioni da server esterni.";
  }
  if (/certificate|self.signed|SSL|TLS/i.test(testo)) {
    return "Il certificato TLS del server non è stato accettato. Verifica host e porta: su una porta senza cifratura la connessione sicura fallisce così.";
  }
  return "Non è stato possibile collegarsi alla casella.";
}

function connessione(credenziali: CredenzialiImap): ImapFlow {
  return new ImapFlow({
    host: credenziali.host,
    port: credenziali.porta,
    // Le porte 993 (IMAP) e 465 (SMTP) sono cifrate dall'inizio; sulle altre
    // si parte in chiaro e si sale con STARTTLS. Dedurlo dalla porta evita di
    // chiedere all'utente una cosa che è già implicita nel numero.
    secure: credenziali.porta === 993 || credenziali.porta === 465,
    auth: { user: credenziali.utente, pass: credenziali.password },
    logger: false,
    // Senza questi, una connessione che non risponde tiene occupata la
    // funzione fino al timeout della piattaforma e l'utente vede una pagina
    // che gira a vuoto senza sapere perché.
    socketTimeout: ATTESA_MS,
    greetingTimeout: ATTESA_MS / 2,
    connectionTimeout: ATTESA_MS / 2,
  });
}

/**
 * Esegue un'operazione sulla casella e chiude **sempre**.
 *
 * Il `finally` con `logout()` non è cerimoniale: i provider concedono pochi
 * accessi simultanei per casella, e una connessione lasciata aperta da una
 * funzione terminata male li consuma finché il server non la scarta da solo —
 * nel frattempo il caricamento successivo viene rifiutato, e sembra che sia
 * sbagliata la password.
 */
async function conCasella<T>(
  credenziali: CredenzialiImap,
  operazione: (client: ImapFlow) => Promise<T>
): Promise<T> {
  const client = connessione(credenziali);
  try {
    await client.connect();
    return await operazione(client);
  } catch (causa) {
    throw new ErrorePosta(spiega(causa), causa);
  } finally {
    await client.logout().catch(() => {
      // Se il logout fallisce la connessione è già caduta: non c'è niente da
      // fare e non è un errore da mostrare sopra a quello vero.
    });
  }
}

function normalizzaIndirizzo(voce: { name?: string; address?: string } | undefined) {
  return {
    nome: voce?.name?.trim() || null,
    indirizzo: voce?.address ?? "",
  };
}

/**
 * Le ultime buste di una cartella.
 *
 * Si scaricano **solo le buste**, non i corpi: un elenco di trenta messaggi
 * con allegati sarebbe decine di megabyte, li scaricherebbe tutti per
 * mostrarne le intestazioni e supererebbe il tempo massimo della richiesta.
 */
export async function ultimiMessaggi(
  credenziali: CredenzialiComplete,
  cartella = "INBOX",
  quanti = 30
): Promise<Busta[]> {
  return conCasella(credenziali.imap, async (client) => {
    const blocco = await client.getMailboxLock(cartella);
    try {
      const totale = client.mailbox && typeof client.mailbox !== "boolean" ? client.mailbox.exists : 0;
      if (totale === 0) return [];

      const da = Math.max(1, totale - quanti + 1);
      const buste: Busta[] = [];

      for await (const messaggio of client.fetch(`${da}:*`, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
      })) {
        const busta = messaggio.envelope;
        buste.push({
          uid: messaggio.uid,
          da: normalizzaIndirizzo(busta?.from?.[0]),
          a: (busta?.to ?? []).map((v) => v.address ?? "").filter(Boolean),
          oggetto: busta?.subject ?? "(senza oggetto)",
          data: (busta?.date ?? new Date()).toISOString(),
          letto: messaggio.flags?.has("\\Seen") ?? false,
          conAllegati: contieneAllegati(messaggio.bodyStructure),
          anteprima: null,
        });
      }

      // Il server li dà dal più vecchio; l'ordine utile è l'opposto.
      return buste.reverse();
    } finally {
      blocco.release();
    }
  });
}

/** Un allegato è una parte con disposizione «attachment», a qualsiasi profondità. */
function contieneAllegati(struttura: unknown): boolean {
  if (!struttura || typeof struttura !== "object") return false;
  const nodo = struttura as { disposition?: string; childNodes?: unknown[] };
  if (nodo.disposition?.toLowerCase() === "attachment") return true;
  return (nodo.childNodes ?? []).some(contieneAllegati);
}

/** Un messaggio intero, corpo compreso. Si chiama solo quando si apre davvero. */
export async function leggiMessaggio(
  credenziali: CredenzialiComplete,
  uid: number,
  cartella = "INBOX"
): Promise<Messaggio | null> {
  return conCasella(credenziali.imap, async (client) => {
    const blocco = await client.getMailboxLock(cartella);
    try {
      const messaggio = await client.fetchOne(
        String(uid),
        { uid: true, envelope: true, flags: true, bodyStructure: true, source: true },
        { uid: true }
      );
      if (!messaggio || typeof messaggio === "boolean") return null;

      const sorgente = messaggio.source?.toString("utf8") ?? "";
      const { testo, html } = separaCorpo(sorgente);
      const busta = messaggio.envelope;

      return {
        uid: messaggio.uid,
        da: normalizzaIndirizzo(busta?.from?.[0]),
        a: (busta?.to ?? []).map((v) => v.address ?? "").filter(Boolean),
        oggetto: busta?.subject ?? "(senza oggetto)",
        data: (busta?.date ?? new Date()).toISOString(),
        letto: messaggio.flags?.has("\\Seen") ?? false,
        conAllegati: contieneAllegati(messaggio.bodyStructure),
        anteprima: null,
        testo,
        html,
      };
    } finally {
      blocco.release();
    }
  });
}

/**
 * Estrae il corpo testuale dal messaggio grezzo.
 *
 * Volutamente minimale: prende la prima parte `text/plain` e la decodifica se
 * è in quoted-printable o base64. Non è un parser MIME completo — quello è
 * `mailparser`, che porta con sé un albero di dipendenze pesante per un
 * beneficio che qui non serve: la posta si legge per capire cosa ha scritto il
 * cliente, e per i casi in cui questo non basta c'è il client di posta vero.
 *
 * L'HTML viene restituito **grezzo e non viene mai inserito nel documento**:
 * la pagina mostra sempre il testo. Iniettare l'HTML di un'email in arrivo è
 * il modo classico di trasformare un lettore di posta in un vettore di
 * script.
 */
function separaCorpo(sorgente: string): { testo: string; html: string | null } {
  const separatore = sorgente.match(/boundary="?([^"\r\n;]+)"?/i)?.[1];

  if (!separatore) {
    const corpo = sorgente.split(/\r?\n\r?\n/).slice(1).join("\n\n");
    return { testo: decodifica(corpo, sorgente).trim(), html: null };
  }

  const parti = sorgente.split(`--${separatore}`);
  let testo = "";
  let html: string | null = null;

  for (const parte of parti) {
    const intestazioni = parte.split(/\r?\n\r?\n/)[0] ?? "";
    const corpo = parte.split(/\r?\n\r?\n/).slice(1).join("\n\n");
    if (/content-type:\s*text\/plain/i.test(intestazioni) && !testo) {
      testo = decodifica(corpo, intestazioni).trim();
    } else if (/content-type:\s*text\/html/i.test(intestazioni) && !html) {
      html = decodifica(corpo, intestazioni).trim();
    }
  }

  return { testo: testo || spogliaTag(html ?? ""), html };
}

function decodifica(corpo: string, intestazioni: string): string {
  if (/content-transfer-encoding:\s*base64/i.test(intestazioni)) {
    try {
      return Buffer.from(corpo.replace(/\s/g, ""), "base64").toString("utf8");
    } catch {
      return corpo;
    }
  }
  if (/content-transfer-encoding:\s*quoted-printable/i.test(intestazioni)) {
    return corpo
      // Un `=` a fine riga è un a capo aggiunto dal trasporto, non un carattere.
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-F]{2})/gi, (_, esadecimale) => String.fromCharCode(parseInt(esadecimale, 16)));
  }
  return corpo;
}

/** Ultima risorsa quando esiste solo la parte HTML: se ne ricava del testo. */
function spogliaTag(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface DaInviare {
  a: string;
  oggetto: string;
  testo: string;
  allegato?: { nome: string; contenuto: Buffer; tipo: string };
}

export async function invia(credenziali: CredenzialiComplete, messaggio: DaInviare): Promise<void> {
  const trasporto = nodemailer.createTransport({
    host: credenziali.smtp.host,
    port: credenziali.smtp.porta,
    secure: credenziali.smtp.porta === 465,
    auth: { user: credenziali.smtp.utente, pass: credenziali.smtp.password },
    connectionTimeout: ATTESA_MS,
    greetingTimeout: ATTESA_MS / 2,
  });

  try {
    await trasporto.sendMail({
      from: credenziali.nomeMittente
        ? { name: credenziali.nomeMittente, address: credenziali.indirizzo }
        : credenziali.indirizzo,
      to: messaggio.a,
      subject: messaggio.oggetto,
      // Solo testo: un'email in solo testo arriva sempre, non finisce nello
      // spam per un HTML malformato e si legge su qualunque client.
      text: messaggio.testo,
      attachments: messaggio.allegato
        ? [
            {
              filename: messaggio.allegato.nome,
              content: messaggio.allegato.contenuto,
              contentType: messaggio.allegato.tipo,
            },
          ]
        : undefined,
    });
  } catch (causa) {
    throw new ErrorePosta(spiega(causa), causa);
  } finally {
    trasporto.close();
  }
}

/** Verifica che entrambe le connessioni funzionino, senza spedire niente. */
export async function verifica(credenziali: CredenzialiComplete): Promise<void> {
  await conCasella(credenziali.imap, async () => undefined);

  const trasporto = nodemailer.createTransport({
    host: credenziali.smtp.host,
    port: credenziali.smtp.porta,
    secure: credenziali.smtp.porta === 465,
    auth: { user: credenziali.smtp.utente, pass: credenziali.smtp.password },
    connectionTimeout: ATTESA_MS,
    greetingTimeout: ATTESA_MS / 2,
  });
  try {
    await trasporto.verify();
  } catch (causa) {
    throw new ErrorePosta(`Posta in entrata a posto, ma in uscita no: ${spiega(causa)}`, causa);
  } finally {
    trasporto.close();
  }
}
