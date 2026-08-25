import Image from "next/image";
import { EmptyState } from "@/components/empty-state";
import type { Testimonial } from "@/lib/types";

export function TestimonialsSection({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  const authorized = testimonials.filter((item) => item.authorizedForDisplay);

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
        <h2 className="text-h2 font-heading font-bold text-navy-950">
          O que dizem os profissionais formados
        </h2>

        {authorized.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {authorized.map((testimonial) => (
              <figure
                key={testimonial.id}
                className="border-l-2 border-navy-700 pl-5"
              >
                <blockquote className="text-sm text-gray-600">
                  “{testimonial.quote}”
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  {testimonial.photoUrl && (
                    <Image
                      src={testimonial.photoUrl}
                      alt={testimonial.name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-navy-950">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {testimonial.profession} · {testimonial.programOrEvent}
                    </p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="mt-10">
            <EmptyState
              title="Em breve, depoimentos de profissionais formados"
              description="Assim que depoimentos reais forem cadastrados e autorizados no painel administrativo, eles aparecem aqui."
            />
          </div>
        )}
      </div>
    </section>
  );
}
