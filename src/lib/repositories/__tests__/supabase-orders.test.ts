import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_PAYMENT_TERMS } from "@/lib/payments/terms";

// Repositórios do Supabase contra um cliente de mentira: o que importa aqui é o
// que acontece quando o BANCO FALHA (nunca virar "pedido não existe" nem "taxas
// padrão") e que a lista do painel é limitada.

const rpc = vi.fn();
const limit = vi.fn();
const maybeSingle = vi.fn();
const order = vi.fn();
const eq = vi.fn();
const select = vi.fn();

function chain() {
  const builder = {
    select: (...args: unknown[]) => {
      select(...args);
      return builder;
    },
    order: (...args: unknown[]) => {
      order(...args);
      return builder;
    },
    eq: (...args: unknown[]) => {
      eq(...args);
      return builder;
    },
    limit: (n: number) => limit(n),
    maybeSingle: () => maybeSingle(),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc: (...args: unknown[]) => rpc(...args), from: () => chain() }),
}));

import { createSupabaseOrderRepository } from "../supabase/orders";
import { createSupabasePaymentSettingsRepository } from "../supabase/payment-settings";

const ID = "11111111-2222-4333-8444-555555555555";

const row = {
  id: ID,
  number: 7,
  access_token: "t",
  status: "paid",
  environment: "production",
  customer_name: "Maria",
  customer_email: "maria@exemplo.com",
  customer_phone: "85999998888",
  ship_cep: "01018020",
  ship_street: "Rua A",
  ship_number: "10",
  ship_complement: null,
  ship_district: "Centro",
  ship_city: "São Paulo",
  ship_state: "SP",
  ship_option_id: "1",
  ship_label: "Correios PAC",
  subtotal_cents: 2000,
  discount_cents: 0,
  coupon_code: null,
  shipping_cents: 2345,
  fee_cents: 199,
  total_cents: 4544,
  payment_method: "pix",
  asaas_checkout_id: "chk",
  asaas_checkout_url: "https://x",
  tracking_code: null,
  notes: null,
  created_at: "2026-10-22T10:00:00Z",
  paid_at: "2026-10-22T10:05:00Z",
  updated_at: "2026-10-22T10:05:00Z",
  store_order_items: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("repositório Supabase de pedidos", () => {
  it("getPublic: erro do banco é lançado (a página mostra 'não foi possível carregar'), não vira 404", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "connection reset" } });
    await expect(createSupabaseOrderRepository().getPublic(ID, "chave")).rejects.toThrow();
  });

  it("getPublic: pedido ou chave que não existem continuam dando null", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await createSupabaseOrderRepository().getPublic(ID, "chave")).toBeNull();
    // Id que nem é UUID nunca chega ao banco.
    rpc.mockClear();
    expect(await createSupabaseOrderRepository().getPublic("abc", "chave")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("list: traz só os pedidos mais recentes (o painel não carrega a tabela inteira)", async () => {
    limit.mockResolvedValue({ data: [row], error: null });
    const orders = await createSupabaseOrderRepository().list();
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(200);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ id: ID, number: 7, environment: "production" });
  });

  it("list: erro do banco é lançado", async () => {
    limit.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(createSupabaseOrderRepository().list()).rejects.toThrow();
  });

  it("getById: busca um pedido pelo id", async () => {
    maybeSingle.mockResolvedValue({ data: row, error: null });
    const found = await createSupabaseOrderRepository().getById(ID);
    expect(eq).toHaveBeenCalledWith("id", ID);
    expect(found).toMatchObject({ id: ID, number: 7 });
  });

  it("getById: sem pedido dá null; id que não é UUID nem consulta; erro do banco é lançado", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await createSupabaseOrderRepository().getById(ID)).toBeNull();

    maybeSingle.mockClear();
    expect(await createSupabaseOrderRepository().getById("abc")).toBeNull();
    expect(maybeSingle).not.toHaveBeenCalled();

    maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(createSupabaseOrderRepository().getById(ID)).rejects.toThrow();
  });
});

describe("repositório Supabase das taxas", () => {
  it("tabela que ainda não existe (migration não aplicada): valores padrão", async () => {
    for (const code of ["42P01", "PGRST205"]) {
      maybeSingle.mockResolvedValue({ data: null, error: { code, message: "tabela não existe" } });
      expect(await createSupabasePaymentSettingsRepository().get()).toEqual(DEFAULT_PAYMENT_TERMS);
    }
  });

  it("qualquer outra falha do banco é lançada: nunca usa taxa padrão em silêncio", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { code: "57P03", message: "banco indisponível" } });
    await expect(createSupabasePaymentSettingsRepository().get()).rejects.toThrow();
  });

  it("lê a linha gravada (desconto do Pix e parcelas)", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: true,
        pix_discount_bp: 800,
        max_installments: 4,
        updated_at: "2026-10-22T10:00:00Z",
      },
      error: null,
    });
    const terms = await createSupabasePaymentSettingsRepository().get();
    expect(terms).toEqual({ pixDiscountBp: 800, maxInstallments: 4 });
  });
});
