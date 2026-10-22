// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getAsaasConfig = vi.fn();
const applyEvent = vi.fn();

vi.mock("@/lib/payments/asaas", () => ({ getAsaasConfig: () => getAsaasConfig() }));
vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({ orders: { applyEvent: (event: unknown) => applyEvent(event) } }),
}));

import { POST } from "../route";

const TOKEN = "t".repeat(40);

function request(body: unknown, headers: Record<string, string> = { "asaas-access-token": TOKEN }) {
  return new Request("http://localhost/api/webhooks/asaas", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const paid = {
  id: "evt_1",
  event: "CHECKOUT_PAID",
  checkout: { id: "chk_1", status: "PAID" },
};

beforeEach(() => {
  vi.clearAllMocks();
  getAsaasConfig.mockReturnValue({ apiKey: "chave", environment: "sandbox", webhookToken: TOKEN });
  applyEvent.mockResolvedValue("paid");
});

afterEach(() => vi.restoreAllMocks());

describe("POST /api/webhooks/asaas", () => {
  it("sem configuração do Asaas: 503 e nada é processado", async () => {
    getAsaasConfig.mockReturnValue(null);
    const response = await POST(request(paid));
    expect(response.status).toBe(503);
    expect(applyEvent).not.toHaveBeenCalled();
  });

  it("token ausente, errado ou de outro tamanho: 401 sem tocar no banco", async () => {
    const wrongHeaders: Record<string, string>[] = [
      {},
      { "asaas-access-token": "errado" },
      { "asaas-access-token": "t".repeat(39) },
      { "asaas-access-token": "t".repeat(41) },
      { "asaas-access-token": "x".repeat(40) },
    ];
    for (const headers of wrongHeaders) {
      const response = await POST(request(paid, headers));
      expect(response.status).toBe(401);
    }
    expect(applyEvent).not.toHaveBeenCalled();
  });

  it("corpo que não é JSON, ou sem id e event: 400", async () => {
    expect((await POST(request("não é json"))).status).toBe(400);
    expect((await POST(request({ event: "CHECKOUT_PAID" }))).status).toBe(400);
    expect((await POST(request({ id: "evt_1" }))).status).toBe(400);
    expect((await POST(request(null))).status).toBe(400);
    expect(applyEvent).not.toHaveBeenCalled();
  });

  it("CHECKOUT_PAID válido: aplica o evento com os campos certos e responde 200", async () => {
    const response = await POST(request(paid));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(applyEvent).toHaveBeenCalledWith({
      eventId: "evt_1",
      type: "CHECKOUT_PAID",
      checkoutId: "chk_1",
      payload: paid,
    });
  });

  it("evento repetido (duplicate) ou ignorado também responde 200", async () => {
    for (const result of ["duplicate", "ignored", "paid_review", "canceled"]) {
      applyEvent.mockResolvedValue(result);
      expect((await POST(request(paid))).status).toBe(200);
    }
  });

  it("evento sem checkout.id (outro tipo de evento): 200 sem chamar o repositório", async () => {
    const response = await POST(request({ id: "evt_2", event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }));
    expect(response.status).toBe(200);
    expect(applyEvent).not.toHaveBeenCalled();
  });

  it("erro do repositório: 500 (para o Asaas tentar de novo) e o token não vai para o log", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    applyEvent.mockRejectedValue(new Error("connection refused"));
    const response = await POST(request(paid));
    expect(response.status).toBe(500);
    expect(JSON.stringify(spy.mock.calls)).not.toContain(TOKEN);
  });
});
