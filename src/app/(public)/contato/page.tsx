import type { Metadata } from "next";
import { getRepositories } from "@/lib/repositories";
import { LeadForm } from "@/components/lead-form";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Fale com a equipe do Aeromédico Brasil por e-mail, WhatsApp ou pelo formulário de contato.",
};

export default async function ContatoPage() {
  const settings = await getRepositories().settings.get();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
      <p className="text-sm font-semibold tracking-wide text-navy-700 uppercase">
        Contato
      </p>
      <h1 className="mt-3 text-h1 font-heading font-bold text-navy-950">
        Fale com a equipe
      </h1>
      <p className="mt-4 text-base text-gray-600">
        Envie sua mensagem pelo formulário abaixo ou entre em contato
        diretamente por e-mail ou WhatsApp.
      </p>

      <dl className="mt-8 flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:gap-8">
        <div>
          <dt className="font-semibold text-navy-950">E-mail</dt>
          <dd>
            <a href={`mailto:${settings.email}`} className="hover:underline">
              {settings.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-navy-950">WhatsApp</dt>
          <dd>
            <a
              href={settings.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Iniciar conversa
            </a>
          </dd>
        </div>
      </dl>

      <div className="mt-10 border-t border-gray-300 pt-10">
        <LeadForm
          origin="contato"
          interestLabel="Assunto"
          interestPlaceholder="Ex.: dúvida sobre uma formação"
        />
      </div>
    </div>
  );
}
