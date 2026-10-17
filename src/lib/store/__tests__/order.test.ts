import { describe, it, expect } from "vitest";
import { reorderBySwap } from "../order";

const item = (id: string, sortOrder: number) => ({ id, sortOrder });

describe("reorderBySwap", () => {
  it("troca com o vizinho e devolve só as ordens que mudaram", () => {
    const changes = reorderBySwap([item("a", 0), item("b", 1), item("c", 2)], "a", "down");
    expect(changes).toEqual([
      { id: "b", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
    ]);
  });

  it("renumera quando há ordens duplicadas ou com buraco", () => {
    const changes = reorderBySwap([item("a", 0), item("b", 2), item("c", 2)], "a", "down");
    expect(Object.fromEntries(changes.map((c) => [c.id, c.sortOrder]))).toEqual({ b: 0, a: 1 });
  });

  it("não depende da ordem em que a lista chega", () => {
    const changes = reorderBySwap([item("c", 2), item("a", 0), item("b", 1)], "c", "up");
    expect(Object.fromEntries(changes.map((c) => [c.id, c.sortOrder]))).toEqual({ c: 1, b: 2 });
  });

  it("devolve lista vazia para primeiro subindo, último descendo e id desconhecido", () => {
    const list = [item("a", 0), item("b", 1)];
    expect(reorderBySwap(list, "a", "up")).toEqual([]);
    expect(reorderBySwap(list, "b", "down")).toEqual([]);
    expect(reorderBySwap(list, "x", "down")).toEqual([]);
  });

  it("não altera a lista recebida", () => {
    const list = [item("a", 0), item("b", 1)];
    reorderBySwap(list, "a", "down");
    expect(list).toEqual([item("a", 0), item("b", 1)]);
  });
});
