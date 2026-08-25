import { NextResponse } from "next/server";
import { courses } from "@/data/site";
import { createStripeClient } from "@/services/stripe";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const course = courses.find((item) => item.id === url.searchParams.get("course"));
  if (!course) return NextResponse.redirect(new URL("/#cursos", url.origin));
  if (course.checkoutUrl) return NextResponse.redirect(course.checkoutUrl);
  const stripe = createStripeClient();
  if (!stripe) return NextResponse.redirect(new URL(`/checkout-indisponivel?course=${course.id}`, url.origin));
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${url.origin}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${url.origin}/#cursos`,
    line_items: [{ quantity: 1, price_data: { currency: "brl", unit_amount: Math.round(course.price * 100), product_data: { name: course.title, description: course.description } } }],
    metadata: { course_id: course.id },
  });
  return NextResponse.redirect(session.url ?? new URL("/#cursos", url.origin));
}
