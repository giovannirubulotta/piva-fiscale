import type { SpiegazioneCampo } from "@/components/InfoCampo";

/**
 * Testi dei pulsanti informativi "ⓘ" sui campi dell'app: cos'è ogni dato e
 * dove reperirlo, così da poterlo compilare senza doverlo chiedere prima al
 * commercialista. Contenuto editoriale, separato dai componenti che lo
 * mostrano (InfoCampo) — cambiare un testo non tocca la UI.
 */
export const spiegazioni = {
  partitaIva: {
    cosaE: "Il numero a 11 cifre che identifica la tua attività ai fini fiscali e IVA.",
    doveTrovarlo:
      "Sulla ricevuta di attribuzione rilasciata dall'Agenzia delle Entrate dopo l'apertura (modello AA9/12), o nel Cassetto Fiscale su ivaservizi.agenziaentrate.gov.it.",
  },
  codiceAteco: {
    cosaE: "Il codice che classifica la tua attività economica: da questo dipende il coefficiente di redditività del regime forfettario.",
    doveTrovarlo:
      "Sul modello AA9/12 di apertura P.IVA o nel Cassetto Fiscale (ivaservizi.agenziaentrate.gov.it). Sulla visura camerale solo se la tua attività richiede l'iscrizione al Registro Imprese — non il caso tipico di un libero professionista.",
    riferimento: "Classificazione ATECO 2025 (ISTAT / Agenzia delle Entrate).",
  },
  dataApertura: {
    cosaE:
      "La data in cui hai aperto la partita IVA: da questa dipende quando iniziano a decorrere gli acconti e, se spettante, l'agevolazione al 5% dei primi 5 anni.",
    doveTrovarlo: "Sulla ricevuta di apertura P.IVA (modello AA9/12) o nel Cassetto Fiscale.",
  },
  coefficienteRedditivita: {
    cosaE:
      "La percentuale del fatturato incassato che diventa reddito imponibile: il resto è considerato forfettariamente costo, senza doverlo documentare.",
    doveTrovarlo:
      "Si compila da solo in base al codice ATECO inserito sopra; verificalo comunque contro la tabella ufficiale se la tua attività è a cavallo tra più categorie.",
    riferimento: "Allegato 4 L. 190/2014, come modificato dall'art. 1 co. 87 L. 208/2015.",
  },
  agevolazione5Percento: {
    cosaE:
      "Aliquota ridotta al 5% (invece del 15%) nei primi 5 anni di attività, applicabile solo se: l'attività non è mera prosecuzione di un lavoro dipendente o autonomo precedente, non hai svolto negli ultimi 3 anni un'attività analoga, e (se prosecuzione di un'attività d'impresa altrui) i ricavi dell'anno precedente non superano la soglia forfettaria.",
    doveTrovarlo:
      "Non è un dato che trovi su un documento: va verificato ripercorrendo la tua storia lavorativa recente, idealmente con un commercialista se il caso non è netto.",
    riferimento: "Art. 1 comma 65 L. 190/2014.",
  },
  aliquotaSostitutivaStandard: {
    cosaE: "L'aliquota unica che sostituisce IRPEF, addizionali regionale/comunale e IRAP, applicata sul reddito imponibile forfettario.",
    doveTrovarlo: "Fissata per legge, uguale per tutti: verificala su Agenzia delle Entrate o Gazzetta Ufficiale per l'anno in corso.",
    riferimento: "Art. 1 comma 64 L. 190/2014.",
  },
  aliquotaSostitutivaAgevolata: {
    cosaE: "Versione ridotta dell'imposta sostitutiva per chi ha diritto al regime start-up nei primi 5 anni di attività.",
    doveTrovarlo: "Fissata per legge, uguale per tutti gli aventi diritto.",
    riferimento: "Art. 1 comma 65 L. 190/2014.",
  },
  aliquotaInps: {
    cosaE:
      "L'aliquota dei contributi previdenziali dovuti alla Gestione Separata INPS, calcolata sul reddito imponibile forfettario (non sul fatturato lordo).",
    doveTrovarlo: "Pubblicata ogni anno da INPS con circolare, di norma nei primi mesi dell'anno.",
    riferimento: "Circolare INPS annuale sulla Gestione Separata.",
  },
  massimaleInps: {
    cosaE: "Il tetto massimo di reddito su cui si calcolano i contributi INPS: oltre questa soglia non si versa più, anche se il reddito continua a crescere.",
    doveTrovarlo: "Circolare INPS annuale sulla Gestione Separata.",
  },
  minimaleInps: {
    cosaE: "La soglia di reddito ai fini dell'accredito contributivo pieno dell'anno; sotto questa soglia l'accredito può risultare parziale.",
    doveTrovarlo: "Circolare INPS annuale sulla Gestione Separata.",
  },
  incassoCliente: {
    cosaE: "Il nominativo o la ragione sociale del cliente a cui hai emesso la fattura.",
  },
  incassoNumeroFattura: {
    cosaE: "Il numero identificativo della fattura, come l'hai numerata (es. 1/2026).",
    doveTrovarlo: "Sul documento di fattura che hai emesso.",
  },
  incassoDataEmissione: {
    cosaE: "La data indicata sulla fattura come data di emissione — non è detto coincida con quando verrai pagato.",
  },
  incassoDataIncasso: {
    cosaE:
      "La data in cui hai effettivamente ricevuto il pagamento: è questa, non la data di emissione, a determinare in quale anno l'incasso concorre al reddito imponibile (il forfettario tassa per cassa).",
    doveTrovarlo: "L'estratto conto o il movimento sul conto dove hai ricevuto il bonifico o il pagamento.",
  },
  incassoImportoNetto: {
    cosaE: "L'importo della fattura al netto di eventuali ritenute, senza IVA (il regime forfettario non applica IVA in fattura).",
  },
  incassoBolloApplicato: {
    cosaE: "Da barrare se la fattura supera 77,47 € e hai applicato la marca da bollo da 2 €, obbligatoria sulle fatture senza IVA sopra questa soglia.",
    riferimento: "D.P.R. 642/1972, tabella allegato A, art. 13.",
  },
  incassoGiaIncassata: {
    cosaE:
      "Barra se hai già ricevuto il pagamento. Lascia scoperto se la fattura è ancora da incassare: verrà comunque registrata, ma non concorrerà al calcolo delle imposte finché non risulterà incassata.",
  },
  speseData: {
    cosaE: "La data in cui hai sostenuto la spesa.",
  },
  speseDescrizione: {
    cosaE: "Cosa hai acquistato o pagato — solo per tenere traccia di cosa esce davvero dal tuo conto.",
  },
  speseCategoria: {
    cosaE: "Etichetta libera per raggruppare le spese nei tuoi riepiloghi personali (es. 'strumenti', 'trasporti').",
    doveTrovarlo: "Non ha alcun effetto sul calcolo delle imposte: nel regime forfettario le spese non riducono l'imponibile.",
  },
  speseImporto: {
    cosaE: "L'importo pagato, comprensivo di IVA se il fornitore l'ha applicata (tu la subisci come costo, non la recuperi).",
  },
  requisitoRedditoLavoroDipendente: {
    cosaE:
      "Se nell'anno precedente hai percepito, oltre ai compensi da questa attività, redditi da lavoro dipendente o assimilati (incluse le pensioni) per più di 35.000 €, non puoi restare nel regime forfettario nell'anno successivo.",
    doveTrovarlo: "Sulla Certificazione Unica (CU) rilasciata dal datore di lavoro o dall'ente pensionistico per l'anno precedente.",
    riferimento: "Art. 1 comma 57 lett. d-ter L. 190/2014.",
  },
  requisitoPartecipazioniSocieta: {
    cosaE:
      "Se possiedi partecipazioni in società di persone, associazioni professionali o SRL a controllo diretto o indiretto che svolgono un'attività economica riconducibile, anche indirettamente, alla tua, sei escluso dal regime.",
    doveTrovarlo: "Verifica le tue eventuali partecipazioni sul Cassetto Fiscale (sezione Anagrafe Tributaria) o sulla visura camerale delle società partecipate — non della tua posizione, che come libero professionista non compare sul Registro Imprese. Chiedi conferma al commercialista se hai quote in altre attività.",
    riferimento: "Art. 1 comma 57 lett. a) e d) L. 190/2014.",
  },
  requisitoCommittentePrevalenteExDatore: {
    cosaE:
      "Se svolgi l'attività prevalentemente (oltre il 50% dei ricavi) per un committente che è stato tuo datore di lavoro nei due anni precedenti, o per un soggetto a lui direttamente o indirettamente riconducibile, sei escluso — salvo il caso del praticantato obbligatorio.",
    doveTrovarlo: "Confronta i tuoi principali clienti dell'anno con i tuoi datori di lavoro degli ultimi due periodi d'imposta (dalle CU ricevute).",
    riferimento: "Art. 1 comma 57 lett. d-bis L. 190/2014.",
  },
  requisitoResidenzaFuoriUe: {
    cosaE:
      "Il regime forfettario richiede la residenza fiscale in Italia, oppure in un paese UE/SEE con almeno il 75% del reddito complessivo prodotto in Italia.",
    riferimento: "Art. 1 comma 57 lett. b) L. 190/2014.",
  },
  creditoTipologia: {
    cosaE: "Il tributo a cui si riferisce il credito: da questo dipende se la soglia del visto di conformità si applica o no.",
    doveTrovarlo:
      "Dal rigo del Modello Redditi dove risulta l'eccedenza (es. LM47 per l'imposta sostitutiva forfettaria) o dalla certificazione delle ritenute subite.",
  },
  creditoAnnoMaturazione: {
    cosaE: "L'anno d'imposta in cui il credito è maturato (es. l'anno a cui si riferisce la dichiarazione che lo genera).",
  },
  creditoImporto: {
    cosaE: "L'importo del credito disponibile per la compensazione, come risulta dalla dichiarazione o dal rigo di riferimento.",
  },
  creditoNote: {
    cosaE: "Riferimento libero per ritrovare la fonte del credito (es. 'LM47 dichiarazione 2027' o il numero della fattura con ritenuta).",
  },
  lavoroAnno: {
    cosaE: "L'anno d'imposta a cui si riferisce la Certificazione Unica (CU) ricevuta dal datore di lavoro.",
  },
  lavoroDatoreLavoro: {
    cosaE: "Il nominativo o la ragione sociale del datore di lavoro che ha rilasciato la CU (facoltativo, solo per tua consultazione).",
  },
  lavoroRedditoImponibile: {
    cosaE:
      "Il reddito imponibile da lavoro dipendente indicato in CU (punti 1-2 della sezione dati fiscali), da sommare al reddito forfettario solo nel calcolo dell'IRPEF a scaglioni sul reddito complessivo — mai nell'imposta sostitutiva forfettaria, che resta separata e non viene qui ricalcolata.",
    doveTrovarlo: "Certificazione Unica (CU), sezione 'Dati fiscali', punti 1-2.",
  },
  lavoroRitenuteIrpef: {
    cosaE: "Le ritenute IRPEF già trattenute in busta paga dal datore di lavoro nell'anno, come risultano in CU.",
    doveTrovarlo: "Certificazione Unica (CU), punto 21 della sezione dati fiscali.",
  },
  lavoroAddizionaleRegionale: {
    cosaE: "L'addizionale regionale IRPEF trattenuta dal datore di lavoro nell'anno, come risulta in CU.",
    doveTrovarlo: "Certificazione Unica (CU), sezione addizionali regionali.",
  },
  lavoroAddizionaleComunale: {
    cosaE: "L'addizionale comunale IRPEF trattenuta (a saldo e in acconto) dal datore di lavoro nell'anno, come risulta in CU.",
    doveTrovarlo: "Certificazione Unica (CU), sezione addizionali comunali.",
  },
  clienteTipologia: {
    cosaE:
      "Determina come il cliente viene identificato nella fattura elettronica: un privato si identifica col codice fiscale, un'azienda o un professionista con la partita IVA, una pubblica amministrazione con il codice univoco IPA a 6 caratteri.",
  },
  clientePartitaIva: {
    cosaE: "Le 11 cifre della partita IVA del cliente, senza il prefisso IT (che si indica a parte).",
    doveTrovarlo: "Su una fattura o un documento del cliente, oppure sulla visura camerale.",
    riferimento: "Una partita IVA errata fa scartare la fattura dallo SDI (errore 00305).",
  },
  clienteCodiceFiscale: {
    cosaE:
      "Obbligatorio per i clienti privati senza partita IVA. Per aziende e professionisti è facoltativo se la partita IVA è indicata.",
    riferimento: "Senza né partita IVA né codice fiscale la fattura viene scartata (errore SDI 00417).",
  },
  clienteCodiceDestinatario: {
    cosaE:
      "L'indirizzo telematico a cui lo SDI recapita la fattura. Sette caratteri se il cliente ha un canale accreditato; 0000000 se è un privato, se ricevi solo la PEC, o se non lo conosci (in questo caso la fattura finisce nel cassetto fiscale del cliente); XXXXXXX per clienti non stabiliti in Italia.",
    doveTrovarlo: "Va chiesto al cliente: è lui a conoscerlo, di norma glielo comunica il suo commercialista o il suo gestionale.",
  },
  clientePecDestinatario: {
    cosaE:
      "Si compila solo se il codice destinatario è 0000000. Attenzione: se il cliente ha registrato un proprio canale telematico sul portale dell'Agenzia, quello prevale su questa PEC — non è un errore del software se la fattura arriva altrove.",
  },
  emittenteCodiceFiscale: {
    cosaE:
      "Il tuo codice fiscale: identifica te come soggetto che trasmette il file allo SDI, oltre a comparire tra i tuoi dati in fattura. Entra anche nel nome del file XML.",
    riferimento: "Se non risulta in Anagrafe Tributaria la fattura viene scartata (errore SDI 00300).",
  },
  emittenteIban: {
    cosaE: "L'IBAN su cui vuoi essere pagato: viene riportato in fattura e nel blocco dei dati di pagamento dell'XML.",
  },
  emittenteBolloRiaddebitato: {
    cosaE:
      "Se attivo, i 2 € di bollo vengono aggiunti come riga in fattura e li paga il cliente. Attenzione: in quel caso il riaddebito è considerato compenso e concorre al tuo reddito imponibile forfettario, quindi entra nel calcolo di imposta e contributi. Se disattivato, il bollo resta a tuo carico e non è un ricavo.",
    riferimento: "Verifica con un commercialista se il caso non ti è chiaro: incide sull'imponibile, non solo sulla fattura.",
  },
  fatturaTipoDocumento: {
    cosaE:
      "TD01 è la fattura ordinaria. TD04 è la nota di credito, che storna in tutto o in parte una fattura già emessa e va sempre collegata al documento originale.",
  },
  fatturaCondizioniPagamento: {
    cosaE: "TP01 pagamento a rate, TP02 pagamento completo in una soluzione, TP03 anticipo.",
  },
  fatturaModalitaPagamento: {
    cosaE: "Il codice della modalità concordata: MP05 bonifico, MP01 contanti, MP08 carta di pagamento, MP02 assegno.",
  },
  fatturaGiorniScadenza: {
    cosaE: "Dopo quanti giorni dall'emissione il pagamento è dovuto: da qui si calcola la data di scadenza in fattura.",
  },
} satisfies Record<string, SpiegazioneCampo>;
