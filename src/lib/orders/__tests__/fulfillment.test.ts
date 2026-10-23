import { describe, it, expect } from "vitest";
import { checkFulfillmentChange, nextStatuses } from "../fulfillment";
import type { OrderStatus } from "@/lib/types";

const order = (status: OrderStatus, checkoutId: string | null = "chk_1") => ({ status, checkoutId });

describe("nextStatuses", () => {
  it("segue pago → separação → enviado → entregue", () => {
    expect(nextStatuses(order("paid"))).toEqual(["preparing", "canceled"]);
    expect(nextStatuses(order("paid_review"))).toEqual(["preparing", "canceled"]);
    expect(nextStatuses(order("preparing"))).toEqual(["shipped", "canceled"]);
    expect(nextStatuses(order("shipped"))).toEqual(["delivered", "canceled"]);
  });

  it("entregue, cancelado e expirado não mudam à mão", () => {
    for (const status of ["delivered", "canceled", "expired"] as OrderStatus[]) {
      expect(nextStatuses(order(status))).toEqual([]);
    }
  });

  it("aguardando pagamento com checkout aberto não se cancela à mão (o pagamento ainda pode chegar)", () => {
    expect(nextStatuses(order("awaiting_payment", "chk_1"))).toEqual([]);
  });

  it("aguardando pagamento SEM checkout é pedido órfão (nunca poderá ser pago): pode ser cancelado", () => {
    expect(nextStatuses(order("awaiting_payment", null))).toEqual(["canceled"]);
  });
});

describe("checkFulfillmentChange", () => {
  it("aceita uma transição coerente", () => {
    expect(checkFulfillmentChange(order("paid"), { status: "preparing" })).toEqual({
      ok: true,
      patch: { status: "preparing" },
    });
  });

  it("recusa voltar etapa ou pular etapa", () => {
    expect(checkFulfillmentChange(order("delivered"), { status: "preparing" }).ok).toBe(false);
    expect(
      checkFulfillmentChange(order("paid"), { status: "shipped", trackingCode: "AA123456789BR" }).ok
    ).toBe(false);
  });

  it("enviado exige código de rastreio e o normaliza", () => {
    expect(checkFulfillmentChange(order("preparing"), { status: "shipped", trackingCode: "   " })).toEqual({
      ok: false,
      error: "Informe o código de rastreio para marcar como enviado.",
    });
    expect(checkFulfillmentChange(order("preparing"), { status: "shipped" }).ok).toBe(false);

    expect(
      checkFulfillmentChange(order("preparing"), { status: "shipped", trackingCode: " aa123456789br " })
    ).toEqual({ ok: true, patch: { status: "shipped", trackingCode: "AA123456789BR" } });
  });

  it("recusa código de rastreio com símbolos estranhos ou curto demais", () => {
    expect(checkFulfillmentChange(order("preparing"), { status: "shipped", trackingCode: "ab" }).ok).toBe(false);
    expect(
      checkFulfillmentChange(order("preparing"), { status: "shipped", trackingCode: "AB<script>12" }).ok
    ).toBe(false);
  });

  it("cancelar é aceito até enviado, mas não depois de entregue nem em pedido com checkout aberto", () => {
    expect(checkFulfillmentChange(order("shipped"), { status: "canceled" }).ok).toBe(true);
    expect(checkFulfillmentChange(order("delivered"), { status: "canceled" }).ok).toBe(false);
    expect(checkFulfillmentChange(order("awaiting_payment"), { status: "canceled" }).ok).toBe(false);
  });

  it("pedido órfão pode ser cancelado", () => {
    expect(checkFulfillmentChange(order("awaiting_payment", null), { status: "canceled" })).toEqual({
      ok: true,
      patch: { status: "canceled" },
    });
  });

  it("não leva código de rastreio junto de outro andamento", () => {
    expect(
      checkFulfillmentChange(order("paid"), { status: "preparing", trackingCode: "AA123456789BR" })
    ).toEqual({ ok: true, patch: { status: "preparing" } });
  });
});
