# Changelog

Versionamento semantico (`MAJOR.MINOR.PATCH`). In un'applicazione di questo
tipo il numero non è decorativo: **MAJOR** segnala un cambiamento che tocca il
calcolo delle imposte o il formato dei documenti trasmessi, cioè qualcosa che
può cambiare quanto versi o far scartare una fattura. **MINOR** aggiunge
funzionalità senza toccarli. **PATCH** corregge senza cambiare comportamento
atteso.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/).

## [1.6.0] — 2026-08-30

Le due funzionalità che il gestionale di regime-forfettario.it ha e qui
mancavano. Il resto di quel sito è uno studio di commercialisti: apertura della
partita IVA, contabilità seguita, assistenza. Sono persone, non funzionalità.

### Aggiunto

- **Listino** delle prestazioni ricorrenti, richiamabili nel preventivo con un menu. Le voci si ritirano invece di essere eliminate: restano citate nei documenti già emessi.
- **Preventivi** con numerazione propria, righe, validità obbligatoria, condizioni e stampa. Lo stato «scaduto» è derivato dalla data, non memorizzato.
- **Trasformazione in fattura** di un preventivo accettato: le righe vengono copiate e la fattura nasce in bozza.
- Riepilogo: valore in attesa di risposta, valore accettato, tasso di accettazione calcolato solo su chi ha risposto, e scaduti contati a parte.

## [1.5.0] — 2026-08-30

### Corretto

- **Eliminare una fattura non funzionava** quando una nota di credito la stornava: il vincolo del database rifiutava, l'azione non catturava nulla e l'utente riceveva una schermata di errore senza spiegazione. Ora il motivo si verifica prima e si spiega in italiano.

### Aggiunto

- Pannello di eliminazione che **elenca le conseguenze** invece di chiedere «sei sicuro?»: il numero di trasmissione che resta bruciato, l'incasso che esce dai riepiloghi dell'anno, gli allegati eliminati insieme al documento.

### Modificato

- **Vocabolario visivo unico**: intestazione di pagina, metrica, scheda e stato vuoto vengono da un solo componente. Il riquadro di una metrica era stato riscritto tre volte identico in tre pagine.
- Titoli con spaziatura ottica corretta, righe di elenco con stato al passaggio del mouse, barre di scorrimento coerenti con il tema scuro.

## [1.4.0] — 2026-08-30

Prima fetta dei moduli: il CRM.

### Aggiunto

- **Trattative** con pipeline a tre fasi, valore in gioco e **valore ponderato** per probabilità. Le trattative chiuse non entrano nella previsione, nemmeno le vinte: quelle sono fatturato.
- **Trattative ferme**: le opportunità aperte senza contatti da oltre tre settimane, in evidenza. Non si perde una trattativa decidendo di perderla.
- **Attività e prossimi passi**: chiamate, email, incontri e note per cliente, con il prossimo passo e la sua data. Un passo senza data viene rifiutato con una spiegazione, invece che accolto e dimenticato.
- **Scheda cliente unificata**: fatturato reale calcolato dai documenti emessi, trattative, storico dei contatti e ultime fatture. I dati anagrafici stanno in fondo, dietro un pannello.
- Tasso di conversione e valore vinto.

### Corretto

- **Tutte le policy RLS rivalutavano `auth.uid()` per ogni riga esaminata.** Ora la funzione è racchiusa in una sottoquery scalare e Postgres la calcola una volta per query. Il comportamento di sicurezza è identico; cambia quante volte si paga la stessa risposta. Segnalato dall'advisor di Supabase, corretto su tutte e quattordici le policy e non solo sulle nuove.
- Chiave esterna `fiscale_attivita.trattativa_id` senza indice.

## [1.3.0] — 2026-08-30

Prima fetta della trasformazione da applicazione fiscale a strumento di lavoro:
l'impalcatura. I moduli (CRM, note, calendario, posta) arrivano dentro questa.

### Aggiunto

- **Barra di comando** con ⌘K / Ctrl+K: cerca tra clienti, documenti, archivio e spese, e apre le azioni frequenti. Costruita su `<dialog>` nativo, quindi con trappola del fuoco, Esc e sfondo inerte gestiti dal browser.
- **Ricerca trasversale** lato server, con le policy RLS attive: nessun indice di dati fiscali viene spedito al browser.
- Barra fissa in alto su desktop con ricerca e azione primaria.

### Modificato

- L'area di lavoro è più larga (da 4xl a 5xl) e il nome nell'intestazione è "GAR Studio": l'applicazione non è più solo la fiscalità.

## [1.2.0] — 2026-08-30

### Aggiunto

- **Archivio documenti**: ricevute, contratti, quietanze F24 e Certificazioni Uniche, con collegamento facoltativo a una fattura o a una spesa. I file stanno in uno spazio privato e si aprono con un link firmato che scade dopo un minuto.
- **Archivio annuale per il commercialista** (`.zip`): CSV di fatture e spese, riepilogo dei numeri dell'anno e gli XML già trasmessi allo SDI. Le fatture senza numero di trasmissione non vengono ricostruite e sono elencate nel LEGGIMI.
- Gli allegati di una fattura compaiono sulla pagina della fattura.

### Modificato

- La voce "Esporta CSV" del menu è diventata "Archivio (.zip)": contiene lo stesso CSV e molto altro.

## [1.1.0] — 2026-08-30

Due cose che mancavano e che si sentono ogni mese: sapere dove finirà l'anno, e
sapere chi non ha pagato.

### Aggiunto

- **Previsione di chiusura dell'anno** in cima alla dashboard, con due scenari dichiarati — prudente (solo incassato più emesso) e al ritmo attuale — e la composizione del fatturato previsto. Non elegge uno scenario: la forbice tra i due è l'informazione. Sotto i 45 giorni di attività non proietta, e nell'anno di apertura parte dalla data di apertura invece che dal 1° gennaio.
- **Stato di incasso delle fatture**: scadenza, giorni di ritardo, fasce di anzianità (entro 30, entro 60, oltre 60) e scaduto in evidenza sulla dashboard.
- **Sollecito pronto da copiare** sulla pagina della fattura, con tono proporzionato al ritardo. Si prepara e si modifica; l'invio resta dell'utente.
- **Barra inferiore su mobile** con le quattro destinazioni quotidiane, nella zona raggiungibile dal pollice.

### Modificato

- Il menu è raggruppato in Lavoro, Fisco e Impostazioni, e la voce della pagina corrente è evidenziata: quattordici voci indistinte costringevano a rileggere il titolo per sapere dove si era.

## [1.0.2] — 2026-08-30

### Modificato

- Il rilascio in produzione è legato al commit su `main`: progetto Vercel collegato al repository, anteprima per ogni pull request, rollback dalla dashboard.
- Nuovo URL di produzione: `piva-fiscale.vercel.app`. Il precedente `project-jr16d.vercel.app` sta su un altro account Vercel e va dismesso.

## [1.0.1] — 2026-08-30

Prima esecuzione della pipeline su GitHub. È andata rossa, ed è stato utile:
`npm run typecheck` passava in locale solo perché la cartella `.next` era già
popolata da una build precedente.

### Corretto

- `typecheck` genera i tipi delle rotte (`next typegen`) prima di controllarli: su un checkout pulito, senza `.next`, `tsc` non trovava `LayoutProps` e bocciava codice corretto.
- Il caricamento del referto Playwright non segnala più un errore quando la pipeline si ferma prima degli end-to-end e il referto non esiste.

### Rimosso

- `scripts/collega-repo.sh`: creava il repository e lo collegava a Vercel. Il repository ora esiste, e lo script era comunque ineseguibile sulla macchina di destinazione, che è Windows.

## [1.0.0] — 2026-08-29

Prima versione considerata completa: emette documenti fiscalmente validi, non
solo li registra. Da qui in avanti le modifiche al calcolo o al formato XML
sono cambiamenti MAJOR.

### Aggiunto

- Fatturazione elettronica: anagrafica clienti, fatture e note di credito (TD01/TD04), generazione del file XML FatturaPA valido per lo SDI con validazione preventiva dei controlli di scarto.
- Copia di cortesia impaginata per la stampa, con anteprima che si aggiorna durante la compilazione.
- Generatore F24 con i codici tributo reali e registro dei crediti compensabili, con la soglia dei 5.000 € del visto di conformità.
- Riepilogo del Quadro LM e registro dei dati da Certificazione Unica per il Quadro RC.
- Base di conoscenza normativa consultabile, con fonti e data di verifica per ogni voce.
- Osservabilità: log strutturato degli errori e pagina di diagnostica.
- Informativa sul trattamento dei dati personali.
- Test end-to-end sui percorsi critici, su desktop e mobile.
- Verifica automatica del contrasto WCAG 2.1 AA e performance budget, entrambi bloccanti in CI.

### Corretto

- **Imposta sostitutiva calcolata sul reddito lordo** anziché al netto dei contributi INPS dedotti (art. 1 c. 64 L. 190/2014). Sovrastimava l'imposta di circa 305 € su 10.000 € incassati.
- **Acconto dell'imposta ripartito 50/50** anziché 40/60 (art. 17 c. 3 DPR 435/2001).
- **Acconto INPS omesso su importi piccoli**: applicava per analogia le soglie di esenzione dell'imposta sostitutiva, che alla Gestione Separata non si applicano.
- Codice tributo del bollo virtuale: era un'etichetta segnaposto, ora sono i codici reali 2521-2524 per trimestre.
- Contrasto di `--ink-faint` sotto il minimo WCAG 2.1 AA (2,85:1 contro 4,5:1 richiesti).
- Dodici blocchi `catch` che scartavano la causa dell'errore.

### Modificato

- Il registro incassi è sostituito dalle fatture come fonte di verità del calcolo. Il contratto interno del motore fiscale resta invariato.
- Terminologia corretta da "ditta individuale" a "libero professionista" (art. 53 TUIR, non art. 55): la logica di calcolo non era affetta.

### Note per chi aggiorna

- La tabella `fiscale_incassi` resta come backup della migrazione, non letta da alcun codice. Eliminabile dopo verifica dei totali.
- La pipeline CI è scritta ma inattiva finché il repository non ha un remote: vedi `.github/workflows/README.md`.
