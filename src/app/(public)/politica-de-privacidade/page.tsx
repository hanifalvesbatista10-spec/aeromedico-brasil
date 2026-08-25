// Modelo inicial — precisa ser revisado juridicamente pelo administrador
// antes de considerar este texto como a política de privacidade definitiva.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o Aeromédico Brasil trata os dados pessoais coletados neste site.",
};

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
      <h1 className="text-h1 font-heading font-bold text-navy-950">
        Política de Privacidade
      </h1>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-600">
        <p>
          Esta página descreve, em termos gerais, como o Aeromédico Brasil
          trata os dados pessoais informados pelos visitantes deste site,
          principalmente por meio dos formulários de contato, interesse em
          formações e solicitação de palestras.
        </p>

        <section>
          <h2 className="font-heading text-h4 font-semibold text-navy-950">
            Quais dados coletamos
          </h2>
          <p className="mt-2">
            Nome, e-mail, telefone, profissão e o conteúdo da mensagem
            enviada, apenas quando você preenche um dos formulários do site.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-h4 font-semibold text-navy-950">
            Para que usamos
          </h2>
          <p className="mt-2">
            Exclusivamente para responder ao seu contato, informar sobre
            formações de seu interesse ou dar andamento a uma solicitação de
            palestra.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-h4 font-semibold text-navy-950">
            Seus direitos
          </h2>
          <p className="mt-2">
            Você pode solicitar a qualquer momento a atualização ou exclusão
            dos seus dados entrando em contato pelos canais informados no
            rodapé deste site.
          </p>
        </section>
      </div>

      <p className="mt-12 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs text-gray-600">
        Este é um texto-modelo inicial e deve ser revisado por um
        profissional jurídico antes da publicação definitiva do site.
      </p>
    </div>
  );
}
