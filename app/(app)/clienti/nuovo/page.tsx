import Link from "next/link";
import { ClienteForm } from "../ClienteForm";
import { salvaNuovoCliente } from "../actions";

export default function PaginaNuovoCliente() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <Link href="/clienti" className="text-xs text-ink-muted hover:text-ink">
          ← Clienti
        </Link>
        <h1 className="text-xl font-semibold mt-2 mb-1">Nuovo cliente</h1>
        <p className="text-sm text-ink-muted">
          I campi di sede e recapito servono alla fattura elettronica: puoi salvare anche un cliente incompleto, ma
          l&apos;XML per lo SDI si genera solo quando ci sono tutti.
        </p>
      </div>
      <ClienteForm azione={salvaNuovoCliente} />
    </div>
  );
}
