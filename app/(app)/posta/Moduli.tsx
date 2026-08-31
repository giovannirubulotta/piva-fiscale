"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { inviaMessaggio, provaCollegamento, salvaConfigurazione, type EsitoForm } from "./actions";

const statoIniziale: EsitoForm = { errore: null, successo: false };

/** I provider più comuni in Italia. Riempiono i campi invece di farli cercare. */
const PROVIDER: Record<string, { imap: string; smtp: string; nota?: string }> = {
  "Gmail / Google Workspace": {
    imap: "imap.gmail.com",
    smtp: "smtp.gmail.com",
    nota: "Richiede una password per le app: si genera dalla sicurezza dell'account Google, e serve la verifica in due passaggi attiva.",
  },
  "Aruba": { imap: "imaps.aruba.it", smtp: "smtps.aruba.it" },
  "Register.it": { imap: "imap.register.it", smtp: "smtp.register.it" },
  "Libero": { imap: "imapmail.libero.it", smtp: "smtp.libero.it" },
  "Outlook / Microsoft 365": {
    imap: "outlook.office365.com",
    smtp: "smtp.office365.com",
    nota: "Molti tenant Microsoft hanno disattivato l'autenticazione di base: se il server rifiuta le credenziali corrette, è quello.",
  },
};

export interface StatoCasella {
  indirizzo: string;
  nomeMittente: string | null;
  imapHost: string;
  imapPorta: number;
  imapUtente: string;
  smtpHost: string;
  smtpPorta: number;
  smtpUtente: string;
}

/**
 * Configurazione della casella.
 *
 * La password non viene mai ripopolata in modifica: il campo resta vuoto e va
 * riscritto. Rimandare al browser una password salvata per farla vedere in un
 * campo significa farla uscire dal server ogni volta che si apre la pagina,
 * per un comodo che vale una digitazione.
 */
export function ConfigurazioneForm({ casella }: { casella: StatoCasella | null }) {
  const [stato, azione, inCorso] = useActionState(salvaConfigurazione, statoIniziale);
  const [imapHost, setImapHost] = useState(casella?.imapHost ?? "");
  const [smtpHost, setSmtpHost] = useState(casella?.smtpHost ?? "");
  const [nota, setNota] = useState<string | null>(null);

  function scegliProvider(nome: string) {
    const provider = PROVIDER[nome];
    if (!provider) return;
    setImapHost(provider.imap);
    setSmtpHost(provider.smtp);
    setNota(provider.nota ?? null);
  }

  return (
    <form action={azione} className="flex flex-col gap-4">
      <label className="block">
        <span className="block text-sm mb-1.5">Provider</span>
        <select className="campo-input" defaultValue="" onChange={(e) => scegliProvider(e.target.value)}>
          <option value="">Scegli per riempire i server…</option>
          {Object.keys(PROVIDER).map((nome) => (
            <option key={nome} value={nome}>
              {nome}
            </option>
          ))}
        </select>
      </label>

      {nota && <p className="text-sm text-warn bg-warn-soft rounded-lg px-3 py-2">{nota}</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm mb-1.5">Indirizzo della casella</span>
          <input
            type="email"
            name="indirizzo"
            required
            defaultValue={casella?.indirizzo}
            className="campo-input"
            placeholder="info@tuodominio.it"
          />
        </label>

        <label className="block">
          <span className="block text-sm mb-1.5">Nome mittente</span>
          <input
            name="nomeMittente"
            defaultValue={casella?.nomeMittente ?? ""}
            className="campo-input"
            placeholder="Come appare a chi riceve"
          />
        </label>
      </div>

      <fieldset className="border border-line rounded-lg p-4 flex flex-col gap-4">
        <legend className="etichetta-cifra px-1">Posta in entrata (IMAP)</legend>
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="block sm:col-span-2">
            <span className="block text-sm mb-1.5">Server</span>
            <input
              name="imapHost"
              required
              value={imapHost}
              onChange={(e) => setImapHost(e.target.value)}
              className="campo-input"
            />
          </label>
          <label className="block">
            <span className="block text-sm mb-1.5">Porta</span>
            <input
              type="number"
              name="imapPorta"
              defaultValue={casella?.imapPorta ?? 993}
              className="campo-input"
            />
          </label>
          <label className="block">
            <span className="block text-sm mb-1.5">Utente</span>
            <input
              name="imapUtente"
              defaultValue={casella?.imapUtente ?? ""}
              className="campo-input"
              placeholder="di solito l'indirizzo"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-sm mb-1.5">Password dedicata</span>
            <input
              type="password"
              name="imapPassword"
              required
              autoComplete="new-password"
              className="campo-input"
              placeholder={casella ? "riscrivila per confermare" : ""}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="border border-line rounded-lg p-4 flex flex-col gap-4">
        <legend className="etichetta-cifra px-1">Posta in uscita (SMTP)</legend>
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="block sm:col-span-2">
            <span className="block text-sm mb-1.5">Server</span>
            <input
              name="smtpHost"
              required
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              className="campo-input"
            />
          </label>
          <label className="block">
            <span className="block text-sm mb-1.5">Porta</span>
            <input
              type="number"
              name="smtpPorta"
              defaultValue={casella?.smtpPorta ?? 465}
              className="campo-input"
            />
          </label>
          <label className="block">
            <span className="block text-sm mb-1.5">Utente</span>
            <input
              name="smtpUtente"
              defaultValue={casella?.smtpUtente ?? ""}
              className="campo-input"
              placeholder="come sopra, se uguale"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-sm mb-1.5">Password (se diversa)</span>
            <input
              type="password"
              name="smtpPassword"
              autoComplete="new-password"
              className="campo-input"
              placeholder="vuoto = la stessa dell'entrata"
            />
          </label>
        </div>
      </fieldset>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">{stato.messaggio}</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Salvataggio…" : casella ? "Aggiorna" : "Salva la casella"}
      </button>
    </form>
  );
}

/**
 * Prova il collegamento. È un pulsante a sé perché la verifica può durare
 * qualche secondo e non deve trattenere il salvataggio: se fallisse durante il
 * salvataggio bisognerebbe riscrivere tutto, password compresa, per provare
 * una porta diversa.
 */
export function ProvaCollegamento() {
  const [stato, setStato] = useState<EsitoForm | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function prova() {
    setInCorso(true);
    setStato(null);
    try {
      setStato(await provaCollegamento());
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={prova} disabled={inCorso} className="btn-secondario self-start">
        {inCorso ? "Provo…" : "Prova il collegamento"}
      </button>
      {stato?.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato?.successo && <p className="text-sm text-ok">{stato.messaggio}</p>}
    </div>
  );
}

export interface OpzioneCliente {
  id: string;
  nome: string;
  email: string | null;
}

export function ScriviForm({
  clienti,
  destinatarioIniziale,
}: {
  clienti: OpzioneCliente[];
  destinatarioIniziale?: string;
}) {
  const [stato, azione, inCorso] = useActionState(inviaMessaggio, statoIniziale);
  const form = useRef<HTMLFormElement>(null);
  const campoA = useRef<HTMLInputElement>(null);

  // Solo `reset()`, che tocca il DOM: azzerare il modulo dopo un invio
  // riuscito non deve passare per lo stato di React.
  useEffect(() => {
    if (stato.successo) form.current?.reset();
  }, [stato.successo]);

  /**
   * Scegliere un cliente scrive il suo indirizzo nel campo, che resta
   * comunque modificabile: e' un riempimento, non un vincolo. Il campo e'
   * non controllato apposta — tenerlo in stato solo per poterlo riempire
   * significherebbe far girare un render a ogni lettera digitata.
   */
  function scegliCliente(id: string) {
    const cliente = clienti.find((c) => c.id === id);
    if (cliente?.email && campoA.current) campoA.current.value = cliente.email;
  }

  const conEmail = clienti.filter((c) => c.email);

  return (
    <form ref={form} action={azione} className="flex flex-col gap-4">
      {conEmail.length > 0 && (
        <label className="block">
          <span className="block text-sm mb-1.5">Scrivi a un cliente</span>
          <select
            name="clienteId"
            className="campo-input"
            defaultValue=""
            onChange={(e) => scegliCliente(e.target.value)}
          >
            <option value="">Scegli, oppure scrivi l&apos;indirizzo sotto</option>
            {conEmail.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} — {c.email}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="block text-sm mb-1.5">A</span>
        <input
          ref={campoA}
          type="email"
          name="a"
          required
          defaultValue={destinatarioIniziale ?? ""}
          className="campo-input"
        />
      </label>

      <label className="block">
        <span className="block text-sm mb-1.5">Oggetto</span>
        <input name="oggetto" required className="campo-input" />
      </label>

      <label className="block">
        <span className="block text-sm mb-1.5">Messaggio</span>
        <textarea name="testo" required rows={8} className="campo-input resize-y" />
      </label>

      {stato.errore && <p className="text-sm text-danger">{stato.errore}</p>}
      {stato.successo && <p className="text-sm text-ok">{stato.messaggio}</p>}

      <button type="submit" disabled={inCorso} className="btn-primario self-start">
        {inCorso ? "Invio…" : "Invia"}
      </button>
    </form>
  );
}
