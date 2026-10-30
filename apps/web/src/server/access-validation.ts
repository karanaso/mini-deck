import { z } from "zod";

export const pinBodySchema = z
  .object({
    pin: z.string().trim().regex(/^\d{6}$/u),
  })
  .strict();

export const joinLookupBodySchema = z
  .object({
    code: z.string().trim().regex(/^\d{7}$/u),
  })
  .strict();

export const joinUnlockBodySchema = z
  .object({
    code: z.string().trim().regex(/^\d{7}$/u),
    role: z.enum(["editor", "viewer"]),
    pin: z.string().trim().regex(/^\d{6}$/u),
  })
  .strict();
