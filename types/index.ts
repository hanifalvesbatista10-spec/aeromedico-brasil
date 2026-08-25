export type Course = { id: string; title: string; description: string; price: number; badge?: string; duration: string; format: string; checkoutUrl?: string; featured?: boolean };
export type Material = { id: string; title: string; description: string; format: "PDF" | "E-book" | "Checklist"; pages: number };
