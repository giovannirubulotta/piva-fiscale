/**
 * Scrittore ZIP minimo, metodo "store" (nessuna compressione).
 *
 * Perché non una libreria: serve mettere qualche decina di file di testo dentro
 * un contenitore che il commercialista possa aprire con doppio clic. Il formato
 * ZIP per file *non compressi* è tre strutture note e un CRC-32 — circa novanta
 * righe — e lo standard di progetto vieta di introdurre una dipendenza per
 * problemi risolvibili con poche righe dirette. Una dipendenza qui porterebbe
 * albero transitivo, aggiornamenti e superficie da mantenere per una funzione
 * che non cambierà mai, perché il formato è fermo dal 1993.
 *
 * Il costo della scelta è dichiarato: senza compressione l'archivio pesa quanto
 * la somma dei file. Su XML e CSV di poche decine di KB è irrilevante; se un
 * giorno ci finissero dentro le scansioni, la compressione non aiuterebbe
 * comunque (PDF e JPEG sono già compressi).
 *
 * Riferimento: PKWARE APPNOTE.TXT, sezioni 4.3.7 (local file header),
 * 4.3.12 (central directory) e 4.3.16 (end of central directory).
 */

export interface VoceZip {
  /** Percorso dentro l'archivio. Le sottocartelle si esprimono con "/" . */
  nome: string;
  contenuto: Uint8Array;
}

const TABELLA_CRC = costruisciTabellaCrc();

function costruisciTabellaCrc(): Uint32Array {
  const tabella = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let valore = i;
    for (let bit = 0; bit < 8; bit++) {
      valore = valore & 1 ? 0xedb88320 ^ (valore >>> 1) : valore >>> 1;
    }
    tabella[i] = valore >>> 0;
  }
  return tabella;
}

export function crc32(dati: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < dati.length; i++) {
    crc = TABELLA_CRC[(crc ^ dati[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Data e ora in formato MS-DOS (APPNOTE 4.4.6): due campi da 16 bit, con i
 * secondi memorizzati a passi di due. Il formato non arriva sotto quella
 * granularità: non è un'approssimazione nostra.
 */
function dataOraDos(data: Date): { ora: number; giorno: number } {
  const anno = Math.max(1980, data.getUTCFullYear());
  return {
    ora: (data.getUTCHours() << 11) | (data.getUTCMinutes() << 5) | (data.getUTCSeconds() >> 1),
    giorno: ((anno - 1980) << 9) | ((data.getUTCMonth() + 1) << 5) | data.getUTCDate(),
  };
}

export function creaZip(voci: VoceZip[], adesso: Date = new Date()): Uint8Array {
  const { ora, giorno } = dataOraDos(adesso);
  const codificatore = new TextEncoder();

  const locali: Uint8Array[] = [];
  const centrali: Uint8Array[] = [];
  let offset = 0;

  for (const voce of voci) {
    const nome = codificatore.encode(voce.nome);
    const crc = crc32(voce.contenuto);
    const dimensione = voce.contenuto.length;

    const intestazione = new DataView(new ArrayBuffer(30));
    intestazione.setUint32(0, 0x04034b50, true); // firma
    intestazione.setUint16(4, 20, true); // versione minima
    // Bit 11: i nomi sono UTF-8. Senza, un file con una lettera accentata si
    // apre con il nome storpiato su Windows.
    intestazione.setUint16(6, 0x0800, true);
    intestazione.setUint16(8, 0, true); // metodo: store
    intestazione.setUint16(10, ora, true);
    intestazione.setUint16(12, giorno, true);
    intestazione.setUint32(14, crc, true);
    intestazione.setUint32(18, dimensione, true);
    intestazione.setUint32(22, dimensione, true);
    intestazione.setUint16(26, nome.length, true);
    intestazione.setUint16(28, 0, true); // extra field

    locali.push(new Uint8Array(intestazione.buffer), nome, voce.contenuto);

    const centrale = new DataView(new ArrayBuffer(46));
    centrale.setUint32(0, 0x02014b50, true);
    centrale.setUint16(4, 20, true); // versione di chi ha scritto
    centrale.setUint16(6, 20, true); // versione minima
    centrale.setUint16(8, 0x0800, true);
    centrale.setUint16(10, 0, true);
    centrale.setUint16(12, ora, true);
    centrale.setUint16(14, giorno, true);
    centrale.setUint32(16, crc, true);
    centrale.setUint32(20, dimensione, true);
    centrale.setUint32(24, dimensione, true);
    centrale.setUint16(28, nome.length, true);
    centrale.setUint32(42, offset, true);

    centrali.push(new Uint8Array(centrale.buffer), nome);
    offset += 30 + nome.length + dimensione;
  }

  const dimensioneCentrale = centrali.reduce((somma, parte) => somma + parte.length, 0);

  const chiusura = new DataView(new ArrayBuffer(22));
  chiusura.setUint32(0, 0x06054b50, true);
  chiusura.setUint16(8, voci.length, true);
  chiusura.setUint16(10, voci.length, true);
  chiusura.setUint32(12, dimensioneCentrale, true);
  chiusura.setUint32(16, offset, true);

  return concatena([...locali, ...centrali, new Uint8Array(chiusura.buffer)]);
}

function concatena(parti: Uint8Array[]): Uint8Array {
  const totale = parti.reduce((somma, parte) => somma + parte.length, 0);
  const risultato = new Uint8Array(totale);
  let posizione = 0;
  for (const parte of parti) {
    risultato.set(parte, posizione);
    posizione += parte.length;
  }
  return risultato;
}

export function testoInBytes(testo: string): Uint8Array {
  return new TextEncoder().encode(testo);
}
