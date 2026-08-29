# Fiscale — GAR

Applicazione web personale per la gestione della partita IVA in regime
forfettario: fatturazione elettronica con generazione del file XML per il
Sistema di Interscambio, anagrafica clienti, calcolo di imposta sostitutiva e
contributi INPS Gestione Separata, scadenzario, generatore F24, riepilogo del
Quadro LM e base di conoscenza normativa consultabile.

Uso strettamente personale, single-user. Non trasmette nulla all'Agenzia delle
Entrate: produce il file XML valido, che va caricato sul portale "Fatture e
Corrispettivi" con SPID, CIE o Fisconline — un contribuente può farlo da sé,
senza intermediario e senza firma digitale.

**URL live:** https://project-jr16d.vercel.app

## Stack

Next.js 16 (App Router) e TypeScript in modalità strict, Supabase (Postgres +
Auth, con Row Level Security su ogni tabella), Tailwind CSS v4, Vitest. Deploy
su Vercel.

## Struttura

Tre strati, con dipendenze in una sola direzione: il dominio non conosce il
database, il database non conosce l'interfaccia.

- **`lib/domain/`** — logica pura, nessuna dipendenza da Supabase o Next.js:
  calcolo dell'imponibile e delle imposte, scadenzario, generazione dell'XML
  FatturaPA, soglie del regime forfettario. È lo strato coperto dai test.
- **`lib/data/`** — accesso a Supabase. Riceve un client già autenticato invece
  di crearne uno (dependency injection): testabile e disaccoppiato dal contesto
  di richiesta. Unico punto in cui lo `snake_case` del database e il `camelCase`
  del dominio si toccano, in `mappers.ts`.
- **`app/(app)/`** — pagine autenticate (Server Components) e Server Actions.
- **`lib/osservabilita/`** — logging strutturato degli errori.
- **`lib/content/`** — testi editoriali: spiegazioni dei campi e riferimenti
  normativi, separati dai componenti che li mostrano.

Altri documenti:

- **`DECISIONS.md`** — le scelte non ovvie e il loro perché, incluse le
  correzioni di calcolo trovate strada facendo. Da leggere prima di modificare
  la logica fiscale.
- **`DESIGN.md`** — palette, tipografia, spaziature, componenti, accessibilità.
- **`.github/workflows/README.md`** — come attivare CI, staging e rollback.

## Sviluppo locale

```bash
npm install
cp .env.example .env.local   # URL e anon key del progetto Supabase
npm run dev
```

I segreti non stanno mai nel codice: `.env*` è in `.gitignore` e le variabili di
produzione vivono solo tra le Environment Variables del progetto Vercel, escluse
dal deploy anche via `.vercelignore`.

## Verifica

```bash
npm run verifica     # tutto quanto sotto, in sequenza
```

Oppure singolarmente:

| Comando | Cosa controlla |
|---|---|
| `npm run typecheck` | Tipi, in modalità strict |
| `npm run lint` | ESLint |
| `npm run test` | Test del dominio fiscale (Vitest) |
| `npm run contrasto` | Contrasto WCAG 2.1 AA su tutte le combinazioni di colore |
| `npm run build` | Build di produzione |
| `npm run budget` | Performance budget sul peso del JavaScript |

Tutti bloccanti, tutti in CI (`.github/workflows/verifica.yml`).

### Cosa è coperto dai test

I test coprono la logica di dominio: calcolo di imposta e contributi, soglie e
cause di esclusione dal forfettario, scadenzario, righe F24, Quadro LM, totali
di fattura e generazione dell'XML. Non coprono ancora i flussi end-to-end
(autenticazione, salvataggio di una fattura dall'interfaccia): è il gap noto più
rilevante sul fronte qualità, annotato in `DECISIONS.md`.

## Deployment

Il deploy avviene su Vercel. Finché il repository non ha un remote git
collegato, parte manualmente e non è tracciato:

```bash
npx vercel@latest deploy --prod --token=<token>
```

Collegare il repository a GitHub e a Vercel sostituisce questo comando con un
deploy tracciato per commit, un ambiente di staging per ogni pull request e il
rollback in un click — vedi `.github/workflows/README.md`.

### Migrazioni del database

Le tabelle vivono nel progetto Supabase `gar-fascicolo`, con prefisso `fiscale_`
per restare separate dal resto del progetto. Ogni tabella ha Row Level Security
attiva con policy `auth.uid() = user_id`.

Lo schema si modifica con migrazioni, mai a mano dalla dashboard. Dopo ogni
migrazione va rigenerato `lib/supabase/database.types.ts`, che è un file
generato e non va modificato a mano.

## Dati personali

L'anagrafica clienti contiene dati personali di terzi (nome, indirizzo, codice
fiscale, contatti): questo rende l'utilizzatore **titolare del trattamento** ai
sensi del GDPR, con obblighi che l'applicazione da sola non assolve. Vedi la
sezione dedicata in `DECISIONS.md`.

## Note di sicurezza aperte

- Registrazione account aperta (`supabase.auth.signUp`): per un'app a utente
  singolo conviene disabilitare le registrazioni pubbliche dal pannello Supabase
  (Authentication → Providers) dopo aver creato il proprio account. Anche se
  qualcun altro si registrasse, RLS gli impedirebbe di vedere dati altrui — ma
  resta una superficie da chiudere.
- `fiscale_aliquote` è scrivibile da qualsiasi utente autenticato, non solo dal
  proprietario: scelta deliberata finché "autenticato" coincide con una sola
  persona. Se l'app diventasse multi-utente, questa policy va ristretta.
