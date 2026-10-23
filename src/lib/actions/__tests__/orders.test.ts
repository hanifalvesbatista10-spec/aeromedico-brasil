import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StoreOrder } from "@/lib/types";

const requireAdmin = vi.fn();
const getById = vi.fn();
const updateFulfillment = vi.fn();
const update = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/auth/admin-guard", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({
    orders: { getById, updateFulfillment },
    paymentSettings: { update },
  }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

import { savePaymentFees, updateOrderFulfillment } from "../orders";

function order(over: Partial<StoreOrder> = {}): StoreOrder {
  return {
    id: "o1",
    number: 1,
    status: "paid",
    environment: "production",
    checkoutId: "chk_1",
    trackingCode: null,
    notes: null,
    createdAt: "2026-10-22T12:00:00Z",
    paidAt: "2026-10-22T12:05:00Z",
    customer: { name: "Maria Silva", email: "maria@exemplo.com", phone: "85999998888" },
    address: {
      cep: "01018020",
      street: "Rua das Flores",
      number: "100",
      complement: null,
      district: "Centro",
      city: "São Paulo",
      state: "SP",
    },
    shipping: { optionId: "1", label: "Correios PAC", cents: 2345 },
    items: [],
    subtotalCents: 4000,
    discountCents: 0,
    couponCode: null,
    feeCents: 199,
    totalCents: 6544,
    paymentMethod: "pix",
    ...over,
  };
}

function stored(current: StoreOrder | null) {
  getById.mockImplementation(async (id: string) => (current && current.id === id ? current : null));
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue(undefined);
  stored(order());
  updateFulfillment.mockImplementation(async (id: string, patch: object) => order({ id, ...patch }));
  update.mockImplementation(async (fees: unknown) => fees);
});

describe("updateOrderFulfillment", () => {
  it("sem administrador: rejeita e não toca no repositório", async () => {
    requireAdmin.mockRejectedValue(new Error("Sessão administrativa não encontrada."));
    await expect(updateOrderFulfillment("o1", { status: "preparing" })).rejects.toThrow("Sessão administrativa");
    expect(getById).not.toHaveBeenCalled();
    expect(updateFulfillment).not.toHaveBeenCalled();
  });

  it("busca só o pedido pedido (não a lista inteira) e grava a transição coerente", async () => {
    const result = await updateOrderFulfillment("o1", { status: "preparing" });
    expect(getById).toHaveBeenCalledWith("o1");
    expect(updateFulfillment).toHaveBeenCalledWith("o1", { status: "preparing" });
    expect(result).toMatchObject({ ok: true, data: { id: "o1", status: "preparing" } });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/pedidos");
  });

  it("transição inválida (entregue → separação) volta como valor e nada é gravado", async () => {
    stored(order({ status: "delivered" }));
    const result = await updateOrderFulfillment("o1", { status: "preparing" });
    expect(result.ok).toBe(false);
    expect(updateFulfillment).not.toHaveBeenCalled();
  });

  it("enviado sem código de rastreio é recusado", async () => {
    stored(order({ status: "preparing" }));
    const result = await updateOrderFulfillment("o1", { status: "shipped" });
    expect(result).toEqual({ ok: false, error: "Informe o código de rastreio para marcar como enviado." });
    expect(updateFulfillment).not.toHaveBeenCalled();
  });

  it("enviado com código grava o código normalizado", async () => {
    stored(order({ status: "preparing" }));
    await updateOrderFulfillment("o1", { status: "shipped", trackingCode: "aa123456789br" });
    expect(updateFulfillment).toHaveBeenCalledWith("o1", { status: "shipped", trackingCode: "AA123456789BR" });
  });

  it("pedido órfão (aguardando pagamento, sem checkout) pode ser cancelado", async () => {
    stored(order({ status: "awaiting_payment", checkoutId: null }));
    const result = await updateOrderFulfillment("o1", { status: "canceled" });
    expect(result.ok).toBe(true);
    expect(updateFulfillment).toHaveBeenCalledWith("o1", { status: "canceled" });
  });

  it("pedido que não existe mais", async () => {
    const result = await updateOrderFulfillment("outro", { status: "preparing" });
    expect(result).toEqual({ ok: false, error: "Pedido não encontrado." });
  });

  it("falha do banco volta como valor, sem vazar o erro interno", async () => {
    updateFulfillment.mockRejectedValue(new Error("Falha ao atualizar pedido: permission denied for table"));
    const result = await updateOrderFulfillment("o1", { status: "preparing" });
    expect(result).toEqual({ ok: false, error: "Não foi possível salvar agora. Tente de novo." });
  });
});

describe("savePaymentFees", () => {
  const input = {
    pix: { percent: "0", fixed: "1,99" },
    cardSingle: { percent: "2,99", fixed: "0,49" },
    cardInstallments: { percent: "3,49", fixed: "0,49" },
    maxInstallments: "6",
  };

  it("sem administrador: rejeita e não toca no repositório", async () => {
    requireAdmin.mockRejectedValue(new Error("Sessão administrativa não encontrada."));
    await expect(savePaymentFees(input)).rejects.toThrow("Sessão administrativa");
    expect(update).not.toHaveBeenCalled();
  });

  it("converte e grava pontos-base e centavos", async () => {
    const result = await savePaymentFees(input);
    expect(update).toHaveBeenCalledWith({
      pix: { percentBp: 0, fixedCents: 199 },
      cardSingle: { percentBp: 299, fixedCents: 49 },
      cardInstallments: { percentBp: 349, fixedCents: 49 },
      maxInstallments: 6,
    });
    expect(result.ok).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/pedidos");
  });

  it("entrada inválida volta como valor e nada é gravado", async () => {
    const result = await savePaymentFees({ ...input, maxInstallments: "22" });
    expect(result.ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});
