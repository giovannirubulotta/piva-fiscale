import type { Tables } from "@/lib/supabase/database.types";
import type {
  AliquoteAnno,
  Cliente,
  CoefficienteAteco,
  CreditoDisponibile,
  DatiEmittente,
  Fattura,
  LavoroDipendente,
  ProfiloFiscale,
  RequisitiForfettario,
  RigaFattura,
  StatoFattura,
  TipoDocumento,
  TipologiaCliente,
  TipologiaCredito,
} from "@/lib/domain/types";

export function mappaProfilo(row: Tables<"fiscale_profilo">): ProfiloFiscale {
  return {
    coefficienteRedditivita: Number(row.coefficiente_redditivita),
    dataApertura: row.data_apertura,
    agevolazione5Percento: row.agevolazione_5_percento,
  };
}

/**
 * Vista dello stesso profilo dal punto di vista del generatore XML: solo i dati
 * anagrafici del CedentePrestatore, senza i parametri di calcolo. Due mapper
 * sulla stessa riga, perché sono due contratti diversi verso due consumatori
 * diversi — non una duplicazione.
 */
export function mappaDatiEmittente(row: Tables<"fiscale_profilo">): DatiEmittente {
  return {
    partitaIva: row.partita_iva,
    codiceFiscale: row.codice_fiscale,
    nome: row.nome,
    cognome: row.cognome,
    indirizzo: row.indirizzo,
    numeroCivico: row.numero_civico,
    cap: row.cap,
    comune: row.comune,
    provincia: row.provincia,
    nazione: row.nazione,
    email: row.email,
    telefono: row.telefono,
    iban: row.iban,
    bolloRiaddebitato: row.bollo_riaddebitato,
  };
}

export function mappaCliente(row: Tables<"fiscale_clienti">): Cliente {
  return {
    id: row.id,
    tipologia: row.tipologia as TipologiaCliente,
    denominazione: row.denominazione,
    nome: row.nome,
    cognome: row.cognome,
    codiceFiscale: row.codice_fiscale,
    partitaIva: row.partita_iva,
    idPaese: row.id_paese,
    indirizzo: row.indirizzo,
    numeroCivico: row.numero_civico,
    cap: row.cap,
    comune: row.comune,
    provincia: row.provincia,
    nazione: row.nazione,
    codiceDestinatario: row.codice_destinatario,
    pecDestinatario: row.pec_destinatario,
    email: row.email,
    telefono: row.telefono,
    note: row.note,
  };
}

export function mappaRigaFattura(row: Tables<"fiscale_fattura_righe">): RigaFattura {
  return {
    id: row.id,
    numeroLinea: row.numero_linea,
    descrizione: row.descrizione,
    quantita: Number(row.quantita),
    unitaMisura: row.unita_misura,
    prezzoUnitario: Number(row.prezzo_unitario),
  };
}

export function mappaFattura(row: Tables<"fiscale_fatture">, righe: RigaFattura[]): Fattura {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    tipoDocumento: row.tipo_documento as TipoDocumento,
    fatturaRiferimentoId: row.fattura_riferimento_id,
    anno: row.anno,
    progressivo: row.progressivo,
    dataEmissione: row.data_emissione,
    dataIncasso: row.data_incasso,
    stato: row.stato as StatoFattura,
    bolloApplicato: row.bollo_applicato,
    bolloRiaddebitato: row.bollo_riaddebitato,
    condizioniPagamento: row.condizioni_pagamento,
    modalitaPagamento: row.modalita_pagamento,
    giorniScadenzaPagamento: row.giorni_scadenza_pagamento,
    causaleAggiuntiva: row.causale_aggiuntiva,
    note: row.note,
    xmlProgressivo: row.xml_progressivo,
    righe: [...righe].sort((a, b) => a.numeroLinea - b.numeroLinea),
  };
}

export function mappaAliquote(row: Tables<"fiscale_aliquote">): AliquoteAnno {
  return {
    anno: row.anno,
    aliquotaSostitutivaStandard: Number(row.aliquota_sostitutiva_standard),
    aliquotaSostitutivaAgevolata: Number(row.aliquota_sostitutiva_agevolata),
    aliquotaInps: Number(row.aliquota_inps_gestione_separata),
    massimaleInps: Number(row.massimale_inps),
    minimaleInps: Number(row.minimale_inps),
  };
}

export function mappaCoefficienteAteco(row: Tables<"fiscale_coefficienti_ateco">): CoefficienteAteco {
  return {
    gruppo: row.gruppo,
    settore: row.settore,
    prefissoAteco: row.prefisso_ateco,
    coefficiente: Number(row.coefficiente) / 100,
  };
}

export function mappaRequisitiForfettario(row: Tables<"fiscale_requisiti_forfettario">): RequisitiForfettario {
  return {
    anno: row.anno,
    redditoLavoroDipendenteOltreSoglia: row.reddito_lavoro_dipendente_oltre_soglia,
    partecipazioniSocietaRiconducibili: row.partecipazioni_societa_riconducibili,
    committentePrevalenteExDatore: row.committente_prevalente_ex_datore,
    residenzaFuoriUeSee: row.residenza_fuori_ue_see,
  };
}

export function mappaCreditoDisponibile(row: Tables<"fiscale_crediti_disponibili">): CreditoDisponibile {
  return {
    id: row.id,
    tipologia: row.tipologia as TipologiaCredito,
    annoMaturazione: row.anno_maturazione,
    importo: Number(row.importo),
    utilizzato: row.utilizzato,
    annoUtilizzo: row.anno_utilizzo,
    dataUtilizzo: row.data_utilizzo,
    note: row.note,
  };
}

export function mappaLavoroDipendente(row: Tables<"fiscale_lavoro_dipendente">): LavoroDipendente {
  return {
    id: row.id,
    anno: row.anno,
    datoreLavoro: row.datore_lavoro,
    redditoImponibile: Number(row.reddito_imponibile),
    ritenuteIrpef: Number(row.ritenute_irpef),
    addizionaleRegionale: Number(row.addizionale_regionale),
    addizionaleComunale: Number(row.addizionale_comunale),
    note: row.note,
  };
}

