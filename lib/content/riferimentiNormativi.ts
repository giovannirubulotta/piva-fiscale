/**
 * Base di conoscenza normativa curata: non un dump del sito INPS o
 * dell'Agenzia delle Entrate, ma le regole verificate che riguardano
 * davvero la situazione di Giovanni — libero professionista in regime
 * forfettario, iscritto alla Gestione Separata INPS senza altra cassa,
 * dal 2026 anche con un rapporto di lavoro dipendente in parallelo, e con
 * un cambio di residenza fiscale da Annemasse (Francia) a Torino avvenuto
 * a giugno 2026.
 *
 * Ogni voce riporta le fonti consultate e la data di verifica: non è un
 * testo statico, va riverificato quando cambiano le circolari annuali
 * (soglie, aliquote, massimali) o la normativa. `areaGrigia: true` marca
 * i punti dove le fonti non danno una risposta meccanica univoca e serve
 * un professionista per il caso specifico — non per prudenza generica, ma
 * perché è quello che risulta dalla ricerca stessa.
 */

export interface FonteRiferimento {
  titolo: string;
  url: string;
}

export interface TabellaRiferimento {
  intestazioni: string[];
  righe: string[][];
}

export interface VoceRiferimento {
  id: string;
  titolo: string;
  /** Paragrafi separati da riga vuota. */
  corpo: string;
  tabella?: TabellaRiferimento;
  fonti: FonteRiferimento[];
  verificatoIl: string;
  /** true se le fonti stesse segnalano che il punto richiede verifica professionale caso per caso. */
  areaGrigia?: boolean;
  /** Nota su disaccordi tra fonti o limiti della verifica, se rilevante. */
  notaVerifica?: string;
}

export interface CategoriaRiferimenti {
  id: string;
  titolo: string;
  nota?: string;
  voci: VoceRiferimento[];
}

export const categorieRiferimenti: CategoriaRiferimenti[] = [
  {
    id: "forfettario",
    titolo: "Regime forfettario",
    voci: [
      {
        id: "soglie-ricavi",
        titolo: "Le due soglie di ricavi: 85.000 € e 100.000 €",
        corpo:
          "Non sono la stessa soglia. Superare 85.000 € di ricavi incassati nell'anno (ma restare sotto 100.000 €) fa uscire dal regime forfettario solo dal 1° gennaio dell'anno successivo: per tutto l'anno in corso resti forfettario. Superare 100.000 € fa invece uscire immediatamente, nello stesso anno: l'IVA diventa dovuta già sulla fattura che fa superare la soglia, non solo su quelle successive.\n\nBase normativa: art. 1 comma 71 L. 190/2014 (soglia 85.000 €, di permanenza); il secondo periodo dello stesso comma, introdotto dalla L. 197/2022, disciplina la soglia di uscita immediata a 100.000 €.",
        tabella: {
          intestazioni: ["", "Sopra 85.000 €", "Sopra 100.000 €"],
          righe: [
            ["Quando si esce", "Dal 1° gennaio dell'anno successivo", "Subito, nello stesso anno"],
            ["IVA dovuta da", "Solo dall'anno successivo", "Dalla fattura che fa superare la soglia"],
          ],
        },
        fonti: [
          { titolo: "Fiscomania — Superamento limite dei ricavi nel regime forfettario", url: "https://fiscomania.com/limite-ricavi-regime-forfettario/" },
          { titolo: "LeggeInChiaro — Regime forfettario 2026: soglie 85.000 e 100.000", url: "https://leggeinchiaro.it/regime-forfettario-2026-soglie-85000-100000-cause-esclusione-flat-tax/" },
        ],
        verificatoIl: "28/08/2026",
      },
      {
        id: "aliquota-sostitutiva",
        titolo: "Imposta sostitutiva: 15% standard, 5% nei primi 5 anni",
        corpo:
          "L'aliquota ordinaria è il 15%. Si applica il 5% nei primi 5 periodi d'imposta di attività, ma solo se sono vere tutte e tre queste condizioni (art. 1 comma 65 L. 190/2014): non hai svolto, nei 3 anni precedenti, un'altra attività artistica, professionale o d'impresa; l'attività non è mera prosecuzione di un lavoro dipendente o autonomo precedente (salvo pratica obbligatoria per l'accesso alla professione); se prosegue un'attività svolta da altri, i loro ricavi dell'anno precedente non superavano la soglia di accesso al forfettario.\n\nUn punto meno noto, utile da tenere a mente: secondo la Risposta ad interpello Agenzia delle Entrate n. 226/E/2024, se in un qualunque momento sei transitato dal regime forfettario al regime ordinario, il diritto al 5% si perde in modo definitivo anche per gli anni residui del quinquennio agevolato — non si recupera rientrando nel forfettario.",
        fonti: [
          { titolo: "Fiscomania — Regime forfettario al 5%: quando si perde l'aliquota ridotta", url: "https://fiscomania.com/regime-forfettario-5-per-cento-primo-anno/" },
          { titolo: "Fiscozen — Legge 190/2014 art. 1 comma 54-89", url: "https://www.fiscozen.it/guide/articolo-1-comma-54-89/" },
        ],
        verificatoIl: "28/08/2026",
      },
      {
        id: "fattura-elettronica",
        titolo: "Fatturazione elettronica: obbligatoria per tutti dal 2024",
        corpo:
          "Dal 1° luglio 2022 l'obbligo riguardava solo i forfettari con ricavi 2021 sopra 25.000 €. Dal 1° gennaio 2024 è diventato generalizzato per tutti i soggetti in regime forfettario, indipendentemente dai ricavi (art. 18 D.L. 36/2022). Restano esclusi solo pochi casi minori (es. associazioni sportive dilettantistiche in regime L. 398/1991 con proventi sotto 65.000 €); resta inoltre vietato l'invio via SDI delle fatture per prestazioni sanitarie trasmesse al Sistema Tessera Sanitaria, regola valida per tutti i soggetti IVA.\n\nLe fatture si trasmettono tramite il Sistema di Interscambio (SDI), con un software di fatturazione compatibile o con il servizio gratuito dell'Agenzia delle Entrate nel portale \"Fatture e Corrispettivi\".",
        fonti: [
          { titolo: "Agenzia delle Entrate — Slide novità 2024 fatturazione elettronica (PDF)", url: "https://www.agenziaentrate.gov.it/portale/documents/20143/2891698/Slide+novit%C3%A0+2024+fatturaz+elettronica.pdf/a4196470-b717-3713-e5c0-47c6754d7276" },
          { titolo: "InformazioneFiscale — Fattura elettronica obbligatoria anche per i forfettari, da quando", url: "https://www.informazionefiscale.it/obbligo-fattura-elettronica-forfettari-da-quando" },
        ],
        verificatoIl: "28/08/2026",
      },
      {
        id: "obblighi-contabili",
        titolo: "Obblighi contabili semplificati e conservazione delle fatture",
        corpo:
          "Il forfettario è esonerato da: registrazione delle fatture emesse e di acquisto, registrazione dei corrispettivi, tenuta delle scritture contabili (libro giornale, registri IVA), liquidazione e versamento periodico dell'IVA, dichiarazione IVA annuale, IRAP.\n\nRestano obbligatori: la numerazione e conservazione delle fatture di acquisto e delle bollette doganali, l'emissione e conservazione delle fatture di vendita. Le fatture — elettroniche e non — vanno conservate per 10 anni. Per quelle elettroniche la conservazione deve essere digitale, conforme al CAD (immodificabilità, integrità, autenticità, leggibilità), tramite il servizio gratuito \"Fatture e Corrispettivi\" o un conservatore accreditato AGID, entro 3 mesi dal termine di presentazione della dichiarazione dei redditi dell'anno di riferimento. L'omessa conservazione è sanzionata da 1.000 a 8.000 €, riducibili a 500 € per irregolarità di scarsa rilevanza.",
        fonti: [
          { titolo: "Danea — Regime forfettario: le semplificazioni fiscali e contabili", url: "https://www.danea.it/blog/regime-forfettario-semplificazioni-fiscali-contabili/" },
          { titolo: "InformazioneFiscale — Conservazione fatture elettroniche, scadenza 2026 anche per i forfettari", url: "https://www.informazionefiscale.it/conservazione-fatture-elettroniche-scadenza-2026-forfettari" },
        ],
        verificatoIl: "28/08/2026",
      },
    ],
  },
  {
    id: "gestione-separata",
    titolo: "Gestione Separata INPS",
    nota: "Valori confermati identici a quelli già usati dall'app (tabella Impostazioni) contro la Circolare INPS n. 8 del 3/2/2026: nessuna correzione necessaria.",
    voci: [
      {
        id: "aliquota-2026",
        titolo: "Aliquota contributiva 2026: 26,07%",
        corpo:
          "Per un libero professionista con partita IVA, iscritto alla Gestione Separata, senza altra copertura previdenziale obbligatoria e non pensionato, l'aliquota 2026 è 26,07% — composta da 25,00% IVS (invalidità, vecchiaia, superstiti) + 0,72% aliquota aggiuntiva (maternità, assegni familiari, malattia/degenza ospedaliera) + 0,35% ISCRO (indennità straordinaria di continuità reddituale, L. 213/2023). Si applica sul reddito imponibile forfettario, non sul fatturato lordo.",
        fonti: [
          { titolo: "Circolare INPS n. 8 del 3/2/2026 (PDF integrale)", url: "https://www.fiscoetasse.com/files/21238/16550-circolare-numero-8-del-03-02-2026.pdf" },
        ],
        verificatoIl: "28/08/2026",
      },
      {
        id: "massimale-minimale-2026",
        titolo: "Massimale 122.295 € e minimale 18.808 € per il 2026",
        corpo:
          "Il massimale (art. 2 comma 18 L. 335/1995) è il tetto di reddito oltre il quale non si versano più contributi: 122.295 € per il 2026. Il minimale (art. 1 comma 3 L. 233/1990) è la soglia sotto la quale l'accredito contributivo ai fini pensionistici avviene solo in proporzione al reddito dichiarato, non per l'intero anno: 18.808 € per il 2026. Per un reddito forfettario tipico con coefficiente di redditività fino al 78%, il massimale resta un vincolo remoto salvo fatturati molto alti.",
        fonti: [
          { titolo: "Circolare INPS n. 8 del 3/2/2026 (PDF integrale)", url: "https://www.fiscoetasse.com/files/21238/16550-circolare-numero-8-del-03-02-2026.pdf" },
        ],
        verificatoIl: "28/08/2026",
      },
      {
        id: "iscrizione",
        titolo: "Iscrizione alla Gestione Separata: entro 30 giorni dall'apertura P.IVA",
        corpo:
          "Chi apre una partita IVA per un'attività professionale non regolamentata da un Albo (senza cassa di categoria) deve iscriversi entro 30 giorni dall'apertura. L'iscrizione è gratuita, va fatta una sola volta, esclusivamente online sul portale INPS (servizio \"Domanda Iscrizione Parasubordinati\"), con autenticazione SPID/CIE/CNS — il vecchio PIN INPS non è più accettato. Nella domanda va selezionato il profilo \"Professionista\" (non \"parasubordinato\") e vanno indicati partita IVA e codice ATECO. In alternativa la pratica può essere delegata a un commercialista.",
        fonti: [
          { titolo: "Fiscozen — Gestione Separata: come e quando iscriversi", url: "https://www.fiscozen.it/guide/gestione-separata-iscrizione/" },
          { titolo: "Taxman — Come iscriversi all'INPS Gestione Separata", url: "https://www.taxmanapp.it/blog/2026/01/28/come-iscriversi-allinps-gestione-separata/" },
        ],
        verificatoIl: "28/08/2026",
        notaVerifica: "Non è stato reperito un testo INPS primario col termine esplicito dei 30 giorni (le pagine INPS raggiunte non hanno restituito il corpo testuale in questa ricerca); dato concordante su due fonti secondarie indipendenti.",
      },
      {
        id: "scadenze-versamento",
        titolo: "Scadenze di versamento: stesse date fiscali, acconto 80% in due rate",
        corpo:
          "I contributi si versano con F24 telematico, alle stesse scadenze fiscali del saldo e degli acconti IRPEF (di norma 30 giugno e 30 novembre). L'acconto complessivo è pari all'80% del dovuto dell'anno precedente, in due rate uguali del 40% ciascuna — meccanismo confermato invariato per il 2026 dalla Circolare INPS n. 8/2026.",
        fonti: [
          { titolo: "Circolare INPS n. 8 del 3/2/2026 (PDF integrale)", url: "https://www.fiscoetasse.com/files/21238/16550-circolare-numero-8-del-03-02-2026.pdf" },
          { titolo: "Fiscozen — Calcolo acconto INPS Gestione Separata", url: "https://www.fiscozen.it/guide/calcolo-acconto-inps-gestione-separata/" },
        ],
        verificatoIl: "28/08/2026",
      },
      {
        id: "sanzioni-civili-inps",
        titolo: "Omesso versamento contributi: sanzioni civili, non ravvedimento fiscale",
        corpo:
          "Il mancato o tardivo versamento dei contributi INPS non segue il ravvedimento operoso fiscale (che riguarda le imposte, non i contributi): si applica invece il regime delle sanzioni civili, art. 116 L. 388/2000 come modificato dal D.L. 19/2024, per gli inadempimenti dal 1° settembre 2024.\n\nPer semplice omissione (senza occultamento): se versi spontaneamente entro 120 giorni dalla scadenza, in un'unica soluzione e prima di contestazioni, paghi solo il tasso di riferimento BCE, senza maggiorazioni. Oltre i 120 giorni si aggiungono 5,5 punti percentuali (tetto massimo 40% dei contributi non versati). Per evasione contributiva (posizione non dichiarata) la sanzione è del 30% annuo, tetto 60%, con riduzioni se denunciata spontaneamente entro 12 mesi. Oltre il tetto massimo, sul residuo si applicano solo gli interessi legali (1,60% nel 2026).",
        fonti: [
          { titolo: "Lavorosi — INPS circ. n. 90/2024: nuovo regime sanzionatorio", url: "https://www.lavorosi.it/contribuzione-previdenziale/omissioni-evasione-contributiva/inps-circ-n-90-del-4102024-omissioni-e-evasioni-contributive-nuovo-regime-sanzionatorio/" },
          { titolo: "Decreto MEF 10/12/2025, tasso di interesse legale 2026 (Gazzetta Ufficiale)", url: "https://www.gazzettaufficiale.it/eli/id/2025/12/13/25A06705/sg" },
        ],
        verificatoIl: "28/08/2026",
        notaVerifica: "Il testo integrale della Circolare INPS n. 90/2024 non è stato reperito direttamente da inps.it in questa ricerca; il meccanismo è basato su due fonti secondarie concordanti che la citano.",
      },
    ],
  },
  {
    id: "ravvedimento",
    titolo: "Ravvedimento operoso (versamenti tardivi)",
    nota: "Per versare in ritardo un'imposta sostitutiva o un bollo virtuale senza aspettare un accertamento — sanzione ridotta invece che piena.",
    voci: [
      {
        id: "interesse-legale-2026",
        titolo: "Tasso di interesse legale 2026: 1,60%",
        corpo:
          "Dal 1° gennaio 2026 il tasso di interesse legale è 1,60% annuo (era 2% nel 2025), fissato con Decreto MEF del 10/12/2025 (Gazzetta Ufficiale n. 289 del 13/12/2025), ai sensi dell'art. 1284 c.c. Se un ritardo copre il cambio d'anno, il calcolo degli interessi va spezzato per periodo con il tasso vigente in ciascuno.",
        fonti: [
          { titolo: "Decreto MEF 10/12/2025 (Gazzetta Ufficiale)", url: "https://www.gazzettaufficiale.it/eli/id/2025/12/13/25A06705/sg" },
        ],
        verificatoIl: "28/08/2026",
      },
      {
        id: "fasce-ravvedimento",
        titolo: "Fasce di sanzione ridotta",
        corpo:
          "Dal 1° settembre 2024 la sanzione base per omesso/tardivo versamento (art. 13 D.Lgs. 471/1997, come modificato dal D.Lgs. 87/2024) è il 25% dell'importo non versato (era 30%), dimezzata al 12,5% per ritardi entro 90 giorni. Il ravvedimento operoso (art. 13 D.Lgs. 472/1997) riduce ulteriormente questa sanzione in base a quanto tempo passa prima di regolarizzare.",
        tabella: {
          intestazioni: ["Fascia", "Entro", "Sanzione effettiva"],
          righe: [
            ["Sprint", "14 giorni dalla scadenza", "0,0833% per ogni giorno di ritardo"],
            ["Breve", "15°-30° giorno", "1,25%"],
            ["Intermedio", "31°-90° giorno", "1,3889%"],
            ["Lungo", "91° giorno fino al termine di presentazione della dichiarazione dell'anno (≈1 anno)", "3,125%"],
            ["Ultrannuale", "oltre, entro il termine di dichiarazione dell'anno successivo (≈2 anni)", "3,5714%"],
          ],
        },
        fonti: [
          { titolo: "LeggeInChiaro — Ravvedimento operoso 2026 per imprese e professionisti", url: "https://leggeinchiaro.it/ravvedimento-operoso-2026-imprese-sanzioni-ridotte-versamenti-interessi/" },
          { titolo: "Sibill — Sanzioni ravvedimento operoso 2026: tabella, percentuali e calcolo", url: "https://sibill.com/gestione-di-tesoreria/sanzioni-ravvedimento-operoso-2026-tabella-percentuali-e-calcolo/" },
        ],
        verificatoIl: "28/08/2026",
      },
      {
        id: "formula-ravvedimento",
        titolo: "Formula di calcolo",
        corpo:
          "Totale da versare = tributo dovuto + sanzione ridotta della fascia applicabile + interessi legali. Gli interessi si calcolano giorno per giorno: tributo dovuto × tasso legale annuo (1,60% nel 2026) × giorni di ritardo / 365, dal giorno successivo alla scadenza originaria fino al giorno di versamento incluso.",
        fonti: [
          { titolo: "LeggeInChiaro — Ravvedimento operoso 2026", url: "https://leggeinchiaro.it/ravvedimento-operoso-2026-imprese-sanzioni-ridotte-versamenti-interessi/" },
        ],
        verificatoIl: "28/08/2026",
      },
      {
        id: "codici-tributo-ravvedimento",
        titolo: "Codici tributo da usare in F24",
        corpo:
          "Per l'imposta sostitutiva forfettaria (codici principali 1790/1791/1792): dal 27/2/2023 (Risoluzione Agenzia delle Entrate 12/E/2023) il ravvedimento usa i codici 8944 per le sanzioni e 1944 per gli interessi, in righe separate dello stesso F24 — hanno sostituito i precedenti 8913 e 1992, ormai superati. Per il bollo virtuale (codici principali 2521-2524): 2525 per le sanzioni e 2526 per gli interessi.\n\nI contributi INPS Gestione Separata (codice P10) non seguono questo meccanismo: vedi la voce sulle sanzioni civili INPS più sopra.",
        fonti: [
          { titolo: "InformazioneFiscale — Dichiarazione dei redditi: versamenti, ravvedimento, codici tributo", url: "https://www.informazionefiscale.it/dichiarazione-dei-redditi-versamenti-ravvedimento-codici-tributo" },
          { titolo: "Ambrosie & Partners — Ravvedimento operoso: nuovi codici tributo (Risoluzione 12/E/2023)", url: "https://ambrosiepartners.it/website/2023/03/03/ravvedimento-operoso-nuovi-codici-tributo-per-sanzioni-e-interessi/" },
        ],
        verificatoIl: "28/08/2026",
        notaVerifica: "Una fonte minoritaria (partitaiva.it) riporta ancora i vecchi codici 8913/1992: risulta superata rispetto alla Risoluzione 12/E/2023 citata da due fonti concordanti. Il codice 2525/2526 per il bollo proviene da una sola fonte reperita: verificalo sulla Guida AE al bollo sulle fatture elettroniche prima di usarlo.",
      },
      {
        id: "fai-da-te-ravvedimento",
        titolo: "Puoi farlo da solo",
        corpo:
          "Il ravvedimento operoso fiscale (calcolo della fascia, importo, F24) non richiede un intermediario: si può fare autonomamente calcolando i giorni di ritardo e trasmettendo l'F24 tramite home banking o i propri canali telematici personali (Fisconline). Conviene farsi aiutare solo in casi complessi: ritardo che attraversa più fasce o più anni d'imposta, cumulo di più violazioni, o — per i contributi INPS — ricostruzione delle sanzioni civili che incrocia le dichiarazioni contributive.",
        fonti: [
          { titolo: "Fiscomania — Ravvedimento operoso", url: "https://www.fiscomania.com/ravvedimento-operoso/" },
        ],
        verificatoIl: "28/08/2026",
      },
    ],
  },
  {
    id: "dichiarazione-residenza",
    titolo: "Dichiarazione dei redditi e residenza fiscale",
    voci: [
      {
        id: "scadenza-modello-redditi",
        titolo: "Scadenza Modello Redditi PF 2026: 2 novembre 2026",
        corpo:
          "Il Modello Redditi Persone Fisiche 2026 (redditi 2025) si presenta telematicamente dal 15 aprile 2026. Il termine ordinario è il 31 ottobre, che nel 2026 cade di sabato e slitta quindi al primo giorno lavorativo utile: 2 novembre 2026. È il modello che usi tu — diverso dal 730, riservato a lavoratori dipendenti/pensionati senza altri redditi da dichiarare con quadri più complessi, con termine 30 settembre.",
        fonti: [
          { titolo: "Fiscoetasse — Dichiarazione redditi persone fisiche: rateazione e date", url: "https://www.fiscoetasse.com/approfondimenti/14187-dichiarazione-redditi-persone-fisiche-rateazione-delle-imposte-e-date-da-ricordare.html" },
        ],
        verificatoIl: "28/08/2026",
      },
      {
        id: "residenza-fiscale-criteri",
        titolo: "Chi è residente fiscale in Italia: art. 2 TUIR (testo dal 2024)",
        corpo:
          "Dal 1° gennaio 2024 (D.Lgs. 209/2023) sei considerato fiscalmente residente in Italia se, per la maggior parte del periodo d'imposta (183 giorni nel 2026, non bisestile; anche non continuativi, contando le frazioni di giorno), soddisfi almeno uno di questi criteri: residenza civilistica in Italia (art. 43 c.c.); domicilio, ora definito come il luogo dove si sviluppano principalmente le tue relazioni personali e familiari (non più un criterio economico-patrimoniale); presenza fisica in Italia, criterio autonomo introdotto dal 2024; iscrizione anagrafica (APR), ora presunzione relativa, superabile con prova contraria. Chiarimenti operativi nella Circolare Agenzia delle Entrate n. 20/E del 4/11/2024.",
        fonti: [
          { titolo: "Brocardi — Art. 2 TUIR, testo aggiornato", url: "https://www.brocardi.it/testo-unico-imposte-redditi/titolo-i/capo-i/art2.html" },
          { titolo: "Andersen — I chiarimenti dell'Agenzia delle Entrate su residenza (Circolare 20/E/2024)", url: "https://it.andersen.com/i-chiarimenti-dellagenzia-delle-entrate-circa-le-novita-legislative-in-tema-di-residenza-delle-persone-fisiche-e-giuridiche/" },
        ],
        verificatoIl: "28/08/2026",
      },
      {
        id: "split-year",
        titolo: "Cambio di residenza a metà anno: l'Italia non frantuma l'anno d'imposta",
        corpo:
          "L'Italia non ha una clausola generale di split year nella norma interna: la residenza si valuta sull'intero anno solare. Se soddisfi i requisiti per la maggior parte del 2026 (es. trasferimento a giugno con permanenza stabile fino a fine anno, oltre 183 giorni), rischi di essere considerato residente fiscale italiano per l'intero 2026, non solo da giugno.\n\nUno split year infrannuale esiste solo per via convenzionale, e solo in due trattati italiani: con la Svizzera (art. 4 par. 4) e con la Germania (protocollo aggiuntivo). Le fonti consultate non riportano una clausola equivalente nella Convenzione Italia-Francia. In assenza di una clausola esplicita, un'eventuale doppia residenza (Italia per l'intero anno secondo il TUIR, Francia secondo la norma francese) si risolverebbe con i criteri di risoluzione dell'art. 4 della Convenzione — vedi voce successiva — anche se nella prassi le due amministrazioni possono riconoscere una ripartizione temporale di fatto.",
        fonti: [
          { titolo: "Fiscomania — Frazionamento del periodo di imposta", url: "https://fiscomania.com/frazionamento-periodo-di-imposta/" },
          { titolo: "GDC Tax — Residenza fiscale, split year concesso se previsto dagli accordi tra i Paesi", url: "https://www.gdctax.it/it/pubblicazioni/quotidiani/residenza-fiscale-split-year-concesso-se-previsto-dagli-accordi-tra-i-paesi" },
        ],
        verificatoIl: "28/08/2026",
        areaGrigia: true,
        notaVerifica: "Punto tecnicamente complesso senza risposta meccanica univoca nelle fonti consultate: l'interazione tra assenza di split year interno, assenza di clausola convenzionale esplicita Italia-Francia, e i criteri di risoluzione del par. 4 va verificata con un professionista di fiscalità internazionale sulla base delle date esatte e dei legami effettivi (abitazione, famiglia, redditi) nei due Paesi nel 2026.",
      },
      {
        id: "convenzione-italia-francia",
        titolo: "Convenzione Italia-Francia (1989): come si risolve una doppia residenza",
        corpo:
          "La Convenzione contro le doppie imposizioni Italia-Francia, firmata a Venezia il 5/10/1989 e ratificata con L. 7/1/1992 n. 20, all'art. 4 stabilisce criteri gerarchici da applicare in ordine, finché uno non risolve il caso: abitazione permanente (residente dove disponi di un'abitazione permanente); se in entrambi i Paesi, centro degli interessi vitali (dove sono più strette le relazioni personali ed economiche); se non determinabile, soggiorno abituale; se soggiorni abitualmente in entrambi o in nessuno, nazionalità; infine, procedura amichevole tra le due amministrazioni fiscali.",
        fonti: [
          { titolo: "Legge 7 gennaio 1992, n. 20 (ratifica Convenzione Italia-Francia)", url: "https://it.vlex.com/vid/ratifica-ed-esecuzione-della-852548125" },
        ],
        verificatoIl: "28/08/2026",
        notaVerifica: "Verifica raccomandata anche sul testo pubblicato dal MEF/Dipartimento delle Finanze prima di usarlo per decisioni concrete.",
      },
      {
        id: "redditi-francesi-credito-imposta",
        titolo: "Redditi francesi pre-trasferimento: possibile obbligo dichiarativo e credito d'imposta",
        corpo:
          "Se risulti fiscalmente residente in Italia per il 2026 (vedi le due voci sopra), sei in principio tassato in Italia sul reddito worldwide, compreso quanto prodotto in Francia prima del trasferimento (art. 3 TUIR). Le imposte già pagate in Francia a titolo definitivo su quei redditi sono in principio recuperabili come credito d'imposta (art. 165 TUIR), nel limite della quota di imposta italiana proporzionale al reddito estero — il credito non spetta se la dichiarazione italiana omette di indicare quei redditi (comma 8); eccedenze riportabili fino a 8 esercizi.",
        fonti: [
          { titolo: "Brocardi — Art. 165 TUIR", url: "https://www.brocardi.it/testo-unico-imposte-redditi/titolo-iii/capo-ii/art165.html" },
        ],
        verificatoIl: "28/08/2026",
        areaGrigia: true,
        notaVerifica: "Le fonti consultate non trattano in modo esplicito e univoco il caso \"residenza acquisita in corso d'anno + regime forfettario + redditi esteri pre-trasferimento già tassati in Francia\": non è stata trovata una posizione ufficiale dell'Agenzia delle Entrate specifica per questa combinazione. Da verificare con un commercialista sulla base delle date esatte e degli importi reali.",
      },
    ],
  },
  {
    id: "lavoro-dipendente",
    titolo: "Lavoro dipendente insieme al forfettario",
    nota: "Rilevante da settembre 2026, con l'inizio del rapporto di lavoro a Chieri.",
    voci: [
      {
        id: "compatibilita-generale",
        titolo: "Compatibilità generale: sì, senza obbligo di comunicarlo al datore",
        corpo:
          "Avere insieme un contratto di lavoro dipendente privato e una partita IVA in regime forfettario è pienamente consentito: non esiste un divieto fiscale né un obbligo legale generale di comunicare l'apertura della P.IVA al datore di lavoro privato. Il vincolo di legge è l'art. 2105 c.c. (obbligo di fedeltà): non puoi trattare affari, per conto tuo o di terzi, in concorrenza diretta con il tuo datore di lavoro, né divulgarne informazioni riservate — vincolo automatico, non serve una clausola contrattuale, e riguarda la concorrenza diretta, non qualsiasi attività autonoma. Eventuali clausole di esclusiva o patti di non concorrenza dipendono dal contratto individuale/CCNL specifico. (Per i dipendenti pubblici vige invece un obbligo di esclusività diverso, D.Lgs. 165/2001 — non il tuo caso.)",
        fonti: [
          { titolo: "Fiscomania — Lavoro dipendente e partita IVA", url: "https://fiscomania.com/lavoro-dipendente-partita-iva/" },
          { titolo: "Art. 2105 c.c. su Brocardi", url: "https://www.brocardi.it/codice-civile/libro-quinto/titolo-ii/capo-i/sezione-iii/art2105.html" },
        ],
        verificatoIl: "28/08/2026",
      },
      {
        id: "soglia-esclusione-35000",
        titolo: "Soglia di esclusione dal forfettario: 35.000 € (confermata anche per il 2026)",
        corpo:
          "Se nell'anno precedente hai percepito, oltre ai compensi da libero professionista, redditi da lavoro dipendente o assimilati per più di 35.000 €, non puoi restare nel forfettario l'anno successivo (art. 1 comma 57 lett. d-ter L. 190/2014). La soglia era 30.000 € all'origine (L. 208/2015), è stata portata a 35.000 € dalla Legge di Bilancio 2025 (L. 207/2024) inizialmente solo per il 2025, e la Legge di Bilancio 2026 (L. 199/2025 art. 1 comma 27) l'ha confermata a 35.000 € anche per il 2026.\n\nQuesta causa di esclusione guarda all'anno precedente, non a quello in corso: iniziare un rapporto a settembre 2026 non ti fa uscire dal regime nel 2026. Il reddito da lavoro dipendente percepito nel 2026 (parziale, da settembre a dicembre) sarà invece da verificare per restare in regime nel 2027.",
        fonti: [
          { titolo: "Fiscomania — Forfettario e lavoro dipendente", url: "https://fiscomania.com/forfettario-e-lavoro-dipendente/" },
          { titolo: "Il Sole 24 Ore — Forfettari, soglia 35mila euro anche nel 2026", url: "https://ntplusfisco.ilsole24ore.com/art/forfettari-soglia-35mila-euro-anche-il-2026-AHA8EHID" },
        ],
        verificatoIl: "28/08/2026",
      },
      {
        id: "scaglioni-irpef-2026",
        titolo: "Scaglioni IRPEF 2026 sul reddito da lavoro dipendente",
        corpo:
          "Il reddito forfettario NON entra in questi scaglioni: resta tassato a parte con l'imposta sostitutiva (vedi voce successiva). Questi scaglioni si applicano solo al reddito complessivo IRPEF — nel tuo caso, da settembre 2026, il reddito da lavoro dipendente. Struttura a 3 scaglioni dal D.Lgs. 216/2023; la Legge di Bilancio 2026 (L. 199/2025 art. 1 comma 3) ha ridotto la seconda aliquota dal 35% al 33%, modificando l'art. 11 comma 1 lett. b) TUIR, dal 1° gennaio 2026.",
        tabella: {
          intestazioni: ["Reddito complessivo", "Aliquota"],
          righe: [
            ["Fino a 28.000 €", "23%"],
            ["Da 28.001 € a 50.000 €", "33%"],
            ["Oltre 50.000 €", "43%"],
          ],
        },
        fonti: [
          { titolo: "Fiscomania — Aliquote IRPEF", url: "https://fiscomania.com/aliquote-irpef/" },
          { titolo: "Soluzione Tasse — Scaglioni IRPEF", url: "https://www.soluzionetasse.com/scaglioni-irpef/" },
        ],
        verificatoIl: "28/08/2026",
        notaVerifica: "La pagina agenziaentrate.gov.it dedicata risultava ancora ferma alla vecchia tabella a 5 scaglioni (2020) al momento della verifica: qui si cita direttamente la norma (L. 199/2025 art. 1 comma 3), non quella pagina.",
      },
      {
        id: "detrazioni-lavoro-dipendente",
        titolo: "Detrazioni da lavoro dipendente (art. 13 TUIR)",
        corpo:
          "Si applicano sul reddito complessivo IRPEF (che include il lavoro dipendente, non il forfettario). Il risultato va ragguagliato ai giorni lavorati nell'anno su base 365 — per il tuo caso, da settembre a dicembre 2026, la detrazione non sarà quella intera. Il bonus aggiuntivo di 65 € non è ragguagliato.",
        tabella: {
          intestazioni: ["Reddito complessivo", "Detrazione annua"],
          righe: [
            ["Fino a 15.000 €", "1.955 € (minimo 690 € tempo indeterminato / 1.380 € tempo determinato)"],
            ["Da 15.001 € a 28.000 €", "1.910 + 1.190 × (28.000 − reddito) / 13.000, +65 € se reddito tra 25.001-28.000 €"],
            ["Da 28.001 € a 50.000 €", "1.910 × (50.000 − reddito) / 22.000, +65 € se reddito tra 28.001-35.000 €"],
            ["Oltre 50.000 €", "nessuna detrazione"],
          ],
        },
        fonti: [
          { titolo: "Fiscomania — Detrazioni per redditi da lavoro dipendente", url: "https://fiscomania.com/detrazioni-per-redditi-da-lavoro-dipendente/" },
        ],
        verificatoIl: "28/08/2026",
        notaVerifica: "Non reperita su una pagina agenziaentrate.gov.it raggiungibile in questa ricerca: verifica incrociata raccomandata con la Circolare Agenzia Entrate sulle detrazioni 2026 prima di un uso vincolante.",
      },
      {
        id: "separazione-basi-imponibili",
        titolo: "Due basi imponibili separate — ma il reddito forfettario \"conta\" comunque altrove",
        corpo:
          "Il reddito forfettario, tassato con imposta sostitutiva (art. 1 comma 64 L. 190/2014), non concorre a formare il reddito complessivo IRPEF: resta fuori dagli scaglioni 23/33/43%. Il reddito da lavoro dipendente segue invece la tassazione ordinaria in busta paga.\n\nQuesto non significa che il reddito forfettario sia irrilevante ovunque: ai fini del riconoscimento delle detrazioni per carichi di famiglia (chi dei due genitori può fruire della detrazione per i figli), l'art. 1 comma 75 L. 190/2014 stabilisce che si considera anche il reddito determinato secondo il comma 64 — conferma nella Risoluzione Agenzia delle Entrate n. 69/E del 22/7/2019. Il reddito forfettario, in generale, rileva anche ai fini ISEE come componente del reddito familiare (principio generale della normativa ISEE, DPCM 159/2013), indipendentemente dal regime fiscale di tassazione.",
        fonti: [
          { titolo: "Studio Cerbone — Redditi da forfettario e detrazione figli a carico (Risoluzione 69/E/2019)", url: "https://www.studiocerbone.com/redditi-prodotti-in-regime-forfetario-e-ripartizione-della-detrazione-per-figli-a-carico-risoluzione-n-69-e-del-2019/" },
        ],
        verificatoIl: "28/08/2026",
        notaVerifica: "Il punto sulla rilevanza ai fini ISEE è un principio generale della disciplina ISEE, non confermato in questa ricerca da una fonte INPS/normativa ISEE specifica dedicata al forfettario: verificalo su inps.it se ti serve un dato vincolante (es. per una domanda ISEE concreta).",
      },
    ],
  },
];
