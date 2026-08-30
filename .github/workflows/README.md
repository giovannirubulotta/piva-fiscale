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
