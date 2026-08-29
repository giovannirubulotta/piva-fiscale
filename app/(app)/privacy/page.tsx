import Link from "next/link";

/**
 * Informativa sul trattamento dei dati personali.
 *
 * Non è un adempimento formale trascinato dentro per completezza: da quando
 * l'app ha un'anagrafica clienti, tratta dati di persone che non la useranno
 * mai e che hanno comunque dei diritti su quei dati. Questa pagina serve a
 * chi la usa per sapere cosa sta trattando e cosa deve dire ai propri clienti;
 * il testo è pensato per essere riutilizzato, non solo letto.
 */
export default function PaginaPrivacy() {
  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold mb-1">Dati personali e privacy</h1>
        <p className="text-sm text-ink-muted">
          Cosa tratta questa applicazione, dove finiscono i dati, e quali obblighi ricadono su di te da quando hai
          un&apos;anagrafica clienti. Aggiornata al 29/08/2026.
        </p>
      </div>

      <Sezione titolo="Chi tratta i dati">
        <p>
          Questa è un&apos;applicazione a utente singolo: i dati sono i tuoi e sono accessibili solo a te. Ogni
          tabella ha una policy di sicurezza a livello di riga che confronta l&apos;identificativo della tua sessione
          con il proprietario del dato: anche se un altro account si registrasse, non vedrebbe nulla di tuo.
        </p>
        <p>
          Il punto che cambia tutto è l&apos;anagrafica clienti. Da lì l&apos;applicazione tratta dati personali di
          persone diverse da te — nome, indirizzo, codice fiscale, email, telefono — e questo ti rende{" "}
          <strong className="text-ink">titolare del trattamento</strong> ai sensi del Regolamento UE 2016/679. Non è
          una formalità che riguarda il software: riguarda te.
        </p>
      </Sezione>

      <Sezione titolo="Quali dati vengono trattati">
        <Tabella
          intestazioni={["Categoria", "Contenuto", "Perché"]}
          righe={[
            ["Il tuo profilo", "Nome, codice fiscale, partita IVA, sede, IBAN", "Compaiono in fattura e nell'XML per lo SDI"],
            ["Clienti", "Denominazione o nome, sede, partita IVA o codice fiscale, contatti, codice destinatario", "Obbligatori per emettere una fattura elettronica valida"],
            ["Documenti", "Fatture, note di credito, righe, importi, date", "Sono la base del calcolo fiscale e vanno conservati"],
            ["Spese e incassi", "Importi, date, descrizioni", "Calcolo del reddito e del netto"],
            ["Log tecnico", "Punto del codice, messaggio d'errore, dettaglio tecnico", "Diagnosticare i malfunzionamenti"],
          ]}
        />
        <p className="text-xs">
          Il log tecnico non contiene dati dei clienti né il contenuto dei documenti: registra dove e perché il
          codice ha fallito, non su quali dati stava lavorando.
        </p>
      </Sezione>

      <Sezione titolo="Dove risiedono">
        <p>
          I dati sono su <strong className="text-ink">Supabase</strong> (database PostgreSQL gestito) e
          l&apos;applicazione gira su <strong className="text-ink">Vercel</strong>. Entrambi trattano i dati per tuo
          conto: nel linguaggio del GDPR sono <em>responsabili del trattamento</em>, e vanno nominati come tali con
          un accordo apposito — entrambi ne rendono disponibile uno standard. Verifica anche in quale regione sono
          ospitati i tuoi dati: incide sui trasferimenti extra-UE.
        </p>
      </Sezione>

      <Sezione titolo="Cosa devi fare tu, verso i tuoi clienti">
        <p>
          Sono adempimenti tuoi, non del software, e l&apos;applicazione non li assolve al posto tuo. Sono elencati
          qui perché sappia quali sono, non perché siano già a posto.
        </p>
        <Elenco
          voci={[
            ["Base giuridica", "Per i dati che servono a emettere e conservare una fattura non serve il consenso: il trattamento è necessario a un obbligo di legge e all'esecuzione del contratto. Serve invece un'altra base per usi ulteriori, ad esempio comunicazioni commerciali."],
            ["Informativa", "I tuoi clienti hanno diritto di sapere che tratti i loro dati, per quale finalità e per quanto tempo. Basta un testo breve, consegnato o linkato la prima volta che raccogli i dati."],
            ["Conservazione", "I documenti fiscali si conservano dieci anni. I dati non necessari a quello scopo non vanno tenuti oltre."],
            ["Diritti dell'interessato", "Accesso, rettifica, cancellazione, portabilità, opposizione. Oggi si esercitano a mano: l'app permette di modificare o eliminare un cliente, ma non ha una funzione dedicata di export o cancellazione su richiesta."],
            ["Registro dei trattamenti", "Obbligatorio solo in alcuni casi per chi ha meno di 250 dipendenti, ma il trattamento di dati fiscali con regolarità rientra tra le eccezioni che lo rendono opportuno."],
            ["Violazioni", "Se dei dati venissero esposti o persi, la notifica al Garante va fatta entro 72 ore dal momento in cui te ne accorgi."],
          ]}
        />
      </Sezione>

      <Sezione titolo="Cookie e tracciamento">
        <p>
          L&apos;applicazione non usa cookie di profilazione, non ha strumenti di analisi del comportamento e non
          include script di terze parti. Gli unici cookie sono quelli tecnici della sessione di autenticazione, senza
          i quali non potresti restare connesso: per questi non è richiesto alcun banner di consenso.
        </p>
      </Sezione>

      <div className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
        <p className="font-medium mb-1">Questo non è un parere legale</p>
        <p className="text-xs text-warn/90">
          È una ricognizione tecnica di cosa l&apos;applicazione tratta e di quali obblighi ne discendono secondo lo
          stato dell&apos;arte noto. Se l&apos;attività cresce oltre pochi clienti, o se tratti categorie particolari
          di dati, la posizione va verificata con un professionista.
        </p>
      </div>

      <p className="text-xs text-ink-faint">
        Le scelte tecniche che stanno dietro a questa pagina sono documentate in <code>DECISIONS.md</code>. Per i
        riferimenti normativi fiscali, vedi{" "}
        <Link href="/riferimenti-normativi" className="text-accent hover:underline">
          Riferimenti normativi
        </Link>
        .
      </p>
    </div>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">{titolo}</h2>
      <div className="flex flex-col gap-3 text-sm text-ink-muted">{children}</div>
    </section>
  );
}

function Tabella({ intestazioni, righe }: { intestazioni: string[]; righe: string[][] }) {
  return (
    <div className="rounded-xl border border-line bg-surface overflow-x-auto">
      <table className="w-full min-w-[520px] text-xs">
        <thead>
          <tr className="text-left text-ink-faint uppercase tracking-wide border-b border-line bg-surface-2">
            {intestazioni.map((intestazione) => (
              <th key={intestazione} className="px-3 py-2 font-medium">
                {intestazione}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {righe.map((riga) => (
            <tr key={riga[0]}>
              {riga.map((cella, i) => (
                <td key={i} className={`px-3 py-2 align-top ${i === 0 ? "text-ink whitespace-nowrap" : ""}`}>
                  {cella}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Elenco({ voci }: { voci: [string, string][] }) {
  return (
    <dl className="flex flex-col gap-3">
      {voci.map(([termine, descrizione]) => (
        <div key={termine} className="rounded-lg border border-line bg-surface px-4 py-3">
          <dt className="text-ink text-sm font-medium">{termine}</dt>
          <dd className="text-xs mt-1">{descrizione}</dd>
        </div>
      ))}
    </dl>
  );
}
