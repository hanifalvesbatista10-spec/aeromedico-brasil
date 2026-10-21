import { describe, it, expect, vi, beforeEach } from "vitest";

const requireAdmin = vi.fn();
const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/auth/admin-guard", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({ coupons: { create, update, remove } }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

import { deleteStoreCoupon, saveStoreCoupon, toggleStoreCouponActive } from "../coupons";
import { DUPLICATE_COUPON_MESSAGE } from "@/lib/repositories/types";

const input = {
  code: "verao10",
  kind: "percent" as const,
  value: "10",
  minOrder: "",
  startsAt: "",
  expiresAt: "",
  maxUses: "",
  usesCount: "",
  active: true,
};

const saved = {
  id: "c1",
  code: "VERAO10",
  kind: "percent" as const,
  value: 10,
  minOrderCents: 0,
  startsAt: null,
  expiresAt: null,
  maxUses: null,
  usesCount: 0,
  active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue(undefined);
  create.mockImplementation(async (data) => ({ id: "c1", ...data }));
  update.mockImplementation(async (id, patch) => ({ ...saved, ...patch, id }));
});

describe("saveStoreCoupon", () => {
  it("sem administrador: rejeita e não toca no repositório", async () => {
    requireAdmin.mockRejectedValue(new Error("Sessão administrativa não encontrada."));
    await expect(saveStoreCoupon(input)).rejects.toThrow("Sessão administrativa");
    expect(create).not.toHaveBeenCalled();
  });

  it("entrada inválida volta como valor e nada é gravado", async () => {
    const result = await saveStoreCoupon({ ...input, value: "500" });
    expect(result).toEqual({ ok: false, error: "Informe um percentual entre 1 e 100." });
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("cria com o código normalizado", async () => {
    const result = await saveStoreCoupon(input);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ code: "VERAO10", value: 10 }));
    expect(result).toEqual({ ok: true, data: saved });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/cupons");
  });

  it("edita quando há id", async () => {
    const result = await saveStoreCoupon({ ...input, id: "c1", value: "20" });
    expect(update).toHaveBeenCalledWith("c1", expect.objectContaining({ value: 20 }));
    expect(create).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it("cupom que não existe mais: mensagem, sem lançar", async () => {
    update.mockResolvedValue(null);
    expect(await saveStoreCoupon({ ...input, id: "sumiu" })).toEqual({
      ok: false,
      error: "Cupom não encontrado.",
    });
  });

  it("código repetido volta como mensagem", async () => {
    create.mockRejectedValue(new Error(DUPLICATE_COUPON_MESSAGE));
    expect(await saveStoreCoupon(input)).toEqual({ ok: false, error: DUPLICATE_COUPON_MESSAGE });
  });
});

describe("toggleStoreCouponActive e deleteStoreCoupon", () => {
  it("exigem administrador", async () => {
    requireAdmin.mockRejectedValue(new Error("Sessão administrativa não encontrada."));
    await expect(toggleStoreCouponActive("c1", false)).rejects.toThrow("Sessão administrativa");
    await expect(deleteStoreCoupon("c1")).rejects.toThrow("Sessão administrativa");
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("ativar/desativar atualiza só o campo e revalida", async () => {
    const result = await toggleStoreCouponActive("c1", false);
    expect(update).toHaveBeenCalledWith("c1", { active: false });
    expect(result?.active).toBe(false);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/cupons");
  });

  it("excluir remove e revalida", async () => {
    await deleteStoreCoupon("c1");
    expect(remove).toHaveBeenCalledWith("c1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/cupons");
  });
});
