import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const savePaymentTerms = vi.fn();
vi.mock("@/lib/actions/orders", () => ({
  savePaymentTerms: (...args: unknown[]) => savePaymentTerms(...args),
}));

import { PaymentTermsPanel } from "../payment-terms-panel";
import { DEFAULT_PAYMENT_TERMS } from "@/lib/payments/terms";

const announcer = () => screen.getByTestId("terms-announcer").textContent;

beforeEach(() => {
  vi.clearAllMocks();
  savePaymentTerms.mockResolvedValue({ ok: true, data: DEFAULT_PAYMENT_TERMS });
});
afterEach(cleanup);

describe("PaymentTermsPanel", () => {
  it("mostra o desconto do Pix e o máximo de parcelas atuais e explica que não há taxa no cartão", () => {
    render(<PaymentTermsPanel initialTerms={DEFAULT_PAYMENT_TERMS} />);
    expect((screen.getByLabelText("Desconto no Pix (%)") as HTMLInputElement).value).toBe("5");
    expect((screen.getByLabelText("Máximo de parcelas no cartão") as HTMLInputElement).value).toBe("6");
    const text = document.body.textContent ?? "";
    expect(text).toContain("não há taxa extra");
    expect(text).toContain("sem contar o frete");
  });

  it("salvar envia os textos digitados e confirma, de forma visível e anunciada", async () => {
    render(<PaymentTermsPanel initialTerms={DEFAULT_PAYMENT_TERMS} />);
    fireEvent.change(screen.getByLabelText("Desconto no Pix (%)"), { target: { value: "7,5" } });
    fireEvent.change(screen.getByLabelText("Máximo de parcelas no cartão"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar condições" }));

    await waitFor(() => expect(savePaymentTerms).toHaveBeenCalledWith({ pixDiscount: "7,5", maxInstallments: "10" }));
    await waitFor(() => expect(announcer()).toBe("Condições salvas. Valem para os próximos pedidos."));
    const status = screen.getByTestId("terms-announcer");
    expect(status.className).not.toContain("sr-only");
    expect(status.getAttribute("role")).toBe("status");
  });

  it("erro da ação aparece em alerta e nada é anunciado como salvo", async () => {
    savePaymentTerms.mockResolvedValue({ ok: false, error: "O desconto do Pix deve ficar entre 0% e 50%." });
    render(<PaymentTermsPanel initialTerms={DEFAULT_PAYMENT_TERMS} />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar condições" }));

    expect((await screen.findByRole("alert")).textContent).toContain("entre 0% e 50%");
    expect(announcer()).toBe("");
  });

  it("falha inesperada também vira alerta", async () => {
    savePaymentTerms.mockRejectedValue(new Error("boom"));
    render(<PaymentTermsPanel initialTerms={DEFAULT_PAYMENT_TERMS} />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar condições" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível salvar agora.");
  });

  it("enquanto salva, o botão fica aria-disabled e um segundo clique não envia de novo", async () => {
    savePaymentTerms.mockImplementation(() => new Promise(() => {}));
    render(<PaymentTermsPanel initialTerms={DEFAULT_PAYMENT_TERMS} />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar condições" }));
    const busy = await screen.findByRole("button", { name: "Salvando…" });
    expect(busy.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(busy);
    expect(savePaymentTerms).toHaveBeenCalledTimes(1);
  });

  it("as dicas estão ligadas aos campos (o leitor de tela as lê ao focar)", () => {
    render(<PaymentTermsPanel initialTerms={DEFAULT_PAYMENT_TERMS} />);
    const pix = screen.getByLabelText("Desconto no Pix (%)");
    expect(document.getElementById(pix.getAttribute("aria-describedby") ?? "")?.textContent).toContain("0 a 50");
    const max = screen.getByLabelText("Máximo de parcelas no cartão");
    const hint = document.getElementById(max.getAttribute("aria-describedby") ?? "");
    expect(hint?.textContent).toContain("1 a 21");
    expect(hint?.textContent).toContain("Use 1 para não oferecer parcelamento");
  });
});
