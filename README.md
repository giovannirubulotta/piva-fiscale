# Fiscale — GAR

Applicazione web personale per la gestione della P.IVA in regime forfettario: registro incassi (tassazione per cassa), calcolo di imposta sostitutiva e contributi INPS Gestione Separata, scadenzario con stato di pagamento, esportazione CSV per il commercialista.

Uso strettamente personale, single-user. Non gestisce l'invio di fatture al Sistema di Interscambio (SDI): quello resta sul portale gratuito "Fatture e Corrispettivi" dell'Agenzia delle Entrate o su un servizio di fatturazione a scelta — qui si registrano solo gli estremi e gli incassi, dopo l'emissione.

## Stack

Next.js 15 (App Router) + TypeScript, Supabase (Postgres + Auth, con Row Level Security su ogni tabella), Tailwind CSS. Deploy su Vercel.

## Struttura

- `lib/domain/` — logica di calcolo pura, senza dipendenze da Supabase o Next.js: coefficiente di redditività, aliquote, generazione dello scadenzario. Coperta da test (`lib/domain/*.test.ts`).
- `lib/data/` — accesso a Supabase, riceve un client già autenticato (dependency injection, non ne crea uno proprio: testabile e disaccoppiato dal contesto di richiesta).
- `app/(app)/` — pagine autenticate (dashboard, incassi, spese, scadenze, impostazioni).
- `app/login/` — accesso/registrazione.
- `app/api/report/` — esportazione CSV degli incassi.

Vedi `DECISIONS.md` per le scelte non ovvie e il loro perché.

## Sviluppo locale

```bash
npm install
cp .env.example .env.local   # compila con URL e anon key del progetto Supabase
npm run dev
```

## Verifiche

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run test        # Vitest — logica di calcolo e scadenzario
npm run build        # build di produzione
```

## Deploy

Deploy manuale su Vercel (nessun repository Git remoto collegato). Le variabili d'ambiente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` sono pubbliche per natura (protette da RLS lato database, non da segretezza) e vanno impostate nel progetto Vercel.

Un repository Git con deploy automatico ad ogni push è il passo naturale successivo, quando questo progetto avrà una destinazione (GitHub, GitLab...): oggi è assente, quindi il deploy è manuale e va ripetuto esplicitamente ad ogni modifica.

## Database

Le tabelle vivono nel progetto Supabase `gar-fascicolo`, con prefisso `fiscale_` per restare logicamente separate dal resto del progetto (gestione pratiche clienti). Ogni tabella ha Row Level Security attiva, con policy `auth.uid() = user_id`.

## Note di sicurezza note

- Registrazione account aperta (`supabase.auth.signUp`): per un'app single-user, valuta di disabilitare le registrazioni pubbliche dal pannello Supabase (Authentication → Providers) dopo aver creato il tuo account. Anche se qualcun altro si registrasse, RLS impedisce che veda dati diversi dai propri — ma è comunque una superficie da chiudere.
- `fiscale_aliquote` è scrivibile da qualsiasi utente autenticato (non solo dal proprietario): scelta deliberata per un'app a singolo utente dove "autenticato" coincide con "Giovanni". Se in futuro l'app diventasse multi-utente, questa policy va ristretta.
