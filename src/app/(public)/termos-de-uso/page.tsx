// Modelo inicial — precisa ser revisado juridicamente pelo administrador
// antes de considerar este texto como os termos de uso definitivos.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Condições de uso do site e dos conteúdos do Aeromédico Brasil.",
};

export default function TermosDeUsoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
      <h1 className="text-h1 font-heading font-bold text-navy-950">
        Termos de Uso
      </h1>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-600">
        <p>
          Ao navegar e utilizar este site, você concorda com os termos
          descritos a seguir.
        </p>

        <section>
          <h2 className="font-heading text-h4 font-semibold text-navy-950">
            Conteúdo educacional
          </h2>
          <p className="mt-2">
            Os conteúdos publicados neste site têm finalidade educacional e
            informativa. Eles não substituem protocolos institucionais,
            regulamentações vigentes ou treinamento prático supervisionado.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-h4 font-semibold text-navy-950">
            Formações e inscrições
          </h2>
          <p className="mt-2">
            As condições de cada formação — carga horária, formato,
            certificação e valores — são descritas na página específica de
            cada uma e podem ser alteradas mediante aviso prévio.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-h4 font-semibold text-navy-950">
            Propriedade intelectual
          </h2>
          <p className="mt-2">
            Textos, imagens e demais materiais deste site são de titularidade
            do Aeromédico Brasil ou de terceiros licenciados, e não podem ser
            reproduzidos sem autorização.
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
