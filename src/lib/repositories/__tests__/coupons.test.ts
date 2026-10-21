import { describe, it, expect } from "vitest";
import { createMockCouponRepository } from "../mock/coupons";
import { DUPLICATE_COUPON_MESSAGE } from "../types";
import type { StoreCoupon } from "@/lib/types";

function newCoupon(over: Partial<Omit<StoreCoupon, "id">> = {}): Omit<StoreCoupon, "id"> {
  return {
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

describe("mock coupon repository", () => {
  it("começa vazio", async () => {
    expect(await createMockCouponRepository().list()).toEqual([]);
  });

  it("cria um cupom e devolve com id", async () => {
    const repo = createMockCouponRepository();
    const created = await repo.create(newCoupon());
    expect(created.id).toBeTruthy();
    expect(await repo.list()).toEqual([created]);
  });

  it("rejeita código repetido sem diferenciar maiúsculas", async () => {
    const repo = createMockCouponRepository();
    await repo.create(newCoupon({ code: "VERAO10" }));
    await expect(repo.create(newCoupon({ code: "verao10" }))).rejects.toThrow(
      DUPLICATE_COUPON_MESSAGE
    );
  });

  it("atualiza um cupom e devolve null para id desconhecido", async () => {
    const repo = createMockCouponRepository();
    const created = await repo.create(newCoupon());
    const updated = await repo.update(created.id, { value: 15, active: false });
    expect(updated).toMatchObject({ value: 15, active: false, code: "VERAO10" });
    expect(await repo.update("inexistente", { value: 1 })).toBeNull();
  });

  it("trocar o código para um já usado por outro cupom é rejeitado", async () => {
    const repo = createMockCouponRepository();
    await repo.create(newCoupon({ code: "A" }));
    const b = await repo.create(newCoupon({ code: "B" }));
    await expect(repo.update(b.id, { code: "a" })).rejects.toThrow(DUPLICATE_COUPON_MESSAGE);
  });

  it("remove o cupom", async () => {
    const repo = createMockCouponRepository();
    const created = await repo.create(newCoupon());
    await repo.remove(created.id);
    expect(await repo.list()).toEqual([]);
  });

  it("findActiveByCode ignora maiúsculas e espaços nas pontas", async () => {
    const repo = createMockCouponRepository();
    const created = await repo.create(newCoupon());
    expect(await repo.findActiveByCode("  verao10 ")).toEqual(created);
  });

  it("findActiveByCode devolve null para cupom inativo ou inexistente (mesma resposta)", async () => {
    const repo = createMockCouponRepository();
    await repo.create(newCoupon({ code: "OFF", active: false }));
    expect(await repo.findActiveByCode("OFF")).toBeNull();
    expect(await repo.findActiveByCode("NAOEXISTE")).toBeNull();
  });

  it("list ordena por código", async () => {
    const repo = createMockCouponRepository();
    await repo.create(newCoupon({ code: "B" }));
    await repo.create(newCoupon({ code: "A" }));
    expect((await repo.list()).map((c) => c.code)).toEqual(["A", "B"]);
  });
});
