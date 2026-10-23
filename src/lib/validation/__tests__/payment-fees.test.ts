import { describe, it, expect } from "vitest";
import { feesToForm, paymentFeesSchema, type PaymentFeesForm } from "../payment-fees";
import { DEFAULT_PAYMENT_FEES } from "@/lib/payments/fees";

const form: PaymentFeesForm = {
  pix: { percent: "0", fixed: "1,99" },
  cardSingle: { percent: "2,99", fixed: "0,49" },
  cardInstallments: { percent: "3,49", fixed: "0,49" },
  maxInstallments: "6",
};

function parse(over: Partial<PaymentFeesForm> = {}) {
  return paymentFeesSchema.safeParse({ ...form, ...over });
}
const message = (result: ReturnType<typeof parse>) =>
  result.success ? null : result.error.issues[0]?.message;

describe("paymentFeesSchema", () => {
  it("converte percentual em pontos-base e reais em centavos", () => {
    const result = parse();
    expect(result.success && result.data).toEqual({
      pix: { percentBp: 0, fixedCents: 199 },
      cardSingle: { percentBp: 299, fixedCents: 49 },
      cardInstallments: { percentBp: 349, fixedCents: 49 },
      maxInstallments: 6,
    });
  });

  it("aceita ponto como decimal e espaços ao redor", () => {
    const result = parse({ cardSingle: { percent: " 2.99 ", fixed: " 0.49 " } });
    expect(result.success && result.data.cardSingle).toEqual({ percentBp: 299, fixedCents: 49 });
  });

  it("recusa percentual 100, texto e mais de duas casas", () => {
    expect(message(parse({ pix: { percent: "100", fixed: "0" } }))).toContain("Pix");
    expect(message(parse({ pix: { percent: "abc", fixed: "0" } }))).toContain("percentual");
    expect(message(parse({ pix: { percent: "2,999", fixed: "0" } }))).toContain("percentual");
  });

  it("campo vazio não vira zero em silêncio", () => {
    expect(message(parse({ cardSingle: { percent: "", fixed: "0,49" } }))).toContain("Cartão à vista");
    expect(message(parse({ cardSingle: { percent: "2,99", fixed: "" } }))).toContain("taxa fixa");
  });

  it("recusa taxa fixa inválida, negativa ou grande demais para o banco", () => {
    expect(message(parse({ pix: { percent: "0", fixed: "abc" } }))).toContain("taxa fixa");
    expect(message(parse({ pix: { percent: "0", fixed: "-1,00" } }))).toContain("taxa fixa");
    expect(message(parse({ pix: { percent: "0", fixed: "99999999999" } }))).toContain("grande demais");
  });

  it("parcelas: de 1 a 21, só inteiros", () => {
    expect(message(parse({ maxInstallments: "0" }))).toContain("1 a 21");
    expect(message(parse({ maxInstallments: "22" }))).toContain("1 a 21");
    expect(message(parse({ maxInstallments: "2,5" }))).toContain("parcelas");
    expect(message(parse({ maxInstallments: "" }))).toContain("parcelas");
    const ok = parse({ maxInstallments: "21" });
    expect(ok.success && ok.data.maxInstallments).toBe(21);
  });
});

describe("feesToForm", () => {
  it("mostra as taxas como o dono digita e volta ao mesmo valor", () => {
    const shown = feesToForm(DEFAULT_PAYMENT_FEES);
    expect(shown.pix).toEqual({ percent: "0,00", fixed: "1,99" });
    expect(shown.cardSingle).toEqual({ percent: "2,99", fixed: "0,49" });
    const back = paymentFeesSchema.safeParse(shown);
    expect(back.success && back.data).toEqual(DEFAULT_PAYMENT_FEES);
  });
});
