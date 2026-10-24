import { describe, it, expect } from "vitest";
import { paymentTermsSchema, termsToForm } from "../payment-terms";
import { DEFAULT_PAYMENT_TERMS } from "@/lib/payments/terms";

function parse(over: Partial<{ pixDiscount: string; maxInstallments: string }> = {}) {
  return paymentTermsSchema.safeParse({ pixDiscount: "5", maxInstallments: "6", ...over });
}
const message = (result: ReturnType<typeof parse>) => (result.success ? null : result.error.issues[0]?.message);

describe("paymentTermsSchema", () => {
  it("converte o percentual em pontos-base", () => {
    const result = parse();
    expect(result.success && result.data).toEqual({ pixDiscountBp: 500, maxInstallments: 6 });
  });

  it("aceita vírgula, ponto, duas casas e espaços ao redor", () => {
    expect(parse({ pixDiscount: "5,5" }).success && parse({ pixDiscount: "5,5" }).data?.pixDiscountBp).toBe(550);
    const dot = parse({ pixDiscount: " 7.25 " });
    expect(dot.success && dot.data.pixDiscountBp).toBe(725);
    const zero = parse({ pixDiscount: "0" });
    expect(zero.success && zero.data.pixDiscountBp).toBe(0);
  });

  it("recusa vazio, texto, mais de duas casas e valores acima de 50%", () => {
    expect(message(parse({ pixDiscount: "" }))).toContain("Desconto no Pix");
    expect(message(parse({ pixDiscount: "abc" }))).toContain("Desconto no Pix");
    expect(message(parse({ pixDiscount: "5,555" }))).toContain("Desconto no Pix");
    expect(message(parse({ pixDiscount: "51" }))).toContain("0% e 50%");
    expect(message(parse({ pixDiscount: "-5" }))).toContain("Desconto no Pix");
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

describe("termsToForm", () => {
  it("mostra o desconto como o dono digita e volta ao mesmo valor", () => {
    expect(termsToForm(DEFAULT_PAYMENT_TERMS)).toEqual({ pixDiscount: "5", maxInstallments: "6" });
    expect(termsToForm({ pixDiscountBp: 550, maxInstallments: 3 }).pixDiscount).toBe("5,50");
    const back = paymentTermsSchema.safeParse(termsToForm({ pixDiscountBp: 725, maxInstallments: 3 }));
    expect(back.success && back.data).toEqual({ pixDiscountBp: 725, maxInstallments: 3 });
  });
});
