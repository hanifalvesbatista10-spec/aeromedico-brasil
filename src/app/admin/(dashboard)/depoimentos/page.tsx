import { getRepositories } from "@/lib/repositories";
import { TestimonialsManager } from "@/components/admin/testimonials-manager";

export default async function AdminDepoimentosPage() {
  const testimonials = await getRepositories().testimonials.list();
  return <TestimonialsManager initialTestimonials={testimonials} />;
}
