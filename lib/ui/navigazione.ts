/**
 * La mappa dell'applicazione, definita una volta sola.
 *
 * Barra laterale, menu mobile e barra inferiore mostrano viste diverse dello
 * stesso elenco: tenerlo in tre posti significa che prima o poi una voce nuova
 * compare in due su tre. Anche il test end-to-end sul perimetro di
 * autenticazione elenca queste rotte, e va tenuto allineato.
 */

export interface VoceNav {
  href: string;
  etichetta: string;
}

export interface GruppoNav {
  /** null per il primo gruppo: la dashboard non ha bisogno di un'intestazione. */
  titolo: string | null;
  voci: VoceNav[];
}

export const GRUPPI_NAV: GruppoNav[] = [
  {
    titolo: null,
    voci: [{ href: "/", etichetta: "Dashboard" }],
  },
  {
    titolo: "Lavoro",
    voci: [
      { href: "/fatture", etichetta: "Fatture" },
      { href: "/clienti", etichetta: "Clienti" },
      { href: "/spese", etichetta: "Spese" },
      { href: "/documenti", etichetta: "Documenti" },
    ],
  },
  {
    titolo: "Fisco",
    voci: [
      { href: "/scadenze", etichetta: "Scadenze" },
      { href: "/f24", etichetta: "Genera F24" },
      { href: "/quadro-lm", etichetta: "Quadro LM" },
      { href: "/lavoro-dipendente", etichetta: "Lavoro dipendente" },
      { href: "/requisiti", etichetta: "Requisiti regime" },
      { href: "/riferimenti-normativi", etichetta: "Riferimenti normativi" },
    ],
  },
  {
    titolo: "Impostazioni",
    voci: [
      { href: "/impostazioni", etichetta: "Profilo e aliquote" },
      { href: "/diagnostica", etichetta: "Diagnostica" },
      { href: "/privacy", etichetta: "Privacy e dati" },
    ],
  },
];

/**
 * Le quattro destinazioni della barra inferiore su mobile.
 *
 * Quattro e non otto: la barra sta nella zona raggiungibile dal pollice, e ogni
 * voce in più rimpicciolisce i bersagli sotto i 44px. Sono le pagine che si
 * aprono più volte nella stessa giornata; il resto vive dietro "Altro", che
 * costa un tocco in più ed è la scelta giusta per ciò che si apre una volta al
 * mese.
 */
export const VOCI_BARRA_INFERIORE: VoceNav[] = [
  { href: "/", etichetta: "Home" },
  { href: "/fatture", etichetta: "Fatture" },
  { href: "/spese", etichetta: "Spese" },
  { href: "/scadenze", etichetta: "Scadenze" },
];

/**
 * Una voce è attiva anche sulle sue pagine figlie: da `/fatture/nuova` la voce
 * "Fatture" deve restare evidenziata, altrimenti durante la compilazione non si
 * sa più in quale sezione ci si trova. La radice fa eccezione, altrimenti
 * sarebbe attiva ovunque.
 */
export function voceAttiva(href: string, percorso: string): boolean {
  return href === "/" ? percorso === "/" : percorso === href || percorso.startsWith(`${href}/`);
}
