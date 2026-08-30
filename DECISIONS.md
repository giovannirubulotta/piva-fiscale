# Decisioni

Sintetiche, non un processo formale — solo il "perché" dietro le scelte non ovvie.

## Tassazione per cassa, non per competenza

Il regime forfettario tassa gli incassi effettivi dell'anno, non le fatture emesse. `fiscale_incassi` distingue quindi `data_emissione` da `data_incasso`, e ogni calcolo fiscale (`lib/domain/calcolo.ts`) filtra su `data_incasso` e sullo stato `incassata`. Una fattura emessa ma non ancora pagata non entra nel reddito imponibile finché non risulta incassata.

## Aliquote versionate in tabella, mai nel codice

`fiscale_aliquote` (una riga per anno) invece di costanti nel codice. Le aliquote di imposta sostitutiva e contributi INPS cambiano quasi ogni legge di bilancio: un valore hardcoded avrebbe richiesto una modifica e un redeploy ogni gennaio. Il fallback (`aliquoteAnno` in `lib/domain/calcolo.ts`) usa l'anno più recente disponibile se manca quello richiesto, così l'app non si rompe a inizio anno prima di aver inserito le nuove aliquote — ma è un'approssimazione prudente, non un dato accertato.

## Aliquota 5% mai assunta di default

`fiscale_profilo.agevolazione_5_percento` è un booleano nullable, non un default `true`. Finché non è confermato esplicitamente (dopo verifica con un commercialista, per via della pregressa micro-entreprise francese), il calcolo usa il 15% standard. È la scelta che minimizza il rischio economico in caso di conguaglio, non quella che minimizza le tasse mostrate a schermo.

## Stato di pagamento delle scadenze separato dal loro calcolo

Le scadenze (saldo, acconti, bollo) sono generate a runtime da `lib/domain/scadenzario.ts`, non salvate come righe calcolate. Solo lo stato "pagato/non pagato" (`fiscale_scadenze_stato`, chiave stabile tipo `2026-saldo-imposta`) è persistito. Evita di avere due fonti di verità sullo stesso importo: se cambia la logica di calcolo, non serve una migrazione dati.

## Schema condiviso col progetto `gar-fascicolo`, tabelle prefissate

Il piano gratuito Supabase dell'organizzazione era già al limite di due progetti attivi. Le tabelle di questa app vivono quindi nello stesso progetto `gar-fascicolo` (pratiche clienti), con prefisso `fiscale_` per separazione logica, invece che in uno schema Postgres dedicato — esporre uno schema diverso da `public` alle API automatiche richiede una configurazione lato pannello Supabase non raggiungibile dagli strumenti disponibili in questa sessione. RLS scoped su `auth.uid()` isola comunque i dati riga per riga, indipendentemente dal namespacing delle tabelle.

## Nessuna integrazione con il Sistema di Interscambio

L'invio telematico di fatture elettroniche richiede un canale certificato (portale Fatture e Corrispettivi, o un provider a pagamento con API). Costruire quell'integrazione da zero senza un abbonamento attivo a un provider non è stato valutato in scope per la prima versione: l'app registra gli incassi dopo l'emissione, non li spedisce.

## Nome progetto Vercel generico (`project-jr16d`)

La creazione di un nuovo progetto Vercel con nome scelto (`piva-fiscale` o simile) ha restituito un errore di permessi (403) nell'account/team collegato a questa sessione. È stato quindi riutilizzato un progetto Vercel preesistente dal nome generico assegnato automaticamente. Non incide sul funzionamento — l'URL pubblico (`project-jr16d.vercel.app`) è comunque stabile — ma va tenuto presente se in futuro si vorrà rinominare il progetto dal pannello Vercel (operazione che i permessi correnti non hanno permesso di fare in automatico).

**Superato in fase 9.** Il 403 non era una questione di permessi ma di identità: il progetto stava su un account Vercel diverso da quello dell'utente. Ora il progetto si chiama `piva-fiscale` e risponde su `piva-fiscale.vercel.app`.

## Coefficiente di redditività derivato dal codice ATECO, con fallback esplicito

`fiscale_coefficienti_ateco` mappa i prefissi ATECO (senza punti, es. `"73"`, `"4781"`) ai 9 gruppi dell'Allegato 4 L. 190/2014 (come modificato dall'art. 1 co. 87 L. 208/2015). `lib/domain/ateco.ts` cerca il prefisso più specifico (più lungo) che corrisponde al codice inserito; se nessuno corrisponde, ricade sulla voce di default (`prefisso_ateco = ''`, gruppo 9 "altre attività economiche", 67%) — che nella tabella ufficiale è già la categoria residuale, non un'approssimazione inventata qui. Solo i gruppi 1-8 sono enumerati esplicitamente (~35 prefissi): enumerare anche le ~70 divisioni del gruppo 9 sarebbe stato ridondante e più a rischio di errore di trascrizione, dato che "tutto il resto" è già la definizione del gruppo 9.

La riclassificazione ATECO 2025 (in vigore dal 1/1/2025) non ha modificato le divisioni a 2 cifre né i coefficienti storici (verificato via ricerca web il 28/08/2026), quindi la tabella resta valida senza bisogno di una tabella di conversione separata.

`ProfiloForm.tsx` applica il coefficiente rilevato automaticamente ad ogni modifica del codice ATECO, ma il campo resta un input modificabile: un'attività con un codice ATECO "di comodo" non allineato al reale settore economico resta un caso reale, e forzare l'automatismo senza via d'uscita avrebbe reintrodotto lo stesso rischio di conguaglio che la scelta prudente sul 5% (sopra) evita altrove. Il messaggio sotto il campo segnala esplicitamente quando è stato usato il fallback di gruppo 9, cosa che merita una verifica in più.

**Fonti (verificate il 28/08/2026, non primarie — Gazzetta Ufficiale non consultata direttamente):** [Coefficienti ATECO Forfettario 2026 — Calcola-Tasse.it](https://calcola-tasse.it/coefficienti-redditivita-ateco-forfettario/), [Coefficienti di Redditività ATECO — forfettari.it](https://www.forfettari.it/coefficienti-ateco) (conferma indipendente e nota sulla continuità ATECO 2025). Aliquote INPS 2026 (26,07% / 24%, massimale 122.295 €, minimale 18.808 €) già presenti in `fiscale_aliquote` e confermate su due fonti indipendenti: [Assolombarda](https://www.assolombarda.it/servizi/lavoro-e-previdenza/informazioni/gestione-separata-inps-valori-annui-2026), [FiscoeTasse (circolare INPS n. 8/2026)](https://www.fiscoetasse.com/new-rassegna-stampa/3491-gestione-separata-inps-2026-aliquote-e-massimali-contributivi.html). Soglie regime forfettario (85.000 € / 100.000 €) e aliquote sostitutiva (15%/5%) confermate invariate per il 2026 su [FiscoeTasse](https://www.fiscoetasse.com/approfondimenti/15066-regime-forfettario-2026-tutte-le-regole.html).

## "Sostituire il commercialista": scope a fasi, non tutto insieme

Richiesta dell'utente: coprire tutto ciò che fa un commercialista, con aggiornamento continuo e un pulsante informativo su ogni campo. Prima di implementare è stato comunicato esplicitamente un limite: un software non può assumersi la responsabilità professionale (assicurazione, firma, visto di conformità) né il giudizio su casi limite propri di un dottore commercialista — quindi l'obiettivo realistico è coprire a fondo la parte calcolabile/proceduralizzabile del caso specifico (libero professionista, forfettario, Gestione Separata, nessun dipendente), non sostituire la professione. Concordato con l'utente un avanzamento a fasi, mostrando ogni fase completata prima di passare alla successiva, invece di un unico intervento su tutto il perimetro.

Fase 1 (questa): pulsanti informativi "ⓘ" su ogni campo esistente + autovalutazione delle cause di esclusione dal regime forfettario. Fasi successive previste: F24 (calcolo codici tributo/importi pronti da copiare), riepilogo per la dichiarazione dei redditi (Quadro LM), adempimenti accessori.

## Pulsante informativo "ⓘ" su ogni campo (`InfoCampo`)

`components/InfoCampo.tsx` usa `<details>`/`<summary>` nativi invece di uno stato React per il toggle: accessibile da tastiera e screen reader senza ARIA aggiuntiva, niente gestione di click-outside, e soprattutto niente bisogno di `"use client"` aggiuntivo — il componente funziona anche importato dentro form già client-side. Il testo delle spiegazioni vive separato in `lib/content/spiegazioniCampi.ts` (cosa\_è / dove\_si\_trova / riferimento normativo): cambiare un testo non tocca la UI, e viceversa.

## Autovalutazione delle cause di esclusione dal regime forfettario, non un accertamento

`fiscale_requisiti_forfettario` registra una dichiarazione annuale dell'utente sulle 4 cause di esclusione soggettive (art. 1 commi 57 e 71 L. 190/2014): redditi da lavoro dipendente/pensione oltre 35.000€, partecipazioni societarie riconducibili, committente prevalente ex datore di lavoro, residenza fuori UE/SEE. Ogni campo è un booleano nullable (stesso pattern prudente di `agevolazione_5_percento`): `null` = non ancora verificato, non "non si applica". `lib/domain/requisitiForfettario.ts` (`valutaRequisitiForfettario`) restituisce "escluso" se anche un solo campo è `true`, "da_verificare" se anche un solo campo è `null` (mai silenziosamente "ok" per assenza di dati), "ok" solo se tutti e 4 sono confermati `false`.

La verifica delle soglie di fatturato (85.000€ permanenza / 100.000€ uscita immediata, `valutaSoglieForfettario`) è invece calcolata, non dichiarata: riusa `fatturatoIncassatoAnno` già esistente in `lib/domain/calcolo.ts`, nessuna duplicazione della logica di filtro sugli incassi.

Il tutto resta un'autovalutazione dichiarata dall'utente, non un accertamento: un "ok" significa "hai confermato di aver controllato", non "il software ha verificato per te". La pagina `/requisiti` lo dice esplicitamente, e un esito "escluso" genera un avviso in dashboard che rimanda comunque alla verifica con un commercialista.

## Deploy via Vercel CLI, non via invio diretto dell'intero albero file

Lo strumento di deploy diretto disponibile in questa sessione richiede l'intero albero dei file del progetto in un'unica chiamata (nessun aggiornamento incrementale: ogni deploy sostituisce interamente il precedente). Con l'app cresciuta oltre una certa dimensione, quella chiamata risultava sistematicamente troncata a un sottoinsieme dei file — senza errore esplicito — causando build falliti in produzione (`Module not found` sugli import mancanti). Verificato empiricamente con più tentativi, a parità di contenuto per file più o meno compatto: il limite non dipende dai byte per file ma da un tetto sul numero di elementi trasmissibili in una singola chiamata.

La correzione adottata è il deploy tramite Vercel CLI (`npx vercel deploy --prod`), autenticato con un token dell'account Vercel: la CLI legge i file direttamente dal disco e li carica per intero (verificato: tutti i file del progetto in un solo comando, nessun troncamento), aggirando il limite dello strumento diretto. Il repository Git con deploy automatico (vedi sezione precedente) resta la soluzione più solida sul lungo periodo — non richiede un token da rinnovare né un comando manuale a ogni modifica — ma la creazione di un nuovo repository non è risultata possibile dall'ambiente di questa sessione (token GitHub disponibile ma scoped a repository preconfigurati, nessuno presente per questo progetto).

`vercel.json` fissa esplicitamente `"framework": "nextjs"` perché il progetto Vercel non aveva mai salvato un framework a livello di progetto (`framework: null`): senza quell'indicazione la CLI tentava un deploy generico cercando una cartella `public/` di output statico, invece di eseguire la build Next.js.

`.vercelignore` esclude `.env*` dal caricamento: le variabili d'ambiente pubbliche (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) sono ora impostate come Environment Variables del progetto Vercel (Production, Preview, Development), non più spedite come file — coerente con quanto il README dichiarava già, ma che nessun deploy precedente aveva effettivamente applicato (il progetto Vercel non aveva alcuna Environment Variable configurata: i deploy passati funzionavano solo perché il file `.env.production`/`.env.local` veniva incluso, senza volerlo, nell'albero inviato allo strumento diretto).

## Navigazione mobile con `<details>`/`<summary>`, non con stato React

`app/(app)/layout.tsx` aveva solo la barra laterale fissa (`w-56`), inutilizzabile su schermo di telefono. La versione mobile (visibile sotto il breakpoint `md`) riusa lo stesso pattern già adottato in `InfoCampo`: un `<details>` come contenitore del menu, `<summary>` come pulsante "Menu"/"Chiudi" — niente `"use client"` né `useState`, il layout resta un Server Component. Le tabelle di incassi/spese/scadenze scorrono in orizzontale (`overflow-x-auto` + `min-w` sulla tabella) invece di schiacciare le colonne su schermi stretti.

## Aliquota INPS priva di soglia di esenzione per gli acconti

Per l'imposta sostitutiva la soglia di esenzione (51,65 €) e la rata unica (sotto 257,52 €) sono normate esplicitamente. Per i contributi INPS Gestione Separata non è stata reperita una soglia equivalente confermata: `lib/domain/scadenzario.ts` applica le stesse soglie per coerenza, segnalato con un commento nel codice. È un'approssimazione da verificare con un commercialista prima di fare affidamento sull'assenza di un acconto INPS di importo esiguo.

## Correzione: acconto imposta sostitutiva 40%/60%, non 50%/50%

`lib/domain/scadenzario.ts` divideva l'acconto dell'imposta sostitutiva (quando sopra la soglia di rata unica) in due rate uguali del 50%. La regola generale degli acconti sulle imposte dirette (art. 17 comma 3 DPR 435/2001, applicabile anche all'imposta sostitutiva forfettaria) prevede invece **40% entro il 30/6 (codice 1790) e 60% entro il 30/11 (codice 1791)**. Bug di calcolo pre-esistente, non un cambio normativo: la regola 40/60 non è recente. Corretto in `scadenzeAccontoImposta`, con test aggiornati (`scadenzario.test.ts`).

**Fonti (verificate il 28/08/2026):** Circolare Agenzia delle Entrate 9/E del 2/5/2024 (richiamata da più fonti secondarie concordanti sulla ripartizione 40/60), conferma indipendente su Money.it e Fiscozen.

## Correzione: l'acconto INPS Gestione Separata non ha soglia di esenzione né di rata unica

Risolve il caveat sopra ("Aliquota INPS priva di soglia di esenzione per gli acconti"). Verificato: l'acconto INPS Gestione Separata **non condivide le regole dell'imposta sostitutiva**. È sempre pari all'80% del saldo dell'anno precedente, versato in **due rate uguali del 40% ciascuna** (30/6 e 30/11, codice P10) — nessuna soglia di esenzione (51,65 €) né di rata unica (257,52 €), a differenza dell'imposta sostitutiva. Prima di questa correzione `scadenzeSaldoEAcconto` applicava per coerenza le stesse soglie e la stessa ripartizione dell'imposta sostitutiva: un'approssimazione, non solo un'imprecisione nell'importo, perché su importi piccoli ometteva del tutto l'acconto INPS dovuto. Corretto con una funzione dedicata (`scadenzeAccontoInps`), separata da `scadenzeAccontoImposta`: le due regole sono ora esplicitamente indipendenti nel codice, non condivise per comodità.

**Fonti (verificate il 28/08/2026, due fonti indipendenti concordanti):** Fiscoetasse.com, Fiscozen.it.

## Correzione: l'imposta sostitutiva si calcola sul reddito netto dei contributi INPS, non sul reddito lordo

Difetto più rilevante trovato durante la costruzione del Quadro LM (sotto): `calcolaRiepilogoAnno` calcolava l'imposta sostitutiva applicando l'aliquota (15%/5%) direttamente al reddito forfettario lordo (ricavi × coefficiente di redditività). La norma (art. 1 comma 64 L. 190/2014: "il reddito [...] è ridotto dei contributi previdenziali dovuti per legge") prevede invece che i contributi INPS vadano **dedotti dal reddito prima** di applicare l'aliquota sostitutiva — esattamente la sequenza LM34 (reddito lordo) → LM35 (contributi dedotti) → LM36 (reddito netto) → LM38 (base imponibile) → LM39 (imposta) del Quadro LM.

Effetto pratico: l'app sovrastimava sistematicamente l'imposta sostitutiva (e quindi il "totale da accantonare" mostrato in dashboard) di un importo pari all'aliquota sostitutiva applicata ai contributi INPS dell'anno — su un caso da 10.000 € incassati con coefficiente 78%, circa 305 € di imposta sostitutiva mostrata in eccesso (1.170 € invece di 864,98 €), su un'imposta totale invariata di poco inferiore (contributi INPS pari, imposta sostitutiva minore). Corretto in `calcolaRiepilogoAnno` (`lib/domain/calcolo.ts`), con la base che non scende comunque sotto zero (coerente con LM36/LM49 nel Quadro LM). Approssimazione nota mantenuta, e segnalata nel Quadro LM (rigo LM35): la deduzione usa i contributi INPS calcolati per competenza sul reddito dello stesso anno, non quelli realmente versati per cassa nell'anno (che per il meccanismo di acconto/saldo possono riferirsi in parte all'anno precedente) — un affinamento ulteriore, di ordine secondario rispetto all'omissione completa della deduzione qui corretta.

**Fonti (verificate il 28/08/2026, due fonti indipendenti concordanti oltre al testo di legge):** InformazioneFiscale.it, Finom.co.

**Nota collegata, non risolta in questa passata:** `AliquoteAnno.massimaleInps`/`minimaleInps` sono raccolti in Impostazioni e salvati a DB, ma non applicati da nessun calcolo: il massimale (tetto di reddito oltre il quale l'aliquota INPS Gestione Separata non si applica più) non è implementato. Impatto limitato per un reddito forfettario tipico (il massimale, ~122.295 € nel 2026, è ben oltre il tetto di ricavi del regime forfettario nella maggior parte dei casi con coefficiente ≤ 78%), ma resta un gap da colmare se il reddito imponibile si avvicina alla soglia.

## Fase 2: Genera F24 e Quadro LM

Secondo intervento della roadmap a fasi (vedi "Sostituire il commercialista" sopra). Entrambe le funzionalità costruite insieme, su richiesta esplicita dell'utente.

**`/f24`** (`lib/domain/f24.ts`): raggruppa le scadenze non pagate (annuali + bollo virtuale) per data di versamento in "moduli" — ogni data che cade nello stesso giorno va compilata sullo stesso modello F24, in righe distinte per sezione (Erario/INPS) e codice tributo. Aggiunto anche il codice tributo reale del bollo virtuale (2521-2524, uno per trimestre), che prima era un'etichetta segnaposto ("bollo virtuale") in `/scadenze` — altra imprecisione pre-esistente, minore, corretta nello stesso intervento. Il campo "rateazione" segue la convenzione generale NNRR (rata corrente/rate totali) del modello F24; per il bollo virtuale il campo va lasciato in bianco (si versa sempre in un'unica soluzione per trimestre, per istruzione esplicita dell'Agenzia delle Entrate sul codice 2521). Il generatore non trasmette nulla: prepara solo i dati da ricopiare, con un avviso esplicito di verificare rateazione e codici sul sito dell'Agenzia delle Entrate prima dell'invio.

**`/quadro-lm`** (`lib/domain/quadroLm.ts`): mappa il riepilogo dell'anno sui righi principali della sezione del Quadro LM dedicata al regime forfettario (LM21, LM22-27, LM34-39, LM40-42, LM43-44, LM45, LM46-47, LM49). Numerazione dei righi verificata su più fonti indipendenti concordanti; il numero della sezione ("II" o "III") non è invece riportato in etichetta, perché le fonti sono discordanti su questo singolo dettaglio dopo l'abolizione, dal modello Redditi PF 2025, della precedente sezione "Tassa piatta incrementale" — verificare il numero di sezione sulle istruzioni ufficiali del modello dell'anno di presentazione. Gestisce solo il caso di una singola attività, nessuna perdita pregressa, nessun credito d'imposta, nessuna ritenuta, nessuna eccedenza da anni precedenti: scenari che l'app non traccia, segnalati come tali nei righi corrispondenti. LM35 (contributi dedotti) e LM45 (acconti versati) sono marcati esplicitamente "da verificare": usano proxy calcolati dall'app (contributi per competenza, acconti segnati come pagati nello scadenzario) al posto dei valori realmente versati per cassa, che l'app non conosce con certezza.

**Fonti sulla struttura del Quadro LM (verificate il 28/08/2026, tre fonti indipendenti concordanti sulla numerazione dei righi):** Pyva.it, Fiscomania.com, Fiscoetasse.com (quest'ultima anche sull'abolizione della sezione "Tassa piatta incrementale" dal modello Redditi PF 2025).

## Correzione: "libero professionista", non "ditta individuale"

L'utente ha corretto un'imprecisione nella documentazione e nei testi informativi dell'app: Giovanni è un libero professionista (reddito di lavoro autonomo, art. 53 TUIR), non un titolare di ditta individuale (reddito d'impresa, art. 55 TUIR). La distinzione non è solo terminologica: un libero professionista non si iscrive al Registro delle Imprese (a differenza di una ditta individuale), quindi i riferimenti a "visura camerale"/"Registro Imprese" come fonte primaria in `lib/content/spiegazioniCampi.ts` (campi `codiceAteco` e `requisitoPartecipazioniSocieta`) erano fuorvianti — corretti indicando Cassetto Fiscale e modello AA9/12 come fonti primarie, con il Registro Imprese citato solo per chi vi è effettivamente iscritto.

Il calcolo fiscale dell'app non era invece affetto: la Gestione Separata INPS (senza soglie/minimali fissi, aliquota unica sul reddito) è già la gestione corretta per un libero professionista senza cassa propria — è la Gestione IVS Artigiani/Commercianti, con regole di tutt'altro tipo (contributi fissi minimi indipendenti dal reddito), quella che si applicherebbe a una ditta individuale e che l'app non modella. L'errore era solo nel testo descrittivo (DECISIONS.md e la mappa di riferimento in `scratch/commercialista-mappa.html`), non nella logica.

## Fase 3: compensazioni F24 con soglia del visto di conformità, registro Quadro RC, correzione Fisconline/Entratel

Terzo intervento della roadmap a fasi, in risposta a una richiesta esplicita: costruire nel software tutto ciò che è davvero automatizzabile, e limitare gli avvisi "serve un professionista" ai soli casi in cui lo è per legge, non per prudenza generica.

**Il limite legale reale trovato**: la compensazione orizzontale in F24 di crediti relativi a IRPEF/addizionali, imposta sostitutiva del reddito e IRAP, sopra **5.000 € annui per singola tipologia di credito**, richiede il visto di conformità di un intermediario abilitato (art. 1 c. 574 L. 147/2013) — il contribuente non può attestarlo da sé, indipendentemente da quanto sia informato. Non è un limite di competenza ma un atto riservato per legge a un soggetto iscritto a un albo. Sotto soglia, nessun professionista è necessario. Le fonti consultate non estendono esplicitamente questa soglia ai contributi INPS: la tipologia `inps` resta tracciata come credito ma senza applicare la soglia, per non affermare una regola non verificata.

**`lib/domain/compensazioni.ts`**: `SOGLIA_VISTO_CONFORMITA = 5000`, `riepilogoCompensazioni()` (raggruppa i crediti segnati come utilizzati per tipologia e anno di utilizzo, e segnala se supera la soglia), `saldoDisponibile()` (somma dei crediti non ancora utilizzati). 8 test in `compensazioni.test.ts`, incluso il caso limite esattamente a 5.000 € (non richiede il visto: la soglia è "sopra", non "pari o sopra") e il caso INPS (soglia non applicata).

**`/f24`**: nuova sezione "Compensazione: crediti disponibili" — registro dei crediti (tabella `fiscale_crediti_disponibili`, RLS per utente), form di inserimento, azioni per segnare un credito come utilizzato/non utilizzato o eliminarlo, e un avviso esplicito con l'importo esatto e la fonte normativa quando il totale compensato per tipologia/anno supera la soglia.

**Fonte sulla soglia (verificata il 28/08/2026):** Fiscomania.com, che cita art. 1 c. 574 L. 147/2013.

**`/lavoro-dipendente`** (tabella `fiscale_lavoro_dipendente`, RLS per utente): registro dei dati dalla Certificazione Unica (CU) del lavoro dipendente che inizierà a settembre 2026 — reddito imponibile, ritenute IRPEF, addizionali regionale e comunale. Deliberatamente **non** un ricalcolo dell'IRPEF a scaglioni sul reddito complessivo: quel calcolo (Quadro RN, con le detrazioni da lavoro dipendente e il conguaglio finale) è un componente più grande, non costruito in questo intervento, e la pagina lo segnala esplicitamente come tale invece di lasciarlo intuire da un'assenza.

**Correzione Fisconline/Entratel**: `scratch/commercialista-mappa.html` etichettava l'invio telematico della dichiarazione come "serve un professionista" per la presunta necessità di abilitazione Entratel. Verificato: Entratel è riservato agli intermediari abilitati che trasmettono per conto terzi; un privato cittadino che invia la propria dichiarazione — incluso un libero professionista — usa Fisconline, senza alcuna abilitazione professionale, solo le proprie credenziali sul sito dell'Agenzia delle Entrate. Non era un limite reale: un'imprecisione della mappa, corretta.

**Fonte (verificata il 28/08/2026):** Areasosta.com.

**Deliberatamente fuori da questo intervento**, per restare a fasi verificabili invece di un unico intervento non testato: "Oneri deducibili e detraibili" (richiede verifica delle aliquote/soglie correnti, incluso un possibile tetto alle detrazioni per redditi alti dal 2025), un confronto di convenienza forfettario vs regime ordinario, e il calcolatore IRPEF a scaglioni completo sul Quadro RN. Elencati come tali in `scratch/commercialista-mappa.html`.

## Base di conoscenza normativa (/riferimenti-normativi)

Risposta alla richiesta di "scansionare INPS e Agenzia delle Entrate parola per parola": non è tecnicamente sensato (centinaia di migliaia di pagine, in gran parte irrilevanti, che diventano vecchie a ogni nuova circolare) né utile — il valore reale non è il testo grezzo ma le regole corrette, distillate e verificate per la situazione specifica. Costruita invece, con l'utente, una base di conoscenza curata: 5 ricerche parallele (via agenti) su fonti primarie (agenziaentrate.gov.it, inps.it — spesso non raggiungibili per blocco anti-bot in questa sessione, aggirato con documenti PDF primari quando disponibili e altrimenti con 2 fonti secondarie indipendenti concordanti) più sintesi, organizzate in `lib/content/riferimentiNormativi.ts` e mostrate in `/riferimenti-normativi`.

**Argomenti coperti**: regime forfettario (soglie 85.000€/100.000€, aliquote 15%/5% e relative condizioni, fatturazione elettronica obbligatoria dal 2024, obblighi contabili e conservazione fatture); Gestione Separata INPS (aliquota 26,07%, massimale 122.295€, minimale 18.808€ per il 2026 — **confermati identici ai valori già in `fiscale_aliquote`**, nessuna correzione necessaria; iscrizione, scadenze, sanzioni civili art. 116 L. 388/2000); ravvedimento operoso (fasce di sanzione ridotta, tasso di interesse legale 2026 all'1,60%, codici tributo aggiornati 8944/1944 per l'imposta sostitutiva — sostituiscono i vecchi 8913/1992 dalla Risoluzione AE 12/E/2023); dichiarazione dei redditi e residenza fiscale (scadenza Modello Redditi PF 2026 al 2 novembre, criteri art. 2 TUIR riformato dal 2024, Convenzione Italia-Francia); lavoro dipendente + forfettario (compatibilità, soglia di esclusione 35.000€ confermata anche per il 2026 da L. 199/2025, scaglioni IRPEF 2026, detrazioni art. 13 TUIR).

**Aree grigie segnalate esplicitamente** (le fonti stesse non danno una risposta meccanica, non prudenza generica): l'assenza di una clausola di split year nella Convenzione Italia-Francia (a differenza di Svizzera e Germania) rende il cambio di residenza a metà 2026 un caso da verificare con un professionista di fiscalità internazionale; la gestione dei redditi francesi pre-trasferimento e del relativo credito d'imposta (art. 165 TUIR) nel caso specifico "forfettario + trasferimento infrannuale" non risulta trattata da una posizione ufficiale AE.

**Fonti**: elenco completo per singola voce dentro ogni scheda in `/riferimenti-normativi`, con data di verifica (28/08/2026). Non è un contenuto statico: va riverificato a ogni circolare annuale (soglie, aliquote, massimali) o cambio normativo.

## Fase 5: fatturazione elettronica — anagrafica clienti, fatture, note di credito, XML FatturaPA

Su richiesta esplicita ("voglio il mio Fiscozen"), l'app passa da registro di incassi a strumento di fatturazione. Scelta di fondo, decisa con l'utente: generare il **file XML FatturaPA**, non solo un PDF. Dal 2024 la fattura elettronica è obbligatoria anche per i forfettari, quindi un PDF da solo non assolve nessun obbligo: il documento che ha valore è l'XML trasmesso allo SDI. L'utente lo carica gratuitamente sul portale "Fatture e Corrispettivi" con SPID/CIE/Fisconline — verificato che un contribuente può trasmettere da sé un XML predisposto altrove, senza intermediario e senza firma digitale (la firma serve solo verso la PA; per B2B/B2C è il portale ad apporre il proprio sigillo XAdES).

### Modello dati

Nuove tabelle, tutte con RLS per proprietario: `fiscale_clienti` (anagrafica completa, inclusi codice destinatario SDI e PEC), `fiscale_fatture` (testata, TD01/TD04, numerazione per anno e tipo), `fiscale_fattura_righe` (DettaglioLinee), `fiscale_progressivi_xml` (registro dei progressivi già usati nei nomi file). `fiscale_profilo` estesa con i dati anagrafici dell'emittente necessari al blocco CedentePrestatore.

`fiscale_incassi` è **deprecata, non eliminata**: i dati sono stati migrati (1 riga, totale invariato a 20,00 € — verificato con query di confronto) e la tabella resta come backup non letto da alcun codice, così esiste un piano di rollback finché la migrazione non è verificata sul campo. Va eliminata dopo la verifica.

Il contratto `Incasso` è rimasto il confine tra fatturazione e motore fiscale: `fattureComeIncassi` traduce le fatture in quel tipo, quindi calcolo dell'imponibile, scadenzario e Quadro LM non sono stati toccati. Le note di credito entrano con **importo negativo**, così stornano il fatturato senza modificare le funzioni di calcolo, e il loro bollo non viene conteggiato tra quelli da versare (una nota di credito non genera un nuovo bollo dovuto).

### Aritmetica: interi in centesimi, non float

Tutti i calcoli su importi passano per interi in centesimi. Non è pedanteria: lo SDI controlla la coerenza aritmetica con tolleranze strette (00423 su PrezzoTotale e 00421 sull'imposta: 1 centesimo; 00422 su ImponibileImporto: 1 euro) e in JavaScript `0.1 + 0.2 !== 0.3` — su fatture con molte righe l'errore binario accumulato sfora la tolleranza e la fattura viene scartata. Test dedicato in `fattura.test.ts`.

### Il bollo riaddebitato è un fatto fiscale, non di presentazione

`totaleDocumento` e `imponibileFiscale` restituiscono lo stesso valore ma restano funzioni separate, di proposito. Se i 2 € di bollo sono addebitati al cliente, il riaddebito **costituisce compenso e concorre alla determinazione del reddito**: per un forfettario entra nel monte ricavi soggetto a coefficiente di redditività e imposta sostitutiva. Se il bollo resta a carico dell'emittente, non è un ricavo. Il flag è impostabile a livello di profilo (predefinito) e per singola fattura, ed è spiegato all'utente nell'interfaccia proprio perché incide sull'imponibile, non solo sulla grafica del documento.

Il bollo stesso **non è una scelta**: sopra 77,47 € è dovuto per legge, quindi il server lo ricalcola dalle righe invece di fidarsi del valore arrivato dal form. La soglia si valuta sulla somma dei `PrezzoTotale`, non sul totale documento, come fa lo SDI per popolare l'Elenco B.

**Punto da verificare con un commercialista** (segnalato, non risolto): le fonti secondarie concordano sul fatto che il riaddebito concorra al reddito, ma non è stato possibile risalire dalle fonti primarie AdE al numero esatto della risposta a interpello che lo afferma.

### Generatore XML

`lib/domain/fatturaXml.ts`. Costanti fissate per questo emittente: namespace `.../v1.2` (**invariato anche con lo schema XSD 1.2.3** — cambiarlo in `v1.2.3` è l'errore più comune negli aggiornamenti), `FormatoTrasmissione` e attributo `versione` entrambi `FPR12`, `RegimeFiscale` RF19, `Natura` N2.2, `AliquotaIVA` e `Imposta` 0.00, nessun `DatiRitenuta` né `DatiCassaPrevidenziale` (nessuna cassa). Le due `Causale` che l'AdE chiede espressamente ai forfettari sono emesse in testata, **in aggiunta** al `RiferimentoNormativo` nel riepilogo: non sono alternative.

Validazione separata dalla generazione (`validaFatturaPerXml`), perché l'XSD non copre i controlli semantici dello SDI e uno scarto brucia comunque il nome file. Sono implementati i controlli per gli scarti 00300, 00301, 00313, 00403, 00417, 00425, 00427, 00445 e 00001, ognuno con il codice di scarto mostrato all'utente. L'XML generato è stato verificato: ben formato, namespace corretto, e conforme ai controlli aritmetici 00421/00422 e semantici 00400/00429/00444 riprodotti su un caso reale.

**Univocità del nome file**: il nome deve essere univoco *per sempre*, non per anno, e uno scarto lo brucia comunque (errore 00002). Per questo i progressivi vivono in una tabella con vincolo di unicità e non in un contatore ricalcolato: `assegnaProgressivoXml` inserisce e, in caso di violazione del vincolo, riprova con il successivo. Il progressivo viene assegnato **dopo** la validazione, per non bruciare un nome su una fattura non pronta.

**Gap noto, da colmare**: non c'è validazione contro l'XSD ufficiale in CI. Le fonti AdE restituiscono 403 ai client automatici, quindi lo schema andrebbe scaricato a mano e committato nel repo, con un validatore in fase di test. Oggi la copertura è: struttura e ordine verificati dai test sulle sequenze di tag, well-formedness verificata, controlli semantici implementati. Non equivale a una validazione XSD.

### PDF: stampa del browser, non generazione server-side

La copia di cortesia è una pagina impaginata per la stampa (`/fatture/[id]/stampa`), da cui si ottiene il PDF con "Salva come PDF" — funziona su desktop e su mobile. È una scelta motivata, non una mancanza: un generatore PDF server-side (headless browser o libreria di layout) aggiungerebbe una dipendenza pesante e un runtime a sé per produrre lo stesso documento, mentre il file che ha valore legale è l'XML. Se in futuro servisse l'invio automatico via email, allora la generazione server-side diventerebbe giustificata.

### Mobile

Layout responsive senza PWA installabile (scelta dell'utente). Le tabelle diventano schede sotto i 768px invece di scorrere orizzontalmente — una tabella a sei colonne su 375px è illeggibile. Campi di input a 16px su mobile: sotto quella soglia iOS Safari zooma da solo al focus, spostando il layout sotto le dita. Bersagli di tocco a 44px minimi. Zoom **non** bloccato: impedirlo è una barriera di accessibilità.

### Fonti (verificate il 29/08/2026)

Schema XSD 1.2.3 e specifiche tecniche AdE 1.9.1 (in vigore dal 15/05/2026), pagina AdE "Fattura elettronica per i forfettari", Guida AdE "L'imposta di bollo sulle fatture elettroniche", pagina AdE "Come si invia una fattura elettronica al cliente". Elenco completo con URL nel report di ricerca; le fonti primarie sono state scaricate e ispezionate direttamente (XSD e PDF), non lette in sintesi.

## Fase 6: applicazione integrale dello standard GAR

Fin qui le fasi hanno inseguito le funzionalità, lasciando aperti i gap di processo. Questa passata li chiude, su richiesta esplicita ("usa tutte le regole generali"). L'audit iniziale ha trovato sei violazioni concrete dello standard, tutte misurabili.

### Contrasto sotto la soglia WCAG (accessibilità)

`--ink-faint` (`#5b6472`) era a **2,85:1 su `--surface-2`**, contro il minimo di 4,5:1 previsto da WCAG 2.1 livello AA per il testo normale — e non è un token marginale: porta date, note e riferimenti normativi, cioè testo piccolo, dove il contrasto pesa di più. Schiarito a `#7b8492`, il primo valore sulla stessa tinta che supera la soglia sullo sfondo peggiore, mantenendo la distanza percettiva da `--ink-muted`.

Non è stata una verifica una tantum: `scripts/verifica-contrasto.mjs` ricalcola le 21 combinazioni testo/sfondo leggendo i colori **direttamente da `globals.css`**, così il controllo non può divergere dal foglio di stile reale, e gira in CI come passo bloccante. Aggiunti nella stessa passata: fuoco da tastiera sempre visibile (`:focus-visible`), collegamento "Salta al contenuto", `nav` etichettati e `main` con id, rispetto di `prefers-reduced-motion`.

### Soppressione silenziosa delle eccezioni

Dodici blocchi `catch {}` ingoiavano l'errore reale restituendo un generico "Salvataggio non riuscito": un errore non registrato è un errore che si scopre solo quando qualcuno se ne lamenta, che è esattamente ciò che lo standard vieta. Sostituiti da `registraErrore`, che scrive severità, contesto (`modulo.funzione`), messaggio, dettaglio dell'eccezione e prime righe di stack.

Resta **un solo** catch vuoto, in `lib/supabase/server.ts`, ed è documentato: Next.js vieta di scrivere cookie da un Server Component, quindi `setAll` lancia in quel contesto per progetto, non per guasto. Registrarlo riempirebbe il log di rumore nascondendo gli errori veri.

### Osservabilità assente

Nessun error tracking, nessun log strutturato: i problemi si sarebbero scoperti per caso. Scelta, insieme all'utente, la strada senza account esterni: tabella `fiscale_log_errori` con RLS, modulo `lib/osservabilita/log.ts` e pagina `/diagnostica` per consultarli. Il logger non lancia mai — un fallimento del logging non deve diventare un secondo errore che nasconde il primo — e scrive sempre anche su `console.error` in JSON, così su Vercel resta traccia proprio nel caso in cui il database sia irraggiungibile e il log su database non possa funzionare.

Sentry resta l'alternativa più completa (raggruppamento, alert email) ma richiede un account dell'utente: valutabile se il volume di errori lo giustificherà.

### Nessun performance budget

`scripts/verifica-budget.mjs` fissa 900 KB di JavaScript totale e 260 KB per singolo chunk, contro gli attuali 722 KB e 224 KB. Le soglie sono volutamente vicine al valore reale: un budget generoso non è un budget, perché lascia passare mesi di regressioni prima di suonare. Il peso del JS è la leva principale su Interaction to Next Paint, la metrica dei Core Web Vitals su cui un'app a form rischia di più.

**Gap dichiarato**: il budget misura il peso, non i Core Web Vitals reali sul campo. La valutazione dal 2026 è a livello di intero dominio e va fatta su dati reali di utilizzo, non in laboratorio — non copribile da un'app a utente singolo senza traffico.

### Controllo di versione e CI/CD

Sessanta file mai committati, nessun remote, deploy lanciati da una shell: non tracciati, non revisionabili, senza staging né rollback. Il lavoro è stato spezzato in commit secondo Conventional Commits e scritta la pipeline `.github/workflows/verifica.yml` (typecheck, lint, test, contrasto, build, budget — tutti bloccanti, con `npm ci` invece di `npm install` perché fallisca su un lockfile disallineato).

La pipeline è pronta ma **non attiva**: il repository remoto non è creabile da qui. Le istruzioni per collegarlo, e cosa se ne ottiene (deploy per commit, preview deployment come staging gratuito, rollback in un click), sono in `.github/workflows/README.md`.

### Nomenclatura in italiano: eccezione motivata

Lo standard chiede identificatori di codice in inglese, per convenzione di settore. Qui si deroga, deliberatamente, e la deroga vale come decisione documentata e non come dimenticanza.

Il dominio è il diritto tributario italiano. "Imposta sostitutiva", "coefficiente di redditività", "ravvedimento operoso", "visto di conformità" non hanno un equivalente inglese esatto: tradurli produrrebbe approssimazioni (`substituteTax`, `profitabilityCoefficient`) che allontanano il codice dal testo di legge contro cui va verificato. La tracciabilità fra `imponibileFiscale` e l'art. 1 comma 64 L. 190/2014 vale più dell'aderenza alla convenzione; il criterio oggettivo che lo standard stesso impone — manutenibilità e comprensibilità per un terzo che intervenga fra dodici mesi — punta nella stessa direzione, perché quel terzo leggerà le circolari in italiano. Un refactor su ~4.000 righe, per giunta, sarebbe rischio puro senza beneficio funzionale.

Il confine resta netto: **italiano per il dominio, inglese per ciò che è già inglese** (`Promise`, `formData`, API dei framework).

### GDPR: l'anagrafica clienti cambia la posizione dell'utente

Segnalazione proattiva, non richiesta. Finché l'app registrava solo importi e date, i dati erano dell'utente e basta. Con l'anagrafica clienti introdotta in fase 5 tratta **dati personali di terzi** — nome, indirizzo, codice fiscale, email, telefono di ogni cliente — e questo rende Giovanni **titolare del trattamento** ai sensi del Reg. UE 2016/679, con obblighi che il software da solo non assolve:

- **base giuridica**: per i dati necessari a emettere la fattura è l'obbligo legale/contrattuale, quindi non serve il consenso; per usi ulteriori (es. comunicazioni commerciali) servirebbe un'altra base;
- **informativa** ai clienti sul trattamento dei loro dati;
- **conservazione**: i dati di fatturazione seguono i termini fiscali (10 anni), ma non vanno tenuti oltre lo scopo;
- **diritti dell'interessato**: accesso, rettifica, cancellazione — oggi esercitabili solo manualmente, l'app non ha una funzione dedicata;
- **responsabile del trattamento**: Supabase e Vercel trattano quei dati per conto dell'utente e andrebbero nominati come tali, con la verifica di dove sono localizzati i server.

Sono adempimenti dell'utente, non del software, e non sono stati implementati: sono segnalati perché la fase 5 li ha resi applicabili e nessuno li aveva sollevati. Da verificare con un professionista se l'attività cresce oltre pochi clienti.

### Gap noti che restano aperti

Elencati perché siano tracciabili, non nascosti:

1. **Nessun test end-to-end** sui percorsi critici (autenticazione, salvataggio fattura dall'interfaccia). Lo standard li chiede: è il gap di qualità più rilevante. I test coprono oggi la logica di dominio, non l'integrazione.
2. **Nessuna validazione XSD** dell'XML FatturaPA in CI (già annotato in fase 5).
3. **Core Web Vitals non misurati sul campo** (sopra).
4. **Ambiente di staging assente** finché il repository non è collegato.
5. **`fiscale_incassi`** ancora presente come backup della migrazione, da eliminare dopo verifica.

## Fase 7: chiusura dei gap residui dello standard

Prosecuzione della fase 6, sui punti che erano rimasti dichiarati ma non risolti.

### Test end-to-end sui percorsi critici

Era il gap di qualità più rilevante e l'avevo segnalato io stesso. Playwright, 44 test su desktop e mobile (metà dell'uso previsto è da telefono: verificare solo il desktop verificherebbe metà del prodotto). Coprono il perimetro di autenticazione su sedici rotte, gli endpoint API che non devono restituire dati a un anonimo, la pagina di accesso e quattro controlli di accessibilità.

Girano contro la build di produzione, non contro `next dev`: il server di sviluppo ha comportamenti propri — ricompilazione, overlay degli errori — che non sono quelli che l'utente incontra, e verificare qualcosa di diverso da ciò che si rilascia è verificare poco.

**Un test che passava per il motivo sbagliato**, vale la pena registrarlo. La prima versione asseriva che `/api/report` restituisse uno stato ≥ 300 a un anonimo, e falliva con 200. Sembrava un buco di sicurezza; verificato con `curl`, l'endpoint restituisce correttamente 307 verso il login. Era Playwright che segue i redirect per impostazione predefinita, quindi il 200 era la pagina di login. Corretto il test con `maxRedirects: 0` e aggiunto un controllo sul corpo della risposta: l'asserzione che conta non è sullo stato ma sul fatto che nessun dato fiscale raggiunga chi non è autenticato.

**Non coperti**: i flussi autenticati (creare un cliente, emettere una fattura, scaricare l'XML). Richiedono credenziali di prova su un progetto Supabase dedicato — un ambiente di test separato da quello reale, che non esiste finché non c'è la separazione degli ambienti. Gap dichiarato, non chiuso.

### Duplicazione logica oltre la terza occorrenza

La composizione del nome del cliente era replicata in otto file, il controllo di completezza per l'XML in due. La prima era verbosità; la seconda era un rischio reale: `clientePronto` (interfaccia) e `validaFatturaPerXml` (generatore) rispondevano alla stessa domanda in due punti diversi, e se una fosse cambiata senza l'altra l'app avrebbe promesso un file che il generatore avrebbe poi rifiutato — o peggio, avrebbe lasciato generare un XML che lo SDI avrebbe scartato.

Estratte in `lib/domain/cliente.ts`, con un test che **lega le due definizioni** su sette casi: divergere ora costa un test rosso invece di una fattura scartata. Effetto collaterale utile: l'anagrafica dice quali dati mancano invece di limitarsi a marcare la riga.

### Conformità GDPR portata dentro il prodotto

Nella fase 6 avevo segnalato il rischio e lo avevo lasciato come adempimento dell'utente. Rileggendo lo standard — "verificato in fase di produzione e non lasciato come responsabilità implicita del cliente" — quella era una mezza misura: la pagina `/privacy` ora elenca cosa viene trattato, dove risiede, chi sono i responsabili del trattamento (Supabase e Vercel, da nominare formalmente) e i sei adempimenti che ricadono sull'utilizzatore in quanto titolare. Il testo è scritto per essere riutilizzato verso i propri clienti, non solo letto una volta.

Sui cookie non serve banner: la sessione di autenticazione usa cookie tecnici, per i quali il consenso non è richiesto, e non ci sono script di terze parti né strumenti di analisi.

### Versionamento semantico

`1.0.0` con `CHANGELOG.md`. La semantica è dichiarata e non generica: **MAJOR** quando cambia il calcolo delle imposte o il formato dei documenti trasmessi — cose che possono cambiare quanto si versa o far scartare una fattura — **MINOR** per funzionalità, **PATCH** per correzioni.

### Errore di processo commesso e corretto

Il primo tentativo di commit di questa fase ha usato `git add -A`, impastando quattro unità logiche in un commit unico: esattamente ciò che lo standard vieta ("nessuna commistione tra refactoring e nuova funzionalità nel medesimo commit"). Corretto con un reset e cinque commit separati. Registrato qui perché una storia git pulita ottenuta per caso non è un processo.

### Funzioni oltre le 50 righe

L'audit ne ha trovate dodici. Undici sono componenti React: JSX dichiarativo, dove la lunghezza misura la quantità di markup e non la complessità ciclomatica, e spezzarli produrrebbe componenti senza identità propria pur di rispettare un numero. Non toccate deliberatamente.

`generaXmlFattura` (128 righe) è invece logica imperativa e sarebbe da scomporre in costruttori di header e body. Non fatto in questa passata: è coperto da 30 test che ne fissano struttura e ordine dei tag, quindi il rischio è basso, ma resta debito tecnico dichiarato.

### Gap che restano aperti

1. **Flussi autenticati non coperti dai test E2E** (sopra): serve un progetto Supabase di test.
2. **Validazione XSD dell'XML in CI**: le fonti AdE rispondono 403 ai client automatici, lo schema va scaricato a mano da browser e committato. Serve un'azione dell'utente.
3. **Core Web Vitals sul campo**: non misurabili senza traffico reale.
4. **Ambiente di staging**: dipende dal collegamento del repository.
5. **`generaXmlFattura` da scomporre** (sopra).
6. **`fiscale_incassi`** da eliminare dopo verifica.

## Fase 8: riduzione della lista di cose che deve fare l'utente

Richiesta esplicita: fare il più possibile in autonomia e lasciare solo l'inevitabile. Tre voci erano assegnate all'utente; due sono state chiuse, una ridotta a un comando.

### Validazione XSD: chiusa senza intervento dell'utente

Era assegnata a lui perché le pagine dell'Agenzia rispondono 403 ai client automatici — riconfermato provando `WebFetch` sull'URL ufficiale dello schema 1.2.3. Anziché fermarsi lì, cercato lo schema sui registri di pacchetti, che sono raggiungibili: il pacchetto npm `fatturapa` contiene lo **schema XSD ufficiale, revisione 1.2.1**, ora committato in `schema/`.

La 1.2.1 non basta tale e quale: **non contiene `N2.2`** — verificato, zero occorrenze — perché quel codice è stato introdotto nel 2021 quando il generico `N2` è stato suddiviso, ed è proprio il codice che un forfettario deve usare. Validare senza accorgimenti boccerebbe un file corretto.

Soluzione: si rilassano **esclusivamente tre tipi enumerati** (`NaturaType`, `TipoDocumentoType`, `RegimeFiscaleType`), gli unici estesi dopo la 1.2.1, e si lascia intatto tutto il resto. Resta validato ciò che conta davvero: struttura, **ordine degli elementi** (lo scarto 00200, invisibile a occhio), obbligatorietà, tipi, pattern e lunghezze. Non resta validata l'appartenenza dei codici agli elenchi correnti, che è però già coperta dai test di dominio.

Sei esemplari coprono i casi che producono XML strutturalmente diverso: senza bollo, bollo riaddebitato, bollo a carico dell'emittente, privato con PEC e più righe, nota di credito con documento collegato, causale aggiuntiva senza IBAN. Tutti conformi.

Il confine è dichiarato nell'intestazione del test perché **un controllo che si spaccia per più di quello che è vale meno di nessun controllo**: genera fiducia mal riposta. Fornire la 1.2.3 scaricata da browser resta un miglioramento possibile, non più una necessità.

### `fiscale_incassi` eliminata

Verificato prima: 1 incasso attivo contro 1 fattura attiva, 20,00 € contro 20,00 €, zero incassi senza fattura corrispondente. Il contenuto della riga è trascritto nel commento della migrazione, così il registro resta completo anche senza la tabella.

### `generaXmlFattura` scomposta

Era il debito dichiarato in fase 7: 128 righe di logica imperativa in una funzione sola. Ora sei costruttori, uno per blocco dello schema, più un assemblatore di dodici righe. La ragione non è estetica: l'ordine degli elementi è vincolante e sbagliarlo produce lo scarto 00200, che non si vede rileggendo; con una sequenza unica e lunga è difficile capire dove finisce una `xs:sequence` e comincia l'altra. Ora ogni funzione corrisponde a un blocco e il confronto con le specifiche è diretto. I 37 test esistenti passano invariati.

### Collegamento del repository ridotto a un comando

`scripts/collega-repo.sh` crea il repository privato su GitHub, fa il push e collega Vercel. Rifiuta di partire con modifiche non committate, riconosce un remote già presente, e se `gh` non è installato spiega l'alternativa manuale invece di fallire e basta. Resta l'unico passo che richiede credenziali che un ambiente automatico non ha e non deve avere.

### Registrazioni aperte: NON chiuse, deliberatamente

Avevo in programma di bloccarle con un trigger su `auth.users`. Controllato prima: **il progetto ha 2 utenti ed è condiviso con l'applicazione "pratiche"**. Le registrazioni sono un'impostazione dell'intero progetto Supabase, quindi chiuderle avrebbe rotto la registrazione dell'altra applicazione — un effetto collaterale su un sistema fuori dal perimetro di questo lavoro, che non è una decisione da prendere unilateralmente.

Registrato qui perché è il tipo di azione che sembra un miglioramento finché non si guarda cosa c'è intorno. La nota di sicurezza nel README è stata riscritta di conseguenza, legandola a quella su `fiscale_aliquote`: le due condividono la stessa premessa.

### Cosa resta all'utente, e perché è irriducibile

1. **Eseguire `./scripts/collega-repo.sh`** — creare un repository sul suo account GitHub richiede le sue credenziali.
2. **Ruotare il token Vercel** — è stato usato in chiaro nei comandi di questa sessione. Solo lui può revocarlo dal proprio account.
3. **Decidere sulle registrazioni aperte** — sopra: coinvolge l'altra applicazione.

### Gap ancora aperti

1. **Flussi autenticati non coperti dagli E2E**: serve un progetto Supabase di prova. Crearne uno ha un costo e tocca il suo account.
2. **Core Web Vitals sul campo**: non misurabili senza traffico reale.
3. **Ambiente di staging**: si attiva con il punto 1 della lista sopra.

## Fase 9: repository, prima CI, e cosa ha rivelato

### Il push non è partito da qui, e non per il token

Il repository `giovannirubulotta/piva-fiscale` esiste, è privato e contiene i 28 commit. Non sono stati caricati dall'ambiente in cui è stato scritto il codice: il proxy git di quella sessione inietta credenziali solo per i repository dichiarati al suo avvio e rifiuta tutto il resto — `access denied by the git proxy` — così come l'API `POST /user/repos` e `GET /repos/{owner}/{repo}`. Nessun token lo aggira, perché la barriera è di rete, non di autorizzazione.

Il percorso effettivo: `git bundle` dell'intera storia (297 KB), scritto sul PC dell'utente, ricostruito lì con `git clone` e caricato da lì. Due tentativi intermedi sono falliti per ragioni istruttive: il credential helper `store --file=` non veniva interrogato perché **Credential Manager, configurato a livello di sistema, risponde per primo** e vince; e la lista dei helper si estende, non si sostituisce, quindi `-c credential.helper=vuoto` va passato prima per azzerarla. Ha funzionato solo mettendo le credenziali nell'URL.

Conseguenza operativa da tenere presente: **ogni modifica prodotta in ambiente automatico va portata su GitHub passando dalla macchina dell'utente.** Non è un dettaglio di questa sessione, è il vincolo del canale.

### La prima CI è andata rossa, ed era giusto così

`app/layout.tsx#L29 — Cannot find name 'LayoutProps'`. In locale `npm run typecheck` passava; su un checkout pulito no.

`LayoutProps` e affini non sono tipi scritti da noi né importati: Next li **genera** in `.next/types`. Sulla macchina di sviluppo quella cartella esisteva da una build precedente, quindi `tsc` li trovava. In CI, dove il checkout è pulito e il typecheck precede la build, non esistevano.

Il controllo non era falso: era **verde per il motivo sbagliato**, cioè per uno stato residuo del disco e non per una proprietà del codice. È esattamente la classe di errore che la CI esiste per intercettare, e l'ha intercettata al primo giro.

Correzione: `"typecheck": "next typegen && tsc --noEmit"`. I tipi si generano prima di controllarli, ovunque si esegua il comando. Verificato ricostruendo la condizione della CI — `rm -rf .next` seguito dalla suite completa: 136 test di dominio e 46 end-to-end verdi.

La lezione va oltre il caso singolo: **un comando di verifica che dipende da uno stato non versionato non sta verificando ciò che dichiara.** Vale per `.next`, varrebbe per una cache o per un file generato lasciato sul disco.

### Vercel: due account distinti, e il consolidamento sul secondo

`vercel git connect` fallisce con *"You need to add a Login Connection to your GitHub account first"*. La connessione GitHub è stata aggiunta, ma il collegamento continua a fallire, e il motivo è emerso confrontando gli identificativi: il progetto `project-jr16d` appartiene all'account il cui team è `rubulottaga07-2302s-projects` — quello a cui rispondono il token e l'API — mentre il browser è autenticato come `info@giovannirubulotta.it`, che riceve 404 sullo stesso progetto. Sono **due account Vercel diversi**.

Da qui due strade, con costi opposti:

1. **Accedere all'account che possiede il progetto** e collegare Git lì: conserva URL, variabili d'ambiente e accesso via API, ma richiede un'autenticazione che solo l'utente può eseguire.
2. **Importare il repository come nuovo progetto** sull'account `info@…`: non richiede nulla all'utente e consolida tutto sull'indirizzo che usa davvero, ma cambia l'URL di produzione, impone di reinserire le variabili e **fa perdere l'accesso via token e API** al progetto, riducendo la manutenzione a ciò che si può fare da interfaccia.

Non era una scelta tecnica neutra e non andava presa al posto suo: la seconda opzione è più comoda oggi e più povera domani. **Scelta dall'utente: la seconda.**

Esecuzione: applicazione GitHub di Vercel installata e ristretta al solo `piva-fiscale` — l'installazione propone "All repositories", che è più accesso di quanto serva; progetto `piva-fiscale` creato nel team GAR con preset Next.js; le due variabili Supabase impostate su Production e Preview.

**Non su Development, deliberatamente.** Quell'ambiente alimenta `vercel dev` e `vercel env pull`, mentre lo sviluppo locale legge `.env.local`: copiarle lì significherebbe una terza copia di un segreto che nessuno legge. Un segreto in più senza un lettore in più è solo superficie d'attacco.

Esito: produzione su `piva-fiscale.vercel.app`, rilascio legato al commit `main`, anteprima per ogni pull request, rollback dalla dashboard. Verificato che la radice e `/api/report` rispondano 307 verso `/login` a un anonimo — il perimetro tiene anche sul nuovo dominio.

Il vecchio progetto sull'altro account resta in piedi e continua a servire `project-jr16d.vercel.app` da un commit ormai superato. Va spento, ma è una cancellazione su un account fuori dal perimetro di questa sessione: la decide e la esegue l'utente.

### Rimosso `scripts/collega-repo.sh`

Creava il repository e collegava Vercel. Il repository ora esiste; e lo script era comunque ineseguibile sulla macchina di destinazione, che è Windows — un difetto che nessuno avrebbe scoperto finché non fosse servito. Codice morto, eliminato invece che conservato "per sicurezza".

### Gap ancora aperti

1. **Flussi autenticati non coperti dagli E2E**: serve un progetto Supabase di prova.
2. **Core Web Vitals sul campo**: non misurabili senza traffico reale.
3. **Registrazioni Supabase aperte**: invariato, coinvolge l'applicazione "pratiche".
4. **Vecchio progetto Vercel da eliminare**: sta su un altro account, lo chiude l'utente.

## Fase 10: previsione, crediti e navigazione

Richiesta: completare le funzioni che mancavano e alzare l'interfaccia. Le due cose si sono rivelate la stessa: ciò che mancava non era una schermata in più, ma il fatto che due domande quotidiane — *dove finirà l'anno* e *chi non ha pagato* — non avessero risposta da nessuna parte.

### Previsione: due scenari, nessuno eletto

Una previsione mostrata come numero singolo viene letta come un dato. Per questo il modulo ne produce due, e la loro distanza è essa stessa informazione: **prudente** (solo incassato più fatture già emesse, nessun nuovo lavoro presunto) e **al ritmo attuale** (l'incassato proiettato sui giorni che restano). Il numero grande sulla dashboard è quello prudente, perché un accantonamento si dimensiona su ciò che è certo; l'altro sta accanto, con l'ipotesi scritta per esteso.

Tre vincoli che non sono dettagli:

1. **Sotto i 45 giorni di attività non si proietta.** Un bonifico incassato il 20 gennaio, diviso per venti giorni e moltiplicato per 365, produce una proiezione a sei cifre e un falso allarme di uscita dal regime forfettario. Il freno è esplicito e dichiarato nell'interfaccia.
2. **Il ritmo non scende mai sotto il prudente**, altrimenti esisterebbe uno scenario in cui il lavoro già fatturato smette di esistere.
3. **Nell'anno di apertura si proietta dalla data di apertura**, non dal 1° gennaio: dividere per mesi in cui la partita IVA non c'era sottostima il ritmo di un terzo o più.

Il calcolo fiscale non è stato riscritto: `calcolaRiepilogoAnno` è stato scomposto in `riepilogoDaFatturato`, che la previsione riusa tale e quale. Duplicarlo avrebbe creato due punti in cui cambiare un'aliquota, e la previsione avrebbe finito per mostrare numeri plausibili e sbagliati — il modo peggiore di sbagliare, perché non si nota.

### Crediti: le fasce contano più del totale

Il totale da incassare da solo non dice niente di utile. Le fasce sì: entro 30 giorni è un ritardo fisiologico, oltre i 60 è un problema di natura diversa, che si affronta in un altro modo. Separarle è ciò che permette di accorgersene senza leggere data per data.

Il sollecito si **prepara**, non si invia. Mandare messaggi a nome dell'utente è una decisione, non un effetto collaterale dell'apertura di una pagina — e un invio automatico su un canale non configurato sarebbe stato anche la strada più corta per un errore silenzioso. Il testo cambia tono con il ritardo ma resta cortese anche a novanta giorni: chi scrive vuole essere pagato *e* mantenere il cliente. Nessun riferimento agli interessi di mora, che pure sono dovuti per legge (D.Lgs. 231/2002): citarli è una scelta commerciale e va fatta caso per caso, non inserita di default in ogni promemoria. Un test lo verifica, perché è il genere di frase che rientra da sola in una revisione distratta.

### Il dominio non importa da `lib/ui`

`testoSollecito` deve formattare un importo in euro, e `formattaEuro` esiste già in `lib/ui/format`. Importarlo avrebbe invertito la direzione delle dipendenze — il dominio che dipende dalla presentazione — per risparmiare tre righe. C'è invece un formattatore locale, con il motivo scritto sopra. È duplicazione, ed è giustificata: la regola sull'estrazione alla terza occorrenza vale dentro uno strato, non attraverso il confine che tiene in piedi l'architettura.

### Navigazione: raggruppata, con lo stato attivo

Quattordici voci in un elenco piatto, nessuna evidenza della pagina corrente. Ora quattro gruppi e `aria-current="page"` sulla voce attiva, che resta evidenziata anche sulle pagine figlie: da `/fatture/nuova` deve essere ancora chiaro di essere dentro Fatture.

Su mobile le quattro destinazioni quotidiane stanno in una barra fissa in basso. Quattro e non otto: la barra vive nella zona che il pollice raggiunge senza cambiare presa, e ogni voce in più porta i bersagli sotto i 44px. Il resto sta dietro «Altro», che costa un tocco in più ed è la scelta giusta per ciò che si apre una volta al mese. Un test verifica che ogni voce della barra esista anche nel menu completo — è il tipo di disallineamento che nessuno nota finché non manca una pagina.

I due componenti di navigazione sono client (`usePathname`) per una ragione sola: sapere dove ci si trova. Il costo è misurato — il performance budget è passato da 725 a 727 KB su 900 — e comprato consapevolmente.

### Cosa resta da fare

1. **Archivio documenti con allegati**: richiede una tabella nuova, un bucket Supabase Storage e le relative policy. Non iniziato.
2. **Promemoria sulle scadenze fuori dall'applicazione** (calendario o email): richiede un canale di invio, quindi una decisione su un servizio terzo e sul suo costo.
3. **Esportazione per il commercialista**: un archivio con gli XML dell'anno e il riepilogo, oggi c'è solo il CSV.
4. I gap delle fasi precedenti restano invariati.

## Fase 11: documenti e archivio annuale

### Il bucket è privato, e il link scade

Ricevute, contratti, quietanze F24 e Certificazioni Uniche sono dati personali — propri e di terzi. Un bucket pubblico li renderebbe leggibili a chiunque conosca l'URL, che è indovinabile quanto un identificativo: `fiscale-allegati` è quindi privato, con limite di 10 MB e tipi ammessi dichiarati **sul bucket**, non solo nell'interfaccia. Un controllo lato client è un suggerimento, non una garanzia; quello nell'interfaccia serve soltanto a non far attendere un caricamento destinato a essere respinto.

Il percorso di ogni oggetto comincia con l'id dell'utente perché è il primo segmento su cui si appoggiano le policy dello Storage: **cambiare quel percorso non riordina le cartelle, disattiva l'isolamento.** Le quattro operazioni (select, insert, update, delete) sono scritte come policy separate invece che con un `for all`: un permesso concesso per errore si vede quando è scritto per esteso.

I file non si servono da un URL permanente ma da un link firmato a sessanta secondi, generato al momento del click. Sessanta secondi bastano per un download e non bastano perché il link, che finisce nella cronologia del browser, resti utile a qualcun altro.

### L'ordine delle operazioni, e quale guasto si preferisce

In caricamento: prima lo Storage, poi la riga; se la riga fallisce, l'oggetto viene rimosso subito. In cancellazione: prima la riga, poi l'oggetto.

Non è simmetria mancata, è una scelta su **quale guasto residuo si preferisce**. Una riga che punta a un file inesistente è un errore in faccia all'utente ogni volta che ci clicca sopra; un file senza riga è spazio pagato che nessuno raggiunge. Tra un guasto rumoroso e inutile e uno silenzioso e innocuo si sceglie il secondo, e lo si scrive.

### ZIP senza dipendenze

Serviva mettere qualche decina di file di testo in un contenitore apribile con doppio clic. Per file non compressi il formato ZIP è tre strutture note e un CRC-32: novanta righe. Lo standard di progetto vieta di introdurre una dipendenza per problemi risolvibili con poche righe dirette, e qui una dipendenza porterebbe albero transitivo, aggiornamenti e superficie da mantenere per una funzione che non cambierà — il formato è fermo dal 1993.

Il costo è dichiarato: nessuna compressione, quindi l'archivio pesa quanto la somma dei file. Su XML e CSV di poche decine di KB è irrilevante, e se un giorno ci finissero le scansioni la compressione non aiuterebbe comunque, perché PDF e JPEG sono già compressi.

Il test che conta non guarda le firme dei blocchi — quello passerebbe anche con un formato sbagliato — ma apre l'archivio con `unzip -t`, che ricalcola i CRC, e ne estrae il contenuto verificando anche un nome file accentato (bit 11 del general purpose flag: senza, su Windows il nome si storpia). Come per `xmllint`, se `unzip` manca il test si salta invece di fallire; in CI è installato esplicitamente.

### Gli XML dell'archivio non inventano progressivi

`generaXmlFattura` è una funzione pura e non tocca il registro dei nomi file. Sarebbe quindi tecnicamente possibile rigenerare l'XML di qualunque fattura per metterlo nell'archivio — e sarebbe un errore: per una fattura senza progressivo il generatore userebbe il segnaposto, producendo un file con un nome **mai assegnato**. Se quel file venisse poi trasmesso, brucerebbe quel nome all'insaputa del registro, ed è esattamente il tipo di collisione che il registro esiste per impedire (scarto SDI 00002).

Nell'archivio finiscono quindi solo le fatture che un progressivo ce l'hanno già. Le altre sono **elencate nel LEGGIMI**: un'esclusione silenziosa sarebbe indistinguibile da un difetto.

### Advisor di sicurezza Supabase

Eseguito dopo le migrazioni: nessun rilievo sulle tabelle `fiscale_*` né sul nuovo bucket. Restano warning che appartengono all'altra applicazione del progetto condiviso (`miei_nuclei`, `posso_vedere`, `sono_staff`, `set_updated_at`) e uno di livello progetto — la protezione contro le password compromesse, disattivata. Quest'ultimo si abilita con un interruttore e non romperebbe nulla, ma è un'impostazione dell'intero progetto Supabase: tocca anche "pratiche", quindi la decisione non è unilaterale. Segnalato, non eseguito.

### Cosa resta

1. **Promemoria sulle scadenze fuori dall'applicazione**: richiede un canale di invio, cioè un servizio terzo e un costo ricorrente da decidere.
2. **Flussi autenticati non coperti dagli end-to-end**: serve un progetto Supabase di prova.
3. **Core Web Vitals sul campo**: non misurabili senza traffico reale.
4. Registrazioni Supabase aperte e vecchio progetto Vercel: invariati.

## Fase 12: da applicazione fiscale a strumento di lavoro

Richiesta: un software di organizzazione aziendale — CRM, note, calendario, posta collegata — con la fiscalità dentro, e l'aspetto di un software professionale. È lavoro da più sessioni, costruito a fette verificate e rilasciate una alla volta.

### Tre scelte prese dall'utente, non da me

1. **Posta via IMAP/SMTP con password dedicata**, non OAuth. Gli ho detto i limiti prima di chiedere: la password della casella va conservata cifrata, IMAP su funzioni serverless è fragile e non dà notifiche in tempo reale. Ha scelto consapevolmente la strada che funziona con qualsiasi provider. Quando arriverà quel modulo, la password sarà cifrata a riposo e va detto con precisione **cosa resta esposto**: chiave e testo cifrato vivono sulla stessa piattaforma, quindi si protegge dal furto del database, non da chi ha accesso al progetto.
2. **Calendario interno con esportazione `.ics`**, nessuna sincronizzazione. Niente OAuth, niente consensi, ma il calendario del telefono non si aggiorna da sé.
3. **Prima l'impalcatura, poi i moduli.**

### Perché l'impalcatura per prima

Costruire il CRM dentro la struttura attuale avrebbe significato aggiungere una quinta voce a un menu, cioè un'altra pagina in un insieme di pagine. La differenza tra un insieme di pagine e un software sta in due cose: **si arriva ovunque senza sapere dove sta**, e le azioni frequenti costano un gesto. La barra di comando è entrambe.

`<dialog>` nativo invece di un div con `role="dialog"`: trappola del fuoco, chiusura con Esc, sfondo inerte e gestione dello stack arrivano dal browser. Riscriverli a mano significa riscriverli peggio, ed è la stessa ragione per cui `InfoCampo` e il menu mobile usano `<details>`.

I risultati sono `Link` e non `button` con `router.push`: click centrale, ctrl+click e "apri in una nuova scheda" funzionano perché sono ancore vere. Un elenco di risultati che non si può aprire in una scheda nuova è una finta lista di link.

### La ricerca sanifica in un punto solo

`%` e `_` sono jolly in `like`, e la virgola separa le condizioni dentro `or()` di PostgREST. Lasciarle passare significa che chi cerca "50% acconto, saldo" ottiene una query diversa da quella scritta: nel caso migliore zero risultati, nel peggiore un filtro malformato. La ripulitura sta in una funzione sola, testata, invece che ripetuta in ognuna delle quattro interrogazioni — dove prima o poi ne mancherebbe una.

Quattro `select` in parallelo e non una vista SQL unificata: le tabelle hanno colonne diverse e una `union` costringerebbe a inventare un formato comune che nessuna delle quattro usa. Costa un round-trip, resta leggibile.

Un termine numerico ("12", "12/2026") cerca il progressivo di una fattura, non un testo nelle note — ma solo se somiglia davvero a un numero: un `ilike` su una colonna intera finirebbe in un cast e in un errore.

### Regole del compilatore React rispettate, non aggirate

Il linter ha bocciato due cose. La prima, `setState` dentro un effetto per azzerare i risultati sotto la soglia: risolta **derivando** il valore invece di memorizzarlo — uno stato calcolabile non va conservato. La seconda, un ref letto da una funzione passata durante il render: risolta passando gli handler per riferimento e trasformando i risultati in `Link`. In entrambi i casi il codice è migliorato; disattivare la regola sarebbe stato più corto e peggiore.

### Cosa arriva nelle prossime fette

1. **CRM**: clienti come entità vere — trattative, attività, storico, valore collegato alle fatture.
2. **Note** collegate a clienti e pratiche.
3. **Calendario** interno con le scadenze fiscali già dentro ed esportazione `.ics`.
4. **Posta** IMAP/SMTP con credenziali cifrate.
5. **Coerenza visiva**: un'intestazione di pagina unica su tutte le sezioni, oggi ognuna ha la sua.

## Fase 13: il CRM

### Cosa aggiunge davvero: il tempo

L'anagrafica clienti esisteva già e dice *chi sono*. Quello che mancava è *cosa sta succedendo*: quali opportunità sono aperte, quanto valgono, quando ci si è parlati l'ultima volta. Oltre la decina di clienti quella seconda informazione non sta più in testa, e il costo di perderla non è teorico — è una proposta mai richiamata.

### Valore ponderato, non somma grezza

La somma delle trattative aperte è il numero che ogni venditore si racconta. Moltiplicare ciascuna per la probabilità dichiarata è ciò che lo rende utilizzabile per decidere se accettare il prossimo lavoro.

Le trattative **vinte restano fuori dal ponderato**. Sembra controintuitivo, ed è il punto: una vinta è fatturato, non previsione. Contarla di nuovo tra le aspettative gonfia il futuro con qualcosa che è già passato.

La probabilità è **dichiarata dall'utente e separata dalla fase**. La fase la suggerisce quando si crea la trattativa, ma non la impone e non la sovrascrive dopo una modifica manuale: due proposte allo stesso stadio possono valere molto diversamente, e appiattirle su una percentuale fissa per fase produce una previsione precisa in apparenza e arbitraria in sostanza — la peggiore categoria di numero.

### `trattativeFerme` è la funzione che giustifica il modulo

Tutto il resto è contabilità di opportunità, che si può tenere anche su un foglio. Questa no: elenca le trattative aperte su cui non si mette mano da oltre tre settimane, contando dall'ultima attività registrata sul cliente e, in mancanza, dall'ultimo aggiornamento della trattativa — che è comunque un momento in cui qualcuno ci ha messo mano.

Il criterio è dichiarato in una costante con un nome che si legge, non nascosto in un `21` dentro un confronto.

### Un prossimo passo senza data viene rifiutato

Il modulo delle attività accetta "cosa è successo" e "cosa va fatto dopo". Se si scrive il secondo senza una data, il salvataggio si ferma e lo spiega: un'intenzione senza scadenza non comparirebbe in nessun elenco e verrebbe dimenticata. Accoglierla in silenzio sarebbe stato più gentile e meno utile — e avrebbe svalutato gli impegni veri messi accanto.

### Il difetto che l'advisor ha trovato, e che era ovunque

Dopo la migrazione, l'advisor di Supabase ha segnalato `auth_rls_initplan` su tutte le tabelle fiscali: una policy scritta `auth.uid() = user_id` fa rivalutare la funzione **una volta per riga esaminata**. La forma corretta è `(select auth.uid()) = user_id`, che Postgres promuove a InitPlan e calcola una volta per query.

Il comportamento di sicurezza è identico — cambia solo quante volte si paga la stessa risposta — ma il costo cresce linearmente con le righe, e la correzione è gratuita. Era ripetuto su **quattordici policy su quattordici**, cioè in ogni tabella scritta finora: correggere solo le due nuove sarebbe stato un lavoro a metà, quindi la migrazione le riscrive tutte con un ciclo su `pg_policies` e verifica che ne resti zero da correggere.

Vale la pena notare cosa ha trovato il difetto: non una revisione del codice, ma uno strumento eseguito **dopo** la migrazione. La lezione è procedurale — l'advisor va eseguito a ogni cambio di schema, non a fine progetto.

Nella stessa migrazione, l'indice mancante sulla chiave esterna `fiscale_attivita.trattativa_id`: le altre due erano indicizzate, questa no. Una svista, non una scelta, ed è utile scriverlo per non rileggerla un giorno come se fosse stata deliberata.

### Cosa arriva dopo

1. **Note** collegate a clienti e trattative.
2. **Calendario** interno con dentro le scadenze fiscali, ed esportazione `.ics`.
3. **Posta** IMAP/SMTP con credenziali cifrate.
4. **Coerenza visiva**: un'intestazione di pagina unica, oggi ogni sezione ha la sua.

## Fase 14: la catena delle quattro cause

Per quasi un giorno il sito in produzione è rimasto fermo alla 1.0.2 mentre su GitHub arrivavano previsione, documenti, archivio annuale, barra di comando e CRM. La pipeline era verde a ogni push. Il codice era corretto. Il messaggio d'errore diceva un'altra cosa ancora.

Vale la pena registrarlo per intero, perché il caso è istruttivo più della soluzione.

### Cosa diceva l'errore, e perché era fuorviante

> The deployment was blocked because the commit author did not have contributing access to the project on Vercel. The Hobby Plan does not support collaboration for private repositories. Please upgrade to Pro to add team members.

Tre affermazioni, tutte tecnicamente vere e tutte irrilevanti: non c'erano collaboratori, non serviva il piano Pro, e l'autore era il titolare. Seguire il suggerimento — pagare — non avrebbe risolto nulla.

### La catena, dal fondo

1. **I commit erano firmati `info@netrak.fr`.** Era l'indirizzo del brand dismesso, configurato in git nell'ambiente di sviluppo. GitHub lo associa a un **secondo account, `netrakfr`**, e mostrava tutti i commit attribuiti a quell'utente: da lì, per Vercel, un contributore estraneo al progetto.
2. **Corretto l'autore, i deploy venivano ancora annullati.** Il motivo vero compare solo aprendo la finestra di deploy manuale: *"The Deployment was canceled because it was created with an unverified commit"*. Non l'autore: la **firma**. Vercel non costruisce commit non firmati crittograficamente.
3. **Firmati i commit con GPG, restavano «Unverified».** GitHub verifica una firma solo se l'indirizzo dentro la chiave è un indirizzo **verificato dell'account**. La chiave usava l'indirizzo `noreply`, che è attivo solo quando è accesa l'opzione *Keep my email addresses private* — che era spenta.
4. **Acceso quell'interruttore**, GitHub ha rivalutato le firme già caricate e il commit è passato a **Verified**. La catena si è chiusa.

### Cosa se ne impara

**Il primo messaggio d'errore raramente nomina la causa.** Qui ne indicava una plausibile e sbagliata, con tanto di soluzione a pagamento. La causa vera stava tre livelli più in basso e in un'altra schermata. Il modo per trovarla non è stato ragionare meglio sul messaggio: è stato aprire la finestra di deploy manuale, dove Vercel dice un'altra cosa.

**Ogni anello, preso da solo, sembrava la spiegazione completa.** Dopo aver corretto l'autore era ragionevole aspettarsi che funzionasse — e non funzionava. Una catena di cause si riconosce solo continuando a verificare dopo aver "risolto".

**La verifica esterna non mente.** In tutto questo la pipeline era verde e il codice sano: il difetto stava interamente nella catena di fiducia tra chi scrive, chi firma e chi rilascia. Nessun test lo avrebbe mai intercettato, perché non era un difetto del software.

### Gli effetti collaterali, tutti positivi

- I commit ora sono **firmati**. Per un progetto che va in produzione da solo a ogni push è la difesa giusta: senza firma, chiunque ottenga un token di scrittura pubblica a nome del titolare, e la storia non conserva prova di chi abbia scritto cosa.
- L'autore è ora l'indirizzo `noreply` dell'account: l'indirizzo reale smette di comparire nei commit.
- Il secondo account `netrakfr` non compare più tra gli autori.

I commit fino alla 1.4.0 restano non firmati e attribuiti a `netrakfr`. Rifirmarli significherebbe riscrivere la storia e cambiare tutti gli hash: non vale il rischio per un'attribuzione più ordinata su lavoro già passato.

### Nota operativa

La chiave privata di firma vive nell'ambiente di sviluppo, che è temporaneo. Se quell'ambiente viene ricreato, serve una chiave nuova e un nuovo caricamento su GitHub — un passaggio manuale che si ripete. È un costo noto della scelta, non una svista.
