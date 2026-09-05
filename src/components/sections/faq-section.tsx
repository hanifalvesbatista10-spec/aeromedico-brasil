"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { FAQItem } from "@/lib/types";

export function FAQSection({ items }: { items: FAQItem[] }) {
  const [value, setValue] = useState<string[]>(items[0] ? [items[0].id] : []);

  return (
    <section className="border-b border-border bg-brand-surface">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
        <h2 className="text-h2 font-heading font-bold text-navy-950">
          Perguntas frequentes
        </h2>
        <Accordion
          value={value}
          onValueChange={(next) => setValue(next.slice(-1) as string[])}
          className="mt-10"
        >
          {items.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="font-heading text-base font-semibold text-navy-950 hover:text-brand-red hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-gray-600">{item.answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
