"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { faqs } from "@/data/site";

export function Faq() {
  return (
    <Accordion.Root type="single" collapsible className="space-y-3">
      {faqs.map((item, index) => (
        <Accordion.Item key={item.question} value={`item-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Accordion.Header>
            <Accordion.Trigger className="group focus-ring flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-5 text-left font-semibold text-[#07182b] sm:px-6">
              {item.question}<ChevronDown className="size-5 shrink-0 text-[#1175d1] transition-transform group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden text-sm leading-7 text-slate-600 data-[state=closed]:animate-[accordion-up_.2s_ease-out] data-[state=open]:animate-[accordion-down_.2s_ease-out]">
            <p className="px-5 pb-5 sm:px-6 sm:pb-6">{item.answer}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
