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

## Aliquota INPS priva di soglia di esenzione per gli acconti

Per l'imposta sostitutiva la soglia di esenzione (51,65 €) e la rata unica (sotto 257,52 €) sono normate esplicitamente. Per i contributi INPS Gestione Separata non è stata reperita una soglia equivalente confermata: `lib/domain/scadenzario.ts` applica le stesse soglie per coerenza, segnalato con un commento nel codice. È un'approssimazione da verificare con un commercialista prima di fare affidamento sull'assenza di un acconto INPS di importo esiguo.
