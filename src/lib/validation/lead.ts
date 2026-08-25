import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo."),
  email: z.string().min(1, "Informe um e-mail.").email("Informe um e-mail válido."),
  phone: z.string().min(8, "Informe um telefone válido."),
  profession: z.string().min(2, "Informe sua profissão."),
  interest: z.string().min(2, "Conte o que você procura."),
  message: z.string().min(5, "Escreva uma mensagem."),
  origin: z.enum(["contato", "formacao", "palestra"]),
  consentGiven: z.literal(true, {
    error: "É necessário aceitar o uso dos dados para contato.",
  }),
});

export type LeadInput = z.infer<typeof leadSchema>;
