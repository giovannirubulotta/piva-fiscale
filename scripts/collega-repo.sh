#!/usr/bin/env bash
#
# Collega il progetto a GitHub e a Vercel, in un comando solo.
#
# Serve perché è l'unico passo che non può essere fatto da un ambiente senza le
# tue credenziali: creare un repository sul tuo account GitHub e autorizzare
# Vercel a leggerlo. Tutto il resto — pipeline, branch, versionamento — è già
# scritto e committato: da qui in poi si attiva da solo.
#
# Cosa ottieni:
#   - deploy tracciato: ogni rilascio corrisponde a un commit, non a un comando
#     lanciato da una shell che nessuno rivede;
#   - staging gratuito: ogni pull request riceve un URL di anteprima;
#   - rollback in un click dalla dashboard Vercel;
#   - la pipeline di verifica gira a ogni push e blocca il merge se rossa.
#
# Uso:
#   ./scripts/collega-repo.sh [nome-repository]
#
set -euo pipefail

NOME_REPO="${1:-piva-fiscale}"
VERDE=$'\033[32m'; GIALLO=$'\033[33m'; ROSSO=$'\033[31m'; NEUTRO=$'\033[0m'

ok()      { echo "${VERDE}✓${NEUTRO} $1"; }
info()    { echo "  $1"; }
attenzione() { echo "${GIALLO}!${NEUTRO} $1"; }
errore()  { echo "${ROSSO}✗${NEUTRO} $1" >&2; exit 1; }

cd "$(dirname "$0")/.."

# --- Controlli preliminari -------------------------------------------------

[ -d .git ] || errore "Questa non sembra la cartella del progetto (manca .git)."

if [ -n "$(git status --porcelain)" ]; then
  errore "Ci sono modifiche non committate. Committale prima di collegare il remote."
fi

if git remote get-url origin >/dev/null 2>&1; then
  ok "Il remote 'origin' esiste già: $(git remote get-url origin)"
  SALTA_CREAZIONE=1
else
  SALTA_CREAZIONE=0
fi

# --- 1. Repository GitHub --------------------------------------------------

if [ "$SALTA_CREAZIONE" -eq 0 ]; then
  if command -v gh >/dev/null 2>&1; then
    if ! gh auth status >/dev/null 2>&1; then
      attenzione "GitHub CLI non autenticato. Eseguo 'gh auth login'."
      gh auth login
    fi
    info "Creo il repository privato '$NOME_REPO' e faccio il push…"
    # --private: il repository contiene la logica fiscale e i riferimenti al
    # progetto Supabase. Nessun segreto è committato, ma non c'è motivo di
    # renderlo pubblico.
    gh repo create "$NOME_REPO" --private --source=. --remote=origin --push
    ok "Repository creato e codice caricato."
  else
    attenzione "GitHub CLI ('gh') non installato."
    echo
    echo "  Due strade:"
    echo "    a) installa gh — https://cli.github.com — e rilancia questo script;"
    echo "    b) crea a mano un repository VUOTO e privato su https://github.com/new"
    echo "       (senza README, senza .gitignore, senza licenza), poi esegui:"
    echo
    echo "         git remote add origin git@github.com:<tuo-utente>/$NOME_REPO.git"
    echo "         git push -u origin main"
    echo "         ./scripts/collega-repo.sh    # rilancia per la parte Vercel"
    echo
    exit 1
  fi
fi

# --- 2. Collegamento a Vercel ---------------------------------------------

echo
if command -v vercel >/dev/null 2>&1; then
  VERCEL_CMD="vercel"
else
  info "Vercel CLI non installato: uso npx."
  VERCEL_CMD="npx --yes vercel@latest"
fi

info "Collego il repository al progetto Vercel…"
if $VERCEL_CMD git connect 2>&1 | tee /tmp/vercel-connect.log; then
  ok "Repository collegato a Vercel."
else
  attenzione "Collegamento automatico non riuscito. Fallo dalla dashboard:"
  echo "    Vercel → progetto → Settings → Git → Connect Git Repository"
fi

# --- 3. Promemoria sulle variabili d'ambiente -----------------------------

echo
attenzione "Verifica che le variabili siano impostate su Vercel (Settings → Environment Variables):"
echo "    NEXT_PUBLIC_SUPABASE_URL"
echo "    NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  per gli ambienti Production, Preview e Development."
echo
echo "  Non vanno committate: '.env*' è già in .gitignore."

# --- 4. Da qui in avanti ---------------------------------------------------

echo
ok "Fatto. Da adesso il flusso è:"
cat <<'FLUSSO'

    git switch -c feat/nome-funzionalita
    # ... lavoro, commit in Conventional Commits ...
    git push -u origin feat/nome-funzionalita

  Aprendo la pull request, GitHub esegue la pipeline di verifica (tipi, lint,
  test, contrasto, build, budget, end-to-end) e Vercel crea l'ambiente di
  anteprima. Il merge su main rilascia in produzione.

  Il deploy manuale dalla shell non serve più.
FLUSSO
