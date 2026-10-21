// Contrato do frete: a loja só conhece estas formas; o fornecedor (hoje o
// Melhor Envio) fica atrás de `ShippingProvider` e pode ser trocado.

export interface ShippingItem {
  /** Chave da linha do carrinho. */
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  /** Peso de UMA unidade embalada; a variação sobrepõe o do produto. */
  weightGrams: number;
  /** Valor declarado por unidade (preço de venda). */
  unitPriceCents: number;
  quantity: number;
}

export interface ShippingOption {
  id: string;
  name: string;
  company: string;
  priceCents: number;
  /** Prazo em dias úteis; `null` quando o fornecedor não informa. */
  deliveryDays: number | null;
}

export type ShippingQuoteResult =
  | { ok: true; options: ShippingOption[] }
  | { ok: false; reason: "invalid-cep" | "unavailable" };

export interface ShippingProvider {
  quote(input: {
    /** CEP de destino, 8 dígitos. */
    destinationCep: string;
    items: ShippingItem[];
  }): Promise<ShippingQuoteResult>;
}
