import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const saveStoreProductBundle = vi.fn();
vi.mock("@/lib/actions/store", () => ({
  saveStoreProductBundle: (...args: unknown[]) => saveStoreProductBundle(...args),
}));

import { StoreProductDialog } from "../store-product-dialog";
import type { StoreProductDetail } from "@/lib/repositories/types";

const savedDetail: StoreProductDetail = {
  product: {
    id: "novo",
    slug: "camiseta",
    categoryId: null,
    name: "Camiseta",
    description: "",
    basePriceCents: 4990,
    weightGrams: 200,
    lengthCm: 30,
    widthCm: 25,
    heightCm: 3,
    hasVariants: false,
    featured: false,
    published: false,
    sortOrder: 0,
    seoTitle: null,
    seoDescription: null,
  },
  variants: [],
  images: [],
};

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function renderNew() {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(<StoreProductDialog categories={[]} detail={null} onSaved={onSaved} onClose={onClose} />);
  fill("Nome", "Camiseta");
  fill("Preço (R$)", "49,90");
  fill("Peso (g)", "200");
  fill("Comprimento (cm)", "30");
  fill("Largura (cm)", "25");
  fill("Altura (cm)", "3");
  return { onSaved, onClose };
}

const save = () => fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("StoreProductDialog", () => {
  it("envia produto, variações e fotos numa única chamada, sem id ao criar", async () => {
    saveStoreProductBundle.mockResolvedValue({ ok: true, detail: savedDetail });
    const { onSaved, onClose } = renderNew();

    save();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(saveStoreProductBundle).toHaveBeenCalledTimes(1);
    const input = saveStoreProductBundle.mock.calls[0][0];
    expect(input.id).toBeUndefined();
    expect(input.product).toMatchObject({ name: "Camiseta", price: "49,90", weightGrams: "200" });
    expect(input.variants).toEqual([]);
    expect(input.images).toEqual([]);
    expect(onSaved).toHaveBeenCalledWith(savedDetail);
  });

  it("mostra a mensagem de erro do servidor e mantém o diálogo aberto", async () => {
    saveStoreProductBundle.mockResolvedValue({
      ok: false,
      error: "Informe um preço válido, por exemplo 49,90.",
      detail: null,
    });
    const { onSaved, onClose } = renderNew();

    save();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Informe um preço válido, por exemplo 49,90."
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("falha pela metade: sincroniza o painel com o estado real e o próximo Salvar atualiza o MESMO produto", async () => {
    saveStoreProductBundle.mockResolvedValueOnce({
      ok: false,
      error: "Falha ao salvar variações: timeout",
      detail: savedDetail,
    });
    const { onSaved, onClose } = renderNew();

    save();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Falha ao salvar variações: timeout"
    );
    expect(onSaved).toHaveBeenCalledWith(savedDetail);
    expect(onClose).not.toHaveBeenCalled();

    saveStoreProductBundle.mockResolvedValueOnce({ ok: true, detail: savedDetail });
    save();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(saveStoreProductBundle).toHaveBeenCalledTimes(2);
    expect(saveStoreProductBundle.mock.calls[1][0].id).toBe("novo");
  });

  it("falha inesperada da ação (ex.: sessão expirada) mostra uma mensagem em português", async () => {
    saveStoreProductBundle.mockRejectedValue(new Error("An error occurred in the Server Components render."));
    const { onClose } = renderNew();

    save();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Não foi possível salvar agora. Atualize a página e tente de novo."
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
