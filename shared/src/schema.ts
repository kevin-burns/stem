import { z } from "zod";
import { isValidSlug } from "./slug.js";

const slugField = z.string().refine(isValidSlug, {
  message: "Slug must be 1-64 chars of [A-Za-z0-9_-] and not reserved",
});

const epochSeconds = z.number().int().positive();

export const createLinkSchema = z
  .object({
    url: z.string().url(),
    slug: slugField.optional(),
    expires_at: epochSeconds.nullish(),
    max_clicks: z.number().int().min(1).nullish(),
  })
  .strict();

export const patchLinkSchema = z
  .object({
    expires_at: epochSeconds.nullable().optional(),
    max_clicks: z.number().int().min(1).nullable().optional(),
    disabled: z.boolean().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: "At least one field required" });

export type CreateLinkBody = z.infer<typeof createLinkSchema>;
export type PatchLinkBody = z.infer<typeof patchLinkSchema>;
