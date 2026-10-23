import { describe, it, expect } from "vitest";
import { checkFulfillmentChange, nextStatuses } from "../fulfillment";
import type { OrderStatus } from "@/lib/types";

describe("nextStatuses", () => {
  it("segue pago → separação → enviado → entregue", () => {
    expect(nextStatuses("paid")).toEqual(["preparing", "canceled"]);
    expect(nextStatuses("paid_review")).toEqual(["preparing", "canceled"]);
    expect(nextStatuses("preparing")).toEqual(["shipped", "canceled"]);
    expect(nextStatuses("shipped")).toEqual(["delivered", "canceled"]);
  });

  it("entregue, cancelado, expirado e aguardando pagamento não mudam à mão", () => {
    for (const status of ["delivered", "canceled", "expired", "awaiting_payment"] as OrderStatus[]) {
      expect(nextStatuses(status)).toEqual([]);
    }
  });
});

describe("checkFulfillmentChange", () => {
  it("aceita uma transição coerente", () => {
    expect(checkFulfillmentChange("paid", { status: "preparing" })).toEqual({
      ok: true,
      patch: { status: "preparing" },
    });
  });

  it("recusa voltar etapa ou pular etapa", () => {
    expect(checkFulfillmentChange("delivered", { status: "preparing" }).ok).toBe(false);
    expect(checkFulfillmentChange("paid", { status: "shipped", trackingCode: "AA123456789BR" }).ok).toBe(false);
  });

  it("enviado exige código de rastreio e o normaliza", () => {
    expect(checkFulfillmentChange("preparing", { status: "shipped", trackingCode: "   " })).toEqual({
      ok: false,
      error: "Informe o código de rastreio para marcar como enviado.",
    });
    expect(checkFulfillmentChange("preparing", { status: "shipped" }).ok).toBe(false);

    expect(checkFulfillmentChange("preparing", { status: "shipped", trackingCode: " aa123456789br " })).toEqual({
      ok: true,
      patch: { status: "shipped", trackingCode: "AA123456789BR" },
    });
  });

  it("recusa código de rastreio com símbolos estranhos ou curto demais", () => {
    expect(checkFulfillmentChange("preparing", { status: "shipped", trackingCode: "ab" }).ok).toBe(false);
    expect(checkFulfillmentChange("preparing", { status: "shipped", trackingCode: "AB<script>12" }).ok).toBe(false);
  });

  it("cancelar é aceito até enviado, mas não depois de entregue nem em pedido sem pagamento", () => {
    expect(checkFulfillmentChange("shipped", { status: "canceled" }).ok).toBe(true);
    expect(checkFulfillmentChange("delivered", { status: "canceled" }).ok).toBe(false);
    expect(checkFulfillmentChange("awaiting_payment", { status: "canceled" }).ok).toBe(false);
  });

  it("não leva código de rastreio junto de outro andamento", () => {
    expect(checkFulfillmentChange("paid", { status: "preparing", trackingCode: "AA123456789BR" })).toEqual({
      ok: true,
      patch: { status: "preparing" },
    });
  });
});
