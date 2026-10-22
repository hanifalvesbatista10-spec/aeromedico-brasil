import { z } from "zod";
import { normalizeCep } from "@/lib/shipping/cep";

// Dados de contato e entrega do comprador. Tudo texto, como a pessoa digita;
// a normalização (telefone e CEP só com dígitos, UF em maiúsculas) acontece
// aqui, no servidor. Não pedimos CPF: o Asaas coleta os dados do pagador na
// página de pagamento e não os guardamos.

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export interface Buyer {
  customer: { name: string; email: string; phone: string };
  address: {
    cep: string;
    street: string;
    number: string;
    complement: string | null;
    district: string;
    city: string;
    state: string;
  };
}

export const buyerSchema = z
  .object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    cep: z.string(),
    street: z.string(),
    number: z.string(),
    complement: z.string().nullish(),
    district: z.string(),
    city: z.string(),
    state: z.string(),
  })
  .transform((raw, ctx): Buyer => {
    const fail = (message: string) => {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    };
    const text = (value: string | null | undefined) => (value ?? "").trim();

    const name = text(raw.name);
    if (name.length < 2 || name.length > 120) return fail("Informe seu nome completo.");

    const email = text(raw.email).toLowerCase();
    if (email.length > 200 || !z.email().safeParse(email).success) {
      return fail("Informe um e-mail válido.");
    }

    const phone = raw.phone.replace(/\D/g, "");
    if (phone.length !== 10 && phone.length !== 11) {
      return fail("Informe um telefone com DDD (10 ou 11 números).");
    }

    const cep = normalizeCep(raw.cep);
    if (!cep) return fail("Informe um CEP com 8 números.");

    const street = text(raw.street);
    if (!street || street.length > 200) return fail("Informe a rua.");

    const number = text(raw.number);
    if (!number || number.length > 20) return fail("Informe o número (ou S/N).");

    const district = text(raw.district);
    if (!district || district.length > 100) return fail("Informe o bairro.");

    const city = text(raw.city);
    if (!city || city.length > 100) return fail("Informe a cidade.");

    const state = text(raw.state).toUpperCase();
    if (!UFS.includes(state)) return fail("Informe o estado (sigla com 2 letras, como SP).");

    const complement = text(raw.complement);
    if (complement.length > 100) return fail("O complemento está muito longo.");

    return {
      customer: { name, email, phone },
      address: {
        cep,
        street,
        number,
        complement: complement === "" ? null : complement,
        district,
        city,
        state,
      },
    };
  });

export type BuyerInput = z.input<typeof buyerSchema>;
