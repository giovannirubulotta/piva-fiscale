import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { credenziali, leggiCasella, leggiInvii } from "@/lib/data/casella";
import { leggiClienti } from "@/lib/data/clienti";
import { cifraturaDisponibile } from "@/lib/domain/cifratura";
import { nomeCliente } from "@/lib/domain/cliente";
import { ErrorePosta, leggiMessaggio, ultimiMessaggi, type Busta } from "@/lib/posta/client";
import { IntestazionePagina, Pillola, Scheda, Vuoto } from "@/components/Pagina";
import { ConfigurazioneForm, ProvaCollegamento, ScriviForm } from "./Moduli";
import { dimenticaCasella } from "./actions";

export const metadata = { title: "Posta — GAR Studio" };

/**
 * Il tempo che la piattaforma concede a questa pagina.
 *
 * Aprire una casella IMAP da una funzione serverless costa da uno a tre
 * secondi — connessione, TLS, LOGIN, SELECT, FETCH — perché non c'è nessuna
 * sessione da riusare tra una richiesta e l'altra. Il valore predefinito
 * lascia troppo poco margine su un server lento.
 */
export const maxDuration = 30;

export default async function PaginaPosta({ searchParams }: PageProps<"/posta">) {
  const parametri = await searchParams;
  const { supabase, user } = await richiediUtente();

  const [casella, clienti, invii] = await Promise.all([
    leggiCasella(supabase, user.id),
    leggiClienti(supabase, user.id),
    leggiInvii(supabase, user.id, 20),
  ]);

  const chiaveConfigurata = cifraturaDisponibile();
  const scheda = typeof parametri.vista === "string" ? parametri.vista : casella ? "ricevuta" : "impostazioni";
  const uidAperto = typeof parametri.uid === "string" ? Number(parametri.uid) : null;

  const opzioniClienti = clienti.map((c) => ({
    id: c.id,
    nome: nomeCliente(c),
    email: c.email ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <IntestazionePagina
        titolo="Posta"
        descrizione={
          casella
            ? `${casella.indirizzo} · in entrata da ${casella.imapHost}`
            : "La casella aziendale, collegata via IMAP e SMTP."
        }
      />

      {!chiaveConfigurata && (
        <div className="rounded-xl border border-danger/40 bg-danger-soft px-5 py-4">
          <p className="text-sm text-danger font-medium">Manca la chiave di cifratura.</p>
          <p className="text-sm text-ink-muted mt-1">
            Senza <code className="text-xs">CHIAVE_CIFRATURA</code> tra le variabili d&apos;ambiente la password
            della casella verrebbe salvata in chiaro, quindi la configurazione non viene accettata. Generane una
            con <code className="text-xs">openssl rand -base64 32</code> e aggiungila al progetto su Vercel.
          </p>
        </div>
      )}

      {casella?.ultimoErrore && (
        <div className="rounded-xl border border-warn/40 bg-warn-soft px-5 py-4">
          <p className="text-sm text-warn font-medium">L&apos;ultima prova non è andata a buon fine.</p>
          <p className="text-sm text-ink-muted mt-1">{casella.ultimoErrore}</p>
        </div>
      )}

      <nav aria-label="Sezione" className="flex flex-wrap gap-2">
        {[
          { chiave: "ricevuta", etichetta: "In arrivo" },
          { chiave: "scrivi", etichetta: "Scrivi" },
          { chiave: "inviati", etichetta: "Inviati dall'app" },
          { chiave: "impostazioni", etichetta: "Impostazioni" },
        ].map((voce) => {
          const attiva = voce.chiave === scheda;
          return (
            <Link
              key={voce.chiave}
              href={`/posta?vista=${voce.chiave}`}
              aria-current={attiva ? "page" : undefined}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                attiva
                  ? "border-accent bg-accent-soft text-accent font-medium"
                  : "border-line bg-surface text-ink-muted hover:text-ink hover:border-ink-faint"
              }`}
            >
              {voce.etichetta}
            </Link>
          );
        })}
      </nav>

      {scheda === "ricevuta" && <InArrivo supabase={supabase} userId={user.id} uid={uidAperto} configurata={Boolean(casella)} />}

      {scheda === "scrivi" && (
        <Scheda titolo="Nuovo messaggio">
          <div className="px-4 sm:px-5 py-4">
            {casella ? (
              <ScriviForm clienti={opzioniClienti} />
            ) : (
              <Vuoto messaggio="Configura prima la casella." azione={{ href: "/posta?vista=impostazioni", testo: "Vai alle impostazioni" }} />
            )}
          </div>
        </Scheda>
      )}

      {scheda === "inviati" && (
        <Scheda titolo="Inviati da qui">
          {invii.length === 0 ? (
            <Vuoto messaggio="Niente ancora. Qui resta traccia di cosa è uscito dall'applicazione, a chi e quando — anche quando la casella non è raggiungibile." />
          ) : (
            <div className="divide-y divide-line">
              {invii.map((invio) => (
                <div key={invio.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="min-w-0">
                    <span className="block text-sm">{invio.oggetto}</span>
                    <span className="block text-xs text-ink-faint mt-0.5">a {invio.destinatario}</span>
                  </span>
                  <time className="text-xs text-ink-faint shrink-0" dateTime={invio.inviatoIl}>
                    {new Date(invio.inviatoIl).toLocaleString("it-IT", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              ))}
            </div>
          )}
        </Scheda>
      )}

      {scheda === "impostazioni" && (
        <div className="flex flex-col gap-6 max-w-3xl">
          <div className="rounded-xl border border-line bg-surface-2 px-5 py-4 flex flex-col gap-2">
            <p className="text-sm font-medium">Due cose da sapere prima di mettere qui una password</p>
            <p className="text-sm text-ink-muted">
              La password è cifrata a riposo con AES-256-GCM. Questo protegge da chi ottenesse una copia del
              database — che è condiviso con un&apos;altra applicazione — ma <strong>non</strong> da chi ha
              accesso al progetto su Vercel, dove vivono sia la chiave sia il testo cifrato. Metti quindi una
              password <strong>dedicata alle applicazioni</strong>, generata dal pannello del provider e
              revocabile da lì, mai quella principale della casella.
            </p>
            <p className="text-sm text-ink-muted">
              Aprire la posta richiede da uno a tre secondi ogni volta. L&apos;applicazione gira su funzioni che
              nascono e muoiono con la richiesta e non possono tenere aperta una sessione IMAP: si rifà tutto da
              capo a ogni caricamento. È il modello di esecuzione, non un difetto da correggere.
            </p>
          </div>

          <Scheda titolo={casella ? "Modifica la casella" : "Collega la casella"}>
            <div className="px-4 sm:px-5 py-4 flex flex-col gap-5">
              <ConfigurazioneForm casella={casella} />
              {casella && (
                <div className="pt-4 border-t border-line flex flex-col gap-3">
                  <ProvaCollegamento />
                  {casella.ultimaVerifica && !casella.ultimoErrore && (
                    <p className="text-sm text-ok">
                      Ultima prova riuscita il{" "}
                      {new Date(casella.ultimaVerifica).toLocaleString("it-IT")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Scheda>

          {casella && (
            <details className="group scheda overflow-hidden">
              <summary className="marker:hidden [&::-webkit-details-marker]:hidden px-4 sm:px-5 py-3.5 cursor-pointer select-none flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">Scollega la casella</div>
                  <div className="text-xs text-ink-muted mt-0.5">Le credenziali vengono cancellate</div>
                </div>
                <span className="shrink-0 text-xs text-ink-muted border border-line rounded-lg px-3 py-1.5">
                  <span className="group-open:hidden">Apri</span>
                  <span className="hidden group-open:inline">Chiudi</span>
                </span>
              </summary>
              <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-line flex flex-col gap-4">
                <ul className="flex flex-col gap-1.5">
                  {[
                    "Le credenziali cifrate vengono eliminate dal database.",
                    "Il registro di cosa hai inviato resta: è tuo, non della casella.",
                    "Nella casella non cambia niente. Se vuoi revocare l'accesso davvero, elimina la password dedicata dal pannello del provider.",
                  ].map((riga) => (
                    <li key={riga} className="text-sm text-ink-muted flex gap-2">
                      <span aria-hidden="true" className="text-ink-faint">
                        —
                      </span>
                      <span>{riga}</span>
                    </li>
                  ))}
                </ul>
                <form action={dimenticaCasella}>
                  <button
                    type="submit"
                    className="rounded-lg border border-danger/50 bg-danger-soft text-danger text-sm font-medium px-4 py-2.5 hover:bg-danger/15 transition"
                  >
                    Scollega
                  </button>
                </form>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * La posta in arrivo.
 *
 * Il caricamento avviene qui e non nella pagina intera così un errore della
 * casella non porta giù anche le impostazioni — che sono esattamente il posto
 * dove si va quando la casella non funziona.
 */
async function InArrivo({
  supabase,
  userId,
  uid,
  configurata,
}: {
  supabase: Awaited<ReturnType<typeof richiediUtente>>["supabase"];
  userId: string;
  uid: number | null;
  configurata: boolean;
}) {
  if (!configurata) {
    return (
      <Scheda>
        <Vuoto
          messaggio="Nessuna casella collegata."
          azione={{ href: "/posta?vista=impostazioni", testo: "Collega la casella" }}
        />
      </Scheda>
    );
  }

  const credenzialiCasella = await credenziali(supabase, userId).catch(() => null);
  if (!credenzialiCasella) {
    return (
      <Scheda>
        <Vuoto
          messaggio="Le credenziali non si riescono a leggere: probabilmente la chiave di cifratura è cambiata. Riconfigura la casella."
          azione={{ href: "/posta?vista=impostazioni", testo: "Impostazioni" }}
        />
      </Scheda>
    );
  }

  let buste: Busta[];
  let aperto = null;
  try {
    buste = await ultimiMessaggi(credenzialiCasella);
    if (uid !== null) aperto = await leggiMessaggio(credenzialiCasella, uid);
  } catch (causa) {
    return (
      <div className="rounded-xl border border-danger/40 bg-danger-soft px-5 py-4">
        <p className="text-sm text-danger font-medium">La posta non si è aperta.</p>
        <p className="text-sm text-ink-muted mt-1">
          {causa instanceof ErrorePosta ? causa.message : "Errore imprevisto."}
        </p>
        <Link href="/posta?vista=impostazioni" className="text-sm text-accent underline mt-2 inline-block">
          Controlla le impostazioni
        </Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[22rem_1fr] gap-6 items-start">
      <Scheda titolo={`In arrivo — ${buste.length}`}>
        {buste.length === 0 ? (
          <Vuoto messaggio="La casella è vuota." />
        ) : (
          <div className="divide-y divide-line max-h-[32rem] overflow-y-auto">
            {buste.map((busta) => (
              <Link
                key={busta.uid}
                href={`/posta?vista=ricevuta&uid=${busta.uid}`}
                className={`block px-4 py-3 riga-interattiva ${busta.uid === uid ? "bg-accent-soft" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-sm truncate ${busta.letto ? "text-ink-muted" : "font-medium"}`}>
                    {busta.da.nome ?? busta.da.indirizzo}
                  </span>
                  <time className="text-xs text-ink-faint shrink-0" dateTime={busta.data}>
                    {new Date(busta.data).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                  </time>
                </div>
                <div className={`text-sm truncate mt-0.5 ${busta.letto ? "text-ink-faint" : "text-ink"}`}>
                  {busta.oggetto}
                </div>
                {busta.conAllegati && (
                  <span className="mt-1 inline-block">
                    <Pillola>allegato</Pillola>
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </Scheda>

      <Scheda titolo={aperto ? aperto.oggetto : "Messaggio"}>
        {!aperto ? (
          <Vuoto messaggio="Scegli un messaggio dall'elenco." />
        ) : (
          <div className="px-4 sm:px-5 py-4 flex flex-col gap-4">
            <div className="text-sm">
              <div>
                <span className="text-ink-muted">Da </span>
                {aperto.da.nome ? `${aperto.da.nome} <${aperto.da.indirizzo}>` : aperto.da.indirizzo}
              </div>
              <div className="text-xs text-ink-faint mt-0.5">
                {new Date(aperto.data).toLocaleString("it-IT")}
                {aperto.a.length > 0 && ` · a ${aperto.a.join(", ")}`}
              </div>
            </div>

            {/* Solo testo. L'HTML di un'email in arrivo non viene mai inserito
                nel documento: è il modo classico di trasformare un lettore di
                posta in un vettore di script. */}
            <pre className="text-sm whitespace-pre-wrap break-words font-sans leading-relaxed border-t border-line pt-4">
              {aperto.testo || "(nessun testo leggibile in questo messaggio)"}
            </pre>

            {aperto.html && (
              <p className="text-xs text-ink-faint border-t border-line pt-3">
                Il messaggio contiene anche una versione HTML, che non viene mostrata: qui si legge sempre il
                testo.
              </p>
            )}

            {aperto.conAllegati && (
              <p className="text-xs text-ink-faint">
                Ha degli allegati. Per scaricarli serve il client di posta: qui si legge, non si archivia.
              </p>
            )}

            <Link
              href={`/posta?vista=scrivi`}
              className="btn-secondario self-start"
            >
              Rispondi dalla scheda «Scrivi»
            </Link>
          </div>
        )}
      </Scheda>
    </div>
  );
}
