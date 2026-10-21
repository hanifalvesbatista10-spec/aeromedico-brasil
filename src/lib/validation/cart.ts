import { z } from "zod";
import { MAX_CART_LINES, MAX_ID_LENGTH, MAX_LINE_QUANTITY } from "@/lib/cart/cart";

const id = z.string().min(1).max(MAX_ID_LENGTH);

/** Entrada da Server Action do carrinho: só ids e quantidade, nunca preço. */
export const cartLinesSchema = z
  .array(
    z.object({
      productId: id,
      variantId: id.nullable(),
      quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
    })
  )
  .max(MAX_CART_LINES);
