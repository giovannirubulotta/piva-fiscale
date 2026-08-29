# Pipeline

`verifica.yml` gira su ogni push a `main` e su ogni pull request. Tutti i passi
sono bloccanti.

## Come attivarla

Il repository non ha ancora un remote. Per collegarlo:

```bash
# 1. Crea un repository vuoto e privato su GitHub (senza README, senza .gitignore)
# 2. Collega il remote e fai il primo push
git remote add origin git@github.com:<utente>/piva-fiscale.git
git push -u origin main
```

Da quel momento la Action gira da sola: non serve configurare nulla su GitHub,
i due segreti usati nel passo di build sono valori finti scritti nel workflow.

## Deployment e ambiente di staging

Collegando lo stesso repository a Vercel (Project Settings → Git) si ottengono
tre cose che oggi mancano:

- **deploy tracciato**: ogni rilascio in produzione corrisponde a un commit su
  `main`, non a un comando lanciato da una shell;
- **staging gratuito**: ogni pull request riceve un preview deployment con il
  suo URL, così le modifiche si provano prima di arrivare in produzione;
- **rollback in un click**: dalla dashboard Vercel si ripristina il deployment
  precedente senza rifare la build.

Le variabili d'ambiente reali (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`) vanno impostate in Vercel, mai committate.

## Branch e rilasci

Lo standard vieta modifiche dirette su `main` in un progetto in produzione. Una
volta collegato il remote:

```bash
git switch -c feat/nome-funzionalita   # oppure fix/, refactor/, docs/
# ... lavoro, commit in Conventional Commits ...
git push -u origin feat/nome-funzionalita
# pull request: la CI gira e Vercel crea il preview deployment
```

Il merge su `main` fa il deploy in produzione. I commit fatti finora sono su
`main` perché il repository era locale e senza remote: da qui in avanti si passa
dai branch.

Il numero di versione in `package.json` e `CHANGELOG.md` si alza al merge:
**MAJOR** quando cambia il calcolo delle imposte o il formato dei documenti
trasmessi, **MINOR** per nuove funzionalità, **PATCH** per correzioni.
