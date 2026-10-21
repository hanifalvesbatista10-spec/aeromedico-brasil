import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const saveStoreCoupon = vi.fn();
const toggleStoreCouponActive = vi.fn();
const deleteStoreCoupon = vi.fn();
vi.mock("@/lib/actions/coupons", () => ({
  saveStoreCoupon: (...args: unknown[]) => saveStoreCoupon(...args),
  toggleStoreCouponActive: (...args: unknown[]) => toggleStoreCouponActive(...args),
  deleteStoreCoupon: (...args: unknown[]) => deleteStoreCoupon(...args),
}));

import { CouponsManager } from "../coupons-manager";
import type { StoreCoupon } from "@/lib/types";

function coupon(over: Partial<StoreCoupon> = {}): StoreCoupon {
  return {
    id: "c1",
    code: "VERAO10",
    kind: "percent",
    value: 10,
    minOrderCents: 0,
    startsAt: null,
    expiresAt: null,
    maxUses: null,
    usesCount: 0,
    active: true,
    ...over,
  };
}

const plain = (text: string | null) => (text ?? "").replace(/ /g, " ");

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe("CouponsManager", () => {
  it("lista vazia mostra o aviso e o botão de criar", () => {
    render(<CouponsManager initialCoupons={[]} />);
    expect(screen.getByText("Nenhum cupom cadastrado.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Novo cupom" })).toBeTruthy();
  });

  it("mostra o desconto de cada cupom, percentual ou fixo", () => {
    render(
      <CouponsManager
        initialCoupons={[
          coupon(),
          coupon({ id: "c2", code: "CINCO", kind: "fixed", value: 2000, minOrderCents: 5000 }),
        ]}
      />
    );
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("10%")).toBeTruthy();
    expect(plain(rows[2].textContent)).toContain("R$ 20,00");
    expect(plain(rows[2].textContent)).toContain("R$ 50,00");
  });

  it("criar envia o que foi digitado e o cupom novo aparece", async () => {
    saveStoreCoupon.mockResolvedValue({ ok: true, data: coupon() });
    render(<CouponsManager initialCoupons={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Novo cupom" }));
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "verao10" } });
    fireEvent.change(screen.getByLabelText("Percentual (%)"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(saveStoreCoupon).toHaveBeenCalledWith({
        id: undefined,
        code: "verao10",
        kind: "percent",
        value: "10",
        minOrder: "",
        startsAt: "",
        expiresAt: "",
        maxUses: "",
        usesCount: "",
        active: true,
      })
    );
    await waitFor(() => expect(screen.getByText("VERAO10")).toBeTruthy());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("trocar para valor fixo muda o rótulo do campo", () => {
    render(<CouponsManager initialCoupons={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Novo cupom" }));
    fireEvent.change(screen.getByLabelText("Tipo de desconto"), { target: { value: "fixed" } });
    expect(screen.getByLabelText("Valor (R$)")).toBeTruthy();
  });

  it("erro da ação aparece em alerta e o diálogo continua aberto", async () => {
    saveStoreCoupon.mockResolvedValue({ ok: false, error: "Já existe um cupom com este código." });
    render(<CouponsManager initialCoupons={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Novo cupom" }));
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "verao10" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Já existe um cupom com este código."
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("editar abre com os dados e salva no mesmo id", async () => {
    saveStoreCoupon.mockResolvedValue({ ok: true, data: coupon({ value: 15 }) });
    render(<CouponsManager initialCoupons={[coupon()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Editar VERAO10" }));
    expect((screen.getByLabelText("Código") as HTMLInputElement).value).toBe("VERAO10");
    fireEvent.change(screen.getByLabelText("Percentual (%)"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(saveStoreCoupon).toHaveBeenCalledWith(expect.objectContaining({ id: "c1", value: "15" }))
    );
    await waitFor(() => expect(screen.getByText("15%")).toBeTruthy());
  });

  it("desativar chama a ação e a linha passa a Inativo", async () => {
    toggleStoreCouponActive.mockResolvedValue(coupon({ active: false }));
    render(<CouponsManager initialCoupons={[coupon()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Desativar VERAO10" }));

    await waitFor(() => expect(toggleStoreCouponActive).toHaveBeenCalledWith("c1", false));
    await waitFor(() => expect(screen.getByText("Inativo")).toBeTruthy());
  });

  it("excluir só acontece depois de confirmar", async () => {
    deleteStoreCoupon.mockResolvedValue(undefined);
    render(<CouponsManager initialCoupons={[coupon()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Excluir VERAO10" }));
    expect(deleteStoreCoupon).not.toHaveBeenCalled();

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(deleteStoreCoupon).toHaveBeenCalledWith("c1"));
    await waitFor(() => expect(screen.queryByText("VERAO10")).toBeNull());
  });

  it("cupom com data final no passado aparece como Expirado", () => {
    render(<CouponsManager initialCoupons={[coupon({ expiresAt: "2020-01-01T00:00:00Z" })]} />);
    expect(screen.getByText("Expirado")).toBeTruthy();
  });
});

describe("CouponsManager: ajustes da revisão", () => {
  it("a coluna Validade mostra o horário no fuso do navegador (23:59 não vira o dia seguinte)", () => {
    const fim = new Date(2026, 11, 31, 23, 59).toISOString();
    render(<CouponsManager initialCoupons={[coupon({ expiresAt: fim })]} />);
    expect(screen.getAllByRole("row")[1].textContent).toContain("Até 31/12/2026 23:59");
  });

  it("sem pedido mínimo a coluna diz 'Sem mínimo'", () => {
    render(<CouponsManager initialCoupons={[coupon()]} />);
    expect(screen.getAllByRole("row")[1].textContent).toContain("Sem mínimo");
  });

  it("o diálogo é largo o bastante, fala do fuso do navegador e tem botão Fechar em português", () => {
    render(<CouponsManager initialCoupons={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Novo cupom" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("sm:max-w-lg");
    expect(dialog.textContent).toContain("A data usa o fuso do seu navegador.");
    expect(within(dialog).getByRole("button", { name: "Fechar" })).toBeTruthy();
    expect(dialog.textContent).not.toContain("Horário de Brasília");
  });

  it("Enter nos campos envia o formulário", async () => {
    saveStoreCoupon.mockResolvedValue({ ok: true, data: coupon() });
    render(<CouponsManager initialCoupons={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Novo cupom" }));
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "verao10" } });
    fireEvent.change(screen.getByLabelText("Percentual (%)"), { target: { value: "10" } });

    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => expect(saveStoreCoupon).toHaveBeenCalledTimes(1));
  });

  it("ativar/desativar anuncia o resultado", async () => {
    toggleStoreCouponActive.mockResolvedValue(coupon({ active: false }));
    render(<CouponsManager initialCoupons={[coupon()]} />);
    fireEvent.click(screen.getByRole("button", { name: "Desativar VERAO10" }));
    await waitFor(() =>
      expect(screen.getByTestId("coupons-announcer").textContent).toBe("Cupom VERAO10 desativado.")
    );
  });

  it("excluir anuncia e leva o foco para o título da seção (a linha some)", async () => {
    deleteStoreCoupon.mockResolvedValue(undefined);
    render(<CouponsManager initialCoupons={[coupon()]} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir VERAO10" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Para só pausar, use Desativar.");

    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() =>
      expect(screen.getByTestId("coupons-announcer").textContent).toBe("Cupom VERAO10 excluído.")
    );
    await waitFor(() => expect(document.activeElement?.id).toBe("coupons-title"));
  });
});
