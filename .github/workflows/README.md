# Pipeline

`verifica.yml` gira su ogni push a `main` e su ogni pull request. Tutti i passi
sono bloccanti.

È attiva. Il repository è `giovannirubulotta/piva-fiscale`, privato, e la
Action gira da sola a ogni push: non c'è nulla da configurare su GitHub, i due
valori usati nel passo di build sono finti e scritti nel workflow.

## Perché `typecheck` chiama `next typegen`

Next genera in `.next/types` i tipi delle rotte — `LayoutProps`, `PageProps` e
simili — che il codice usa come se fossero globali. In locale quella cartella
esiste da una build precedente e `tsc` la trova; su un checkout pulito no, e il
controllo dei tipi fallisce su codice perfettamente corretto.

Il primo giro di CI si è fermato esattamente lì. Non era un falso positivo: era
la CI che faceva il suo mestiere, cioè verificare il codice come lo troverebbe
un altro sviluppatore, e non come lo trova la macchina che ci ha già lavorato
sopra. Da qui `next typegen && tsc --noEmit`: i tipi si generano prima di
controllarli, ovunque si esegua il comando.

## Deployment e ambiente di staging

Collegando lo stesso repository a Vercel (Project Settings → Git) si ottengono
tre cose che al momento della scrittura mancano ancora:

- **deploy tracciato**: ogni rilascio in produzione corrisponde a un commit su
  `main`, non a un comando lanciato da una shell;
- **staging gratuito**: ogni pull request riceve un preview deployment con il
  suo URL, così le modifiche si provano prima di arrivare in produzione;
- **rollback in un click**: dalla dashboard Vercel si ripristina il deployment
  precedente senza rifare la build.

Le variabili d'ambiente reali (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`) vanno impostate in Vercel, mai committate.

## Branch e rilasci

Lo standard vieta modifiche dirette su `main` in un progetto in produzione:

```bash
git switch -c feat/nome-funzionalita   # oppure fix/, refactor/, docs/
# ... lavoro, commit in Conventional Commits ...
git push -u origin feat/nome-funzionalita
# pull request: la CI gira e Vercel crea il preview deployment
```

Il merge su `main` fa il deploy in produzione. I commit fino alla 1.0.1 sono su
`main` perché il repository è nato locale e senza remote: da lì in avanti si
passa dai branch.

Il numero di versione in `package.json` e `CHANGELOG.md` si alza al merge:
**MAJOR** quando cambia il calcolo delle imposte o il formato dei documenti
trasmessi, **MINOR** per nuove funzionalità, **PATCH** per correzioni.

## Autore dei commit, e perché Vercel può rifiutare un deploy

Su piano Hobby, Vercel costruisce solo i commit il cui **autore** risulta essere
il titolare dell'account. Se l'autore è un indirizzo che GitHub non associa a
`giovannirubulotta`, il deploy si ferma con:

> The deployment was blocked because the commit author did not have contributing
> access to the project on Vercel.

Il messaggio suggerisce di passare al piano Pro, ma nel nostro caso non c'è
nessun collaboratore da aggiungere: è lo stesso autore, con un indirizzo che
GitHub non riconduce all'account. I commit fino alla 1.4.0 erano firmati
`info@netrak.fr`, l'indirizzo del brand dismesso.

L'autore corretto è l'indirizzo `noreply` dell'account, che GitHub garantisce
essere associato a quell'utente e che non espone un indirizzo reale:

```bash
git config user.name  "Giovanni Rubulotta"
git config user.email "322631924+giovannirubulotta@users.noreply.github.com"
```

La storia precedente **non è stata riscritta**: cambiare l'autore di cinquanta
commit significa cambiarne tutti gli hash, costringere ogni copia locale a un
`reset --hard` e mettere a rischio lavoro non ancora caricato, in cambio di
un'attribuzione più ordinata su commit già passati. La correzione vale da qui in
avanti; se un giorno servisse anche per il passato, si fa con `git filter-repo` e
una `.mailmap`, sapendo cosa costa.

## Commit firmati

Vercel annulla i deploy creati da un commit non verificato:

> The Deployment was canceled because it was created with an unverified commit

È una protezione ragionevole per un progetto che va in produzione da solo a ogni
push: senza firma, chiunque ottenga un token con permesso di scrittura può
mandare codice in produzione a nome tuo, e la storia non conserva alcuna prova
di chi l'abbia scritto davvero.

I commit sono quindi firmati con una chiave GPG il cui indirizzo è quello
`noreply` dell'account, così GitHub li marca **Verified**:

```bash
git config user.signingkey <ID-CHIAVE>
git config commit.gpgsign true
```

La chiave pubblica va aggiunta una volta su GitHub, in *Settings → SSH and GPG
keys → New GPG key*. La chiave privata resta nell'ambiente in cui si scrive il
codice e non entra mai nel repository.

I commit precedenti restano non firmati: rifirmarli significherebbe riscrivere
la storia e cambiare tutti gli hash. Per portare in produzione un commit già
esistente e non firmato, si usa *Deployments → … → Create Deployment* dalla
dashboard Vercel, che è un'azione del titolare e non passa dal controllo sulla
firma.
