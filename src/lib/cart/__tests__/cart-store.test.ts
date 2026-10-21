import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const KEY = "aeromedico:cart:v1";
const line = (variantId: string | null = "v1", quantity = 1) => ({
  productId: "p1",
  variantId,
  quantity,
});

// O store guarda estado no módulo: cada teste carrega uma cópia limpa.
async function loadStore() {
  vi.resetModules();
  return (await import("../cart-store")).cartStore;
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("cartStore", () => {
  it("começa vazio e usa a chave versionada", async () => {
    const store = await loadStore();
    expect(store.getSnapshot()).toEqual([]);
    expect((await import("../cart-store")).CART_STORAGE_KEY).toBe(KEY);
  });

  it("add grava no localStorage e notifica os ouvintes", async () => {
    const store = await loadStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.add(line());

    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual([line()]);
    expect(store.getSnapshot()).toEqual([line()]);
  });

  it("getSnapshot devolve a mesma referência enquanto nada muda", async () => {
    const store = await loadStore();
    store.add(line());
    expect(store.getSnapshot()).toBe(store.getSnapshot());
    expect(store.getServerSnapshot()).toBe(store.getServerSnapshot());
  });

  it("setQuantity, remove e clear", async () => {
    const store = await loadStore();
    store.add(line("v1", 1));
    store.add(line("v2", 1));
    store.setQuantity("p1:v1", 4);
    expect(store.getSnapshot()[0].quantity).toBe(4);
    store.remove("p1:v2");
    expect(store.getSnapshot()).toHaveLength(1);
    store.clear();
    expect(store.getSnapshot()).toEqual([]);
  });

  it("conteúdo corrompido no localStorage vira carrinho vazio sem lançar", async () => {
    window.localStorage.setItem(KEY, "{isso não é json");
    const store = await loadStore();
    expect(store.getSnapshot()).toEqual([]);
  });

  it("leitura do localStorage que lança vira carrinho vazio", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    const store = await loadStore();
    expect(store.getSnapshot()).toEqual([]);
  });

  it("gravação que lança não quebra: o carrinho segue funcionando em memória", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("cota excedida");
    });
    const store = await loadStore();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(() => store.add(line())).not.toThrow();
    expect(store.getSnapshot()).toEqual([line()]);
    store.add(line());
    expect(store.getSnapshot()).toEqual([line("v1", 2)]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("evento storage da mesma chave (outra aba) notifica; de outra chave não", async () => {
    const store = await loadStore();
    const listener = vi.fn();
    store.subscribe(listener);

    window.localStorage.setItem(KEY, JSON.stringify([line("v9", 2)]));
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual([line("v9", 2)]);

    window.dispatchEvent(new StorageEvent("storage", { key: "outra-coisa" }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe para de notificar e solta o evento storage ao sair o último", async () => {
    const store = await loadStore();
    const remove = vi.spyOn(window, "removeEventListener");
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));

    expect(listener).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith("storage", expect.any(Function));
  });
});
