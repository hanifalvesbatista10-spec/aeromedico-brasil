import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const savePaymentFees = vi.fn();
vi.mock("@/lib/actions/orders", () => ({
  savePaymentFees: (...args: unknown[]) => savePaymentFees(...args),
}));

import { PaymentFeesPanel } from "../payment-fees-panel";
import { DEFAULT_PAYMENT_FEES } from "@/lib/payments/fees";

const announcer = () => screen.getByTestId("fees-announcer").textContent;

beforeEach(() => {
  vi.clearAllMocks();
  savePaymentFees.mockResolvedValue({ ok: true, data: DEFAULT_PAYMENT_FEES });
});
afterEach(cleanup);

describe("PaymentFeesPanel", () => {
  it("mostra as taxas atuais como o dono as digita e explica de onde vêm", () => {
    render(<PaymentFeesPanel initialFees={DEFAULT_PAYMENT_FEES} />);
    expect((screen.getByLabelText("Pix: percentual (%)") as HTMLInputElement).value).toBe("0,00");
    expect((screen.getByLabelText("Pix: taxa fixa (R$)") as HTMLInputElement).value).toBe("1,99");
    expect((screen.getByLabelText("Cartão à vista: percentual (%)") as HTMLInputElement).value).toBe("2,99");
    expect((screen.getByLabelText("Cartão parcelado: taxa fixa (R$)") as HTMLInputElement).value).toBe("0,49");
    expect((screen.getByLabelText("Máximo de parcelas") as HTMLInputElement).value).toBe("6");
    expect(document.body.textContent).toContain("contrato com o Asaas");
  });

  it("salvar envia os textos digitados e anuncia o resultado", async () => {
    render(<PaymentFeesPanel initialFees={DEFAULT_PAYMENT_FEES} />);
    fireEvent.change(screen.getByLabelText("Cartão à vista: percentual (%)"), { target: { value: "3,19" } });
    fireEvent.change(screen.getByLabelText("Máximo de parcelas"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar taxas" }));

    await waitFor(() =>
      expect(savePaymentFees).toHaveBeenCalledWith({
        pix: { percent: "0,00", fixed: "1,99" },
        cardSingle: { percent: "3,19", fixed: "0,49" },
        cardInstallments: { percent: "3,49", fixed: "0,49" },
        maxInstallments: "10",
      })
    );
    await waitFor(() => expect(announcer()).toBe("Taxas salvas. Valem para os próximos pedidos."));
  });

  it("erro da ação aparece em alerta e nada é anunciado como salvo", async () => {
    savePaymentFees.mockResolvedValue({ ok: false, error: "Pix: o percentual deve ser menor que 100%." });
    render(<PaymentFeesPanel initialFees={DEFAULT_PAYMENT_FEES} />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar taxas" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Pix: o percentual");
    expect(announcer()).toBe("");
  });

  it("falha inesperada também vira alerta", async () => {
    savePaymentFees.mockRejectedValue(new Error("boom"));
    render(<PaymentFeesPanel initialFees={DEFAULT_PAYMENT_FEES} />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar taxas" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível salvar agora.");
  });

  it("enquanto salva, o botão fica aria-disabled e um segundo clique não envia de novo", async () => {
    savePaymentFees.mockImplementation(() => new Promise(() => {}));
    render(<PaymentFeesPanel initialFees={DEFAULT_PAYMENT_FEES} />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar taxas" }));
    const busy = await screen.findByRole("button", { name: "Salvando…" });
    expect(busy.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(busy);
    expect(savePaymentFees).toHaveBeenCalledTimes(1);
  });
});

describe("PaymentFeesPanel: ajustes da revisão", () => {
  it("a confirmação de salvo também é visível (não só para leitor de tela)", async () => {
    render(<PaymentFeesPanel initialFees={DEFAULT_PAYMENT_FEES} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar taxas" }));

    const status = await screen.findByText("Taxas salvas. Valem para os próximos pedidos.");
    expect(status.className).not.toContain("sr-only");
    expect(status.getAttribute("role")).toBe("status");
  });

  it("as dicas estão ligadas aos campos (o leitor de tela as lê ao focar)", () => {
    render(<PaymentFeesPanel initialFees={DEFAULT_PAYMENT_FEES} />);
    const max = screen.getByLabelText("Máximo de parcelas");
    const hint = document.getElementById(max.getAttribute("aria-describedby") ?? "");
    expect(hint?.textContent).toContain("1 a 21");
    expect(hint?.textContent).toContain("Use 1 para não oferecer parcelamento");
  });

  it("avisa que a taxa do Asaas muda por faixa de parcelas, sem prometer valor", () => {
    render(<PaymentFeesPanel initialFees={DEFAULT_PAYMENT_FEES} />);
    expect(document.body.textContent).toContain("faixa de parcelas");
  });

  it("não promete quanto sobra para o dono: só diz o que o site faz com o número digitado", () => {
    render(<PaymentFeesPanel initialFees={DEFAULT_PAYMENT_FEES} />);
    expect(document.body.textContent).not.toContain("o que sobra para você");
    expect(document.body.textContent).toContain("O site soma essa taxa ao total que o cliente paga");
  });

  it("os campos mostram um exemplo do formato", () => {
    render(<PaymentFeesPanel initialFees={DEFAULT_PAYMENT_FEES} />);
    expect((screen.getByLabelText("Pix: percentual (%)") as HTMLInputElement).placeholder).toBe("Ex.: 2,99");
    expect((screen.getByLabelText("Pix: taxa fixa (R$)") as HTMLInputElement).placeholder).toBe("Ex.: 0,49");
  });
});
