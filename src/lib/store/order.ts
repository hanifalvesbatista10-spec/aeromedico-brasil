export interface Orderable {
  id: string;
  sortOrder: number;
}

/**
 * Troca o item `id` com o vizinho na ordem de exibição e devolve as novas
 * ordens (0 a n-1) só dos itens que mudaram. Exclusões deixam ordens
 * duplicadas ou com buracos, então a lista inteira é renumerada e não apenas
 * os dois trocados. Lista vazia = nada a fazer.
 */
export function reorderBySwap(
  items: Orderable[],
  id: string,
  direction: "up" | "down"
): Orderable[] {
  const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const index = ordered.findIndex((item) => item.id === id);
  const neighbor = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || neighbor < 0 || neighbor >= ordered.length) return [];

  [ordered[index], ordered[neighbor]] = [ordered[neighbor], ordered[index]];

  return ordered
    .map((item, position) => ({ id: item.id, sortOrder: position, changed: item.sortOrder !== position }))
    .filter((entry) => entry.changed)
    .map(({ id: itemId, sortOrder }) => ({ id: itemId, sortOrder }));
}
