# Design system

Sistema minimo ma vincolante: palette, tipografia, spaziature e componenti sono
definiti una volta in `app/globals.css` e usati ovunque tramite token. Nessuna
schermata introduce colori o misure proprie — uno scostamento è un difetto da
correggere, non una licenza creativa.

## Palette

I colori vivono come variabili CSS in `:root` ed entrano in Tailwind attraverso
il blocco `@theme inline`, così `bg-surface` e `var(--surface)` non possono
divergere.

| Token | Valore | Ruolo |
|---|---|---|
| `--bg` | `#0a0c10` | Fondo dell'applicazione |
| `--surface` | `#12151c` | Schede, tabelle, barra laterale |
| `--surface-2` | `#181c25` | Campi, intestazioni, superfici annidate |
| `--ink` | `#e8eaee` | Testo primario |
| `--ink-muted` | `#8b94a3` | Testo secondario, etichette |
| `--ink-faint` | `#7b8492` | Date, note, riferimenti normativi |
| `--accent` | `#3d7dff` | Azione primaria, collegamenti, stato attivo |
| `--ok` | `#3ecf8e` | Esito positivo, importi incassati |
| `--warn` | `#e0a536` | Da verificare, in scadenza, soglia superata |
| `--danger` | `#ef5a5a` | Errore, scaduto, azione distruttiva |

Il fondo è scuro perché l'applicazione si usa per sessioni brevi e ripetute
durante la giornata lavorativa, spesso da telefono: un fondo chiaro a piena
luminosità su schermo piccolo affatica per nulla. I colori di stato (`ok`,
`warn`, `danger`) sono separati dall'accento e non vengono mai usati come
decorazione: se un elemento è giallo significa che richiede attenzione.

### Contrasto

Ogni combinazione testo/sfondo rispetta il rapporto minimo di **4,5:1** previsto
da WCAG 2.1 livello AA per il testo normale. Non è una verifica manuale:
`npm run contrasto` controlla le 21 combinazioni leggendo i colori direttamente
da `globals.css`, e gira in CI come passo bloccante.

`--ink-faint` è stato schiarito da `#5b6472` a `#7b8492` proprio per questo: al
valore precedente era a 2,85:1 su `--surface-2`, e porta testo piccolo (date,
riferimenti di legge) dove il contrasto conta di più.

## Tipografia

Un solo carattere, **Inter**, caricato via `next/font` con `font-display: swap`
e sottoinsieme latino. Una seconda famiglia non aggiungerebbe informazione: qui
la gerarchia la fanno peso e dimensione, non il contrasto tra caratteri.

| Uso | Dimensione | Peso |
|---|---|---|
| Titolo di pagina | `text-xl` (20px) | 600 |
| Titolo di sezione | `text-lg` (18px) | 600 |
| Etichetta di sezione | `text-sm` maiuscoletto spaziato | 500 |
| Corpo | `text-sm` (14px) | 400 |
| Campi su mobile | 16px | 400 |
| Note e metadati | `text-xs` (12px) | 400 |

I campi di input scendono a 14px solo da 640px in su: sotto i 16px iOS Safari
ingrandisce da sé la pagina quando il campo prende il fuoco, spostando il layout
mentre si scrive.

Gli importi usano `font-variant-numeric: tabular-nums`, impostato su `body`:
in una colonna di euro le cifre devono incolonnarsi.

## Spaziature

Scala di Tailwind, ristretta ai valori effettivamente in uso: `gap-2` (8px) tra
elementi affini, `gap-4` (16px) dentro una scheda, `gap-6` (24px) tra blocchi,
`gap-8`/`gap-10` (32/40px) tra sezioni di una pagina. Gli spazi tra fratelli si
fanno con `gap` su flex o grid, mai con margini per elemento: i margini
collassano e raddoppiano in modo difficile da prevedere.

Raggi: `rounded-lg` (8px) per controlli e campi, `rounded-xl` (12px) per schede
e contenitori, `rounded-full` per le pastiglie di stato.

## Componenti

| Componente | File | Nota |
|---|---|---|
| `campo-input` | `globals.css` | Altezza minima 44px su mobile |
| `btn-primario` / `btn-secondario` | `globals.css` | 44px su mobile: sotto, il bersaglio è difficile da centrare col pollice |
| `InfoCampo` | `components/InfoCampo.tsx` | Etichetta con pulsante "ⓘ": cos'è il dato, dove si trova, riferimento normativo |
| `StatoBadge` | `components/StatoBadge.tsx` | Stato di un documento, colore dal token semantico |
| `AndamentoFatturato` | `components/AndamentoFatturato.tsx` | SVG inline, nessuna libreria di charting |
| `PrevisioneAnno` | `components/PrevisioneAnno.tsx` | Numero grande + barra composita in HTML: incassato, emesso, atteso |
| `MenuCompleto` / `BarraInferiore` | `components/NavPrincipale.tsx` | Navigazione raggruppata con stato attivo; barra inferiore su mobile |
| `Sollecito` | `components/Sollecito.tsx` | Testo modificabile e copiabile; non invia nulla |

`InfoCampo`, il menu mobile e il pannello del sollecito usano
`<details>`/`<summary>` nativi invece di stato React: funzionano da tastiera e
con screen reader senza ARIA aggiuntiva, e non richiedono `"use client"`. I due
componenti di navigazione sono invece client per una ragione sola — sapere in
quale sezione ci si trova — e i solleciti perché l'accesso agli appunti richiede
il browser.

## Navigazione

Il menu è raggruppato: **Lavoro**, **Fisco**, **Impostazioni**, con la dashboard
fuori da ogni gruppo. Quattordici voci in un elenco piatto si leggono una per
una ogni volta; quattro gruppi si scorrono. La voce della pagina corrente porta
`aria-current="page"` e lo sfondo dell'accento, e resta evidenziata anche sulle
pagine figlie: da `/fatture/nuova` deve essere ancora chiaro di essere dentro
Fatture.

Su mobile le quattro destinazioni quotidiane — Home, Fatture, Spese, Scadenze —
stanno in una barra fissa in basso, dove il pollice arriva senza cambiare presa;
tutto il resto sta dietro «Altro» in alto, che costa un tocco in più ed è la
scelta giusta per ciò che si apre una volta al mese. Quattro e non otto: ogni
voce in più rimpicciolisce i bersagli sotto i 44px. La mappa è definita una sola
volta in `lib/ui/navigazione.ts`, e un test verifica che ogni voce della barra
inferiore esista anche nel menu completo.

## Adattamento a schermo piccolo

Il punto di rottura è 768px (`md`). Sotto, le tabelle diventano schede: una
tabella a sei colonne su 375px è illeggibile, e lo scorrimento orizzontale
nasconde le colonne invece di risolvere. Sopra, la tabella torna perché il
confronto tra righe è più veloce.

Il contenuto largo che resta tabellare scorre dentro il proprio contenitore
`overflow-x-auto`: il corpo della pagina non scorre mai in orizzontale.

## Accessibilità

Requisito, non rifinitura. Riferimento: WCAG 2.1 livello AA, coerente con lo
European Accessibility Act.

- contrasto verificato in CI (sopra);
- fuoco da tastiera sempre visibile (`:focus-visible`, anello sull'accento);
- collegamento "Salta al contenuto" come primo elemento focalizzabile;
- landmark corretti (`nav` etichettati, `main` con `id`), un solo `h1` per pagina;
- zoom non bloccato (`maximumScale: 5`): impedirlo è una barriera;
- `prefers-reduced-motion` rispettato, transizioni azzerate;
- bersagli di tocco da 44px su mobile.
