import {
  addLine,
  parseStoredCart,
  removeLine,
  serializeCart,
  setLineQuantity,
  type CartLine,
} from "./cart";

export const CART_STORAGE_KEY = "aeromedico:cart:v1";

// Armazenamento externo (useSyncExternalStore): o servidor sempre enxerga o
// carrinho vazio e o navegador lê o localStorage. Tudo que toca no storage
// está em try/catch: modo privado, cota cheia ou bloqueio não podem derrubar a
// loja. Se a gravação falhar, o carrinho segue valendo em memória nesta aba.
const EMPTY: CartLine[] = [];

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedLines: CartLine[] = EMPTY;
let memoryOnly: CartLine[] | null = null;

function onStorage(event: StorageEvent) {
  if (event.key === CART_STORAGE_KEY || event.key === null) notify();
}

function notify() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(): CartLine[] {
  if (typeof window === "undefined") return EMPTY;
  if (memoryOnly) return memoryOnly;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLines = raw === null ? EMPTY : parseStoredCart(raw);
  }
  return cachedLines;
}

function write(lines: CartLine[]) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(lines));
    memoryOnly = null;
  } catch {
    memoryOnly = lines;
  }
  notify();
}

export const cartStore = {
  subscribe(listener: () => void): () => void {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot,
  getServerSnapshot: (): CartLine[] => EMPTY,
  add(line: CartLine) {
    write(addLine(getSnapshot(), line));
  },
  setQuantity(key: string, quantity: number) {
    write(setLineQuantity(getSnapshot(), key, quantity));
  },
  remove(key: string) {
    write(removeLine(getSnapshot(), key));
  },
  clear() {
    write([]);
  },
};
