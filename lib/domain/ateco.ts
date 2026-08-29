import type { CoefficienteAteco, RisultatoCoefficienteAteco } from "./types";

/**
 * Riduce un codice ATECO (es. "62.09.09") alla sola sequenza di cifre
 * ("620909"), per confrontarlo per prefisso con `fiscale_coefficienti_ateco`
 * (memorizzata senza punti). I codici ATECO sono gerarchici — un prefisso più
 * lungo è sempre più specifico — quindi il confronto per prefisso su stringa
 * di sole cifre riproduce esattamente la struttura divisione/gruppo/classe
 * della classificazione, senza dover interpretare i punti come separatori.
 */
export function normalizzaCodiceAteco(codice: string): string {
  return codice.replace(/[^0-9]/g, "");
}

/**
 * Trova il coefficiente di redditività applicabile a un codice ATECO,
 * cercando nella tabella di riferimento (`fiscale_coefficienti_ateco`) il
 * prefisso più specifico (più lungo) che corrisponde. Se nessun prefisso
 * specifico corrisponde, ricade sulla voce di default (gruppo 9, "altre
 * attività economiche", prefissoAteco === ""), che nella tabella ufficiale
 * è la categoria residuale per qualunque attività non altrimenti elencata.
 *
 * Restituisce null solo se il codice è vuoto/non numerico o se la tabella
 * non contiene nemmeno la voce di default (tabella non ancora popolata).
 */
export function trovaCoefficienteAteco(
  codiceAteco: string,
  tabella: CoefficienteAteco[]
): RisultatoCoefficienteAteco | null {
  const cifre = normalizzaCodiceAteco(codiceAteco);
  if (!cifre) return null;

  let migliore: CoefficienteAteco | null = null;
  let predefinito: CoefficienteAteco | null = null;

  for (const riga of tabella) {
    if (riga.prefissoAteco === "") {
      predefinito = riga;
      continue;
    }
    if (cifre.startsWith(riga.prefissoAteco) && (!migliore || riga.prefissoAteco.length > migliore.prefissoAteco.length)) {
      migliore = riga;
    }
  }

  const scelta = migliore ?? predefinito;
  if (!scelta) return null;

  return {
    coefficiente: scelta.coefficiente,
    gruppo: scelta.gruppo,
    settore: scelta.settore,
    predefinito: scelta === predefinito,
  };
}
