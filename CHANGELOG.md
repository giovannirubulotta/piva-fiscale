# Changelog

Versionamento semantico (`MAJOR.MINOR.PATCH`). In un'applicazione di questo
tipo il numero non è decorativo: **MAJOR** segnala un cambiamento che tocca il
calcolo delle imposte o il formato dei documenti trasmessi, cioè qualcosa che
può cambiare quanto versi o far scartare una fattura. **MINOR** aggiunge
funzionalità senza toccarli. **PATCH** corregge senza cambiare comportamento
atteso.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/).

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
