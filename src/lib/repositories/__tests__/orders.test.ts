import { describe, it, expect } from "vitest";
import { createMockOrderRepository } from "../mock/orders";
import type { OrderDraft } from "@/lib/types";

function draft(over: Partial<OrderDraft> = {}): OrderDraft {
  return {
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
    items: [
      {
        productId: "p1",
        variantId: "v1",
        name: "Camiseta Aeromédico",
        size: "M",
        colorName: "Preta",
        unitPriceCents: 4990,
        quantity: 2,
        weightGrams: 200,
      },
    ],
    subtotalCents: 9980,
    discountCents: 998,
    couponCode: "VERAO10",
    pixDiscountCents: 0,
    totalCents: 9980 - 998 + 2345,
    paymentMethod: "card_single",
    ...over,
  };
}

function setup(stock: Record<string, number | null> = { v1: 5 }) {
  const repo = createMockOrderRepository({ stock, couponUses: { VERAO10: 0 } });
  return repo;
}

async function created(repo = setup(), over: Partial<OrderDraft> = {}) {
  const order = await repo.create(draft(over));
  await repo.attachCheckout(order.id, { id: `chk_${order.number}`, url: "https://asaas.com/x" });
  return { repo, order, checkoutId: `chk_${order.number}` };
}

const event = (eventId: string, type: string, checkoutId: string) => ({
  eventId,
  type,
  checkoutId,
  payload: {},
});

describe("mock order repository: criação", () => {
  it("devolve id, número crescente e uma chave longa; o admin vê o pedido", async () => {
    const repo = setup();
    const a = await repo.create(draft());
    const b = await repo.create(draft());
    expect(a.id).toBeTruthy();
    expect(b.number).toBe(a.number + 1);
    expect(a.accessToken.length).toBeGreaterThanOrEqual(32);
    expect(a.accessToken).not.toBe(b.accessToken);

    const [first] = await repo.list();
    expect(first).toMatchObject({ status: "awaiting_payment", paymentMethod: "card_single" });
    expect(first.items).toHaveLength(1);
  });

  it("recusa subtotal que não confere com os itens ou total que não fecha", async () => {
    const repo = setup();
    await expect(repo.create(draft({ subtotalCents: 1 }))).rejects.toThrow();
    await expect(repo.create(draft({ totalCents: 1 }))).rejects.toThrow();
  });
});

describe("mock order repository: confirmação do pagamento", () => {
  it("CHECKOUT_PAID marca pago, baixa o estoque e conta o cupom UMA vez", async () => {
    const { repo, checkoutId } = await created();
    expect(await repo.applyEvent(event("e1", "CHECKOUT_PAID", checkoutId))).toBe("paid");

    expect((await repo.list())[0].status).toBe("paid");
    expect((await repo.list())[0].paidAt).not.toBeNull();
    expect(repo.inspect()).toEqual({ stock: { v1: 3 }, couponUses: { VERAO10: 1 } });

    // O mesmo evento outra vez: nada muda.
    expect(await repo.applyEvent(event("e1", "CHECKOUT_PAID", checkoutId))).toBe("duplicate");
    expect(repo.inspect()).toEqual({ stock: { v1: 3 }, couponUses: { VERAO10: 1 } });
  });

  it("outro evento de pagamento do mesmo checkout depois de pago é ignorado", async () => {
    const { repo, checkoutId } = await created();
    await repo.applyEvent(event("e1", "CHECKOUT_PAID", checkoutId));
    expect(await repo.applyEvent(event("e2", "CHECKOUT_PAID", checkoutId))).toBe("ignored");
    expect(repo.inspect().stock).toEqual({ v1: 3 });
  });

  it("estoque insuficiente: pago_revisar, nada é baixado e o cupom não é contado", async () => {
    const { repo, checkoutId } = await created(setup({ v1: 1 }));
    expect(await repo.applyEvent(event("e1", "CHECKOUT_PAID", checkoutId))).toBe("paid_review");

    expect((await repo.list())[0].status).toBe("paid_review");
    expect(repo.inspect()).toEqual({ stock: { v1: 1 }, couponUses: { VERAO10: 0 } });
  });

  it("estoque ilimitado (nulo) nunca barra nem é alterado", async () => {
    const { repo, checkoutId } = await created(setup({ v1: null }));
    expect(await repo.applyEvent(event("e1", "CHECKOUT_PAID", checkoutId))).toBe("paid");
    expect(repo.inspect().stock).toEqual({ v1: null });
  });

  it("pedido sem cupom não mexe em contador de cupom", async () => {
    const { repo, checkoutId } = await created(setup(), { couponCode: null });
    await repo.applyEvent(event("e1", "CHECKOUT_PAID", checkoutId));
    expect(repo.inspect().couponUses).toEqual({ VERAO10: 0 });
  });

  it("cancelado e expirado só mudam pedido aguardando pagamento", async () => {
    const a = await created();
    expect(await a.repo.applyEvent(event("e1", "CHECKOUT_CANCELED", a.checkoutId))).toBe("canceled");
    expect((await a.repo.list())[0].status).toBe("canceled");

    const b = await created();
    await b.repo.applyEvent(event("e2", "CHECKOUT_PAID", b.checkoutId));
    expect(await b.repo.applyEvent(event("e3", "CHECKOUT_CANCELED", b.checkoutId))).toBe("ignored");
    expect(await b.repo.applyEvent(event("e4", "CHECKOUT_EXPIRED", b.checkoutId))).toBe("ignored");
    expect((await b.repo.list())[0].status).toBe("paid");
  });

  it("pagamento que chega depois de o checkout expirar ainda confirma o pedido", async () => {
    const { repo, checkoutId } = await created();
    expect(await repo.applyEvent(event("e1", "CHECKOUT_EXPIRED", checkoutId))).toBe("expired");
    expect(await repo.applyEvent(event("e2", "CHECKOUT_PAID", checkoutId))).toBe("paid");
  });

  it("tipo desconhecido e checkout desconhecido são ignorados", async () => {
    const { repo, checkoutId } = await created();
    expect(await repo.applyEvent(event("e1", "CHECKOUT_CREATED", checkoutId))).toBe("ignored");
    expect(await repo.applyEvent(event("e2", "CHECKOUT_PAID", "chk_que_nao_existe"))).toBe("ignored");
    expect((await repo.list())[0].status).toBe("awaiting_payment");
  });
});

describe("mock order repository: checkout e cancelamento pendente", () => {
  it("vincular o checkout duas vezes é recusado", async () => {
    const { repo, order } = await created();
    await expect(repo.attachCheckout(order.id, { id: "outro", url: "https://x" })).rejects.toThrow();
  });

  it("cancelPending cancela só pedido aguardando e sem checkout", async () => {
    const repo = setup();
    const semCheckout = await repo.create(draft());
    await repo.cancelPending(semCheckout.id);

    const comCheckout = await created(repo);
    await repo.cancelPending(comCheckout.order.id);

    const byNumber = Object.fromEntries((await repo.list()).map((o) => [o.number, o.status]));
    expect(byNumber[semCheckout.number]).toBe("canceled");
    expect(byNumber[comCheckout.order.number]).toBe("awaiting_payment");
  });
});

describe("mock order repository: leitura pública e andamento", () => {
  it("getPublic com a chave certa devolve o resumo sem dados pessoais", async () => {
    const { repo, order } = await created();
    const found = await repo.getPublic(order.id, order.accessToken);
    expect(found).toMatchObject({
      id: order.id,
      number: order.number,
      status: "awaiting_payment",
      totalCents: 9980 - 998 + 2345,
      shippingCents: 2345,
      pixDiscountCents: 0,
      paymentMethod: "card_single",
    });
    expect(found?.items).toEqual([
      { name: "Camiseta Aeromédico", size: "M", colorName: "Preta", quantity: 2, unitPriceCents: 4990 },
    ]);
    const text = JSON.stringify(found);
    for (const secret of ["maria@exemplo.com", "85999998888", "Rua das Flores", "01018020"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("chave errada e pedido inexistente dão a mesma resposta (null)", async () => {
    const { repo, order } = await created();
    expect(await repo.getPublic(order.id, "chave-errada")).toBeNull();
    expect(await repo.getPublic("id-que-nao-existe", order.accessToken)).toBeNull();
  });

  it("updateFulfillment muda status, rastreio e observação; id desconhecido devolve null", async () => {
    const { repo, order } = await created();
    const updated = await repo.updateFulfillment(order.id, {
      status: "shipped",
      trackingCode: "BR123456789BR",
      notes: "Enviado pelo PAC",
    });
    expect(updated).toMatchObject({ status: "shipped", trackingCode: "BR123456789BR", notes: "Enviado pelo PAC" });
    expect(await repo.updateFulfillment("nada", { status: "delivered" })).toBeNull();
  });
});

describe("mock order repository: ajustes da revisão", () => {
  it("o cupom é contado mesmo com o código do pedido em outra caixa (como o SQL)", async () => {
    const { repo, checkoutId } = await created(setup(), { couponCode: "verao10" });
    await repo.applyEvent(event("e1", "CHECKOUT_PAID", checkoutId));
    expect(repo.inspect().couponUses).toEqual({ VERAO10: 1 });
  });

  it("pagamento que chega depois de o pedido ser cancelado vai para conferência: o dinheiro entrou", async () => {
    const { repo, checkoutId, order } = await created();
    await repo.updateFulfillment(order.id, { status: "canceled" });

    expect(await repo.applyEvent(event("e1", "CHECKOUT_PAID", checkoutId))).toBe("paid_review");
    expect((await repo.getById(order.id))?.status).toBe("paid_review");
    expect((await repo.getById(order.id))?.paidAt).not.toBeNull();
    // Nada é baixado nem contado automaticamente: o dono decide.
    expect(repo.inspect()).toEqual({ stock: { v1: 5 }, couponUses: { VERAO10: 0 } });
  });

  it("pagamento em pedido já enviado continua ignorado", async () => {
    const { repo, checkoutId, order } = await created();
    await repo.applyEvent(event("e1", "CHECKOUT_PAID", checkoutId));
    await repo.updateFulfillment(order.id, { status: "shipped" });
    expect(await repo.applyEvent(event("e2", "CHECKOUT_PAID", checkoutId))).toBe("ignored");
  });

  it("getById devolve um pedido ou null", async () => {
    const { repo, order } = await created();
    expect((await repo.getById(order.id))?.number).toBe(order.number);
    expect(await repo.getById("nao-existe")).toBeNull();
  });

  it("list devolve só os 200 mais recentes", async () => {
    const repo = setup();
    for (let i = 0; i < 205; i += 1) await repo.create(draft({ items: [], subtotalCents: 0, discountCents: 0, totalCents: 2345 }));
    expect(await repo.list()).toHaveLength(200);
  });

  it("o ambiente do pedido é gravado (sandbox) e, sem informar, é produção", async () => {
    const repo = setup();
    const sandbox = await repo.create(draft({ environment: "sandbox" }));
    const normal = await repo.create(draft());
    expect((await repo.getById(sandbox.id))?.environment).toBe("sandbox");
    expect((await repo.getById(normal.id))?.environment).toBe("production");
  });
});
