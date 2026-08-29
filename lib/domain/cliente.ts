import type { Cliente } from "./types";

/**
 * Regole sul cliente condivise fra interfaccia, esportazioni e generatore XML.
 *
 * Vivono qui perché erano replicate: la composizione del nome visualizzato in
 * otto file, il controllo di completezza in due. Alla terza occorrenza della
 * stessa logica si estrae — e in questo caso la duplicazione era anche
 * pericolosa, non solo verbosa: se la definizione di "cliente pronto per
 * l'XML" fosse cambiata in un solo punto, l'interfaccia avrebbe promesso di
 * poter generare un file che il generatore avrebbe poi rifiutato.
 */

/** Nome da mostrare: denominazione per le persone giuridiche, nome e cognome per le fisiche. */
export function nomeCliente(cliente: Pick<Cliente, "denominazione" | "nome" | "cognome">): string {
  if (cliente.denominazione?.trim()) return cliente.denominazione.trim();
  const persona = [cliente.nome, cliente.cognome].filter(Boolean).join(" ").trim();
  return persona || "Senza nome";
}

/** Identificativo fiscale da mostrare in elenco, con l'etichetta che ne dice il tipo. */
export function identificativoFiscale(cliente: Pick<Cliente, "partitaIva" | "codiceFiscale">): string | null {
  if (cliente.partitaIva?.trim()) return `P.IVA ${cliente.partitaIva.trim()}`;
  if (cliente.codiceFiscale?.trim()) return `C.F. ${cliente.codiceFiscale.trim()}`;
  return null;
}

/** Codice destinatario valido per il formato FPR12: sette caratteri alfanumerici maiuscoli. */
export function codiceDestinatarioValido(codice: string): boolean {
  return /^[A-Z0-9]{7}$/.test(codice.toUpperCase());
}

/**
 * Se il cliente ha tutto ciò che l'XML FatturaPA richiede. Deve restare
 * allineata ai controlli di `validaFatturaPerXml`: è la stessa domanda posta
 * prima, in anagrafica, invece che al momento di scaricare il file.
 */
export function clientePronto(cliente: Cliente): boolean {
  const haIdentificativo = Boolean(cliente.partitaIva?.trim() || cliente.codiceFiscale?.trim());
  const haSede = Boolean(cliente.indirizzo?.trim() && cliente.cap?.trim() && cliente.comune?.trim());
  const haNome = Boolean(cliente.denominazione?.trim() || cliente.cognome?.trim());
  return haIdentificativo && haSede && haNome && codiceDestinatarioValido(cliente.codiceDestinatario);
}

/** Elenco dei dati che mancano, per dirlo all'utente invece di limitarsi a bloccarlo. */
export function datiMancanti(cliente: Cliente): string[] {
  const mancanti: string[] = [];
  if (!cliente.partitaIva?.trim() && !cliente.codiceFiscale?.trim()) mancanti.push("partita IVA o codice fiscale");
  if (!cliente.denominazione?.trim() && !cliente.cognome?.trim()) mancanti.push("denominazione o cognome");
  if (!cliente.indirizzo?.trim()) mancanti.push("indirizzo");
  if (!cliente.cap?.trim()) mancanti.push("CAP");
  if (!cliente.comune?.trim()) mancanti.push("comune");
  if (!codiceDestinatarioValido(cliente.codiceDestinatario)) mancanti.push("codice destinatario a 7 caratteri");
  return mancanti;
}
