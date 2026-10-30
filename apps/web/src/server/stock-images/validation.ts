import { z } from "zod";

import {
  STOCK_ORIENTATIONS,
  STOCK_PROVIDERS,
} from "@/lib/stock-images";

export const stockSearchQuerySchema = z.object({
  provider: z.enum(STOCK_PROVIDERS),
  q: z.string().trim().min(1).max(100),
  page: z.coerce.number().int().min(1).max(50).default(1),
  orientation: z.enum(STOCK_ORIENTATIONS).default("landscape"),
});

export const stockImportBodySchema = z
  .object({
    provider: z.enum(STOCK_PROVIDERS),
    photoId: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(
        /^[A-Za-z0-9_-]+$/u,
        "A provider photo identifier is required, not a URL",
      ),
  })
  .strict();

export type StockSearchQuery = z.infer<typeof stockSearchQuerySchema>;
export type StockImportBody = z.infer<typeof stockImportBodySchema>;
