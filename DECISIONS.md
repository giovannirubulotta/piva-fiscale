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
