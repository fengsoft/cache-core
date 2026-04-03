import { z } from "zod";

export const invalidateRequestSchema = z
  .object({
    namespace: z.string().min(1),
    tenantId: z.string().min(1).optional(),
    key: z.string().min(1).optional(),
    tag: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.key || value.tag), {
    message: "Either key or tag must be provided.",
    path: ["key"],
  });

export type InvalidateRequest = z.infer<typeof invalidateRequestSchema>;

export const warmRequestSchema = z.object({
  namespace: z.string().min(1),
  tenantId: z.string().min(1).optional(),
  keys: z.array(z.string().min(1)).min(1),
});

export type WarmRequest = z.infer<typeof warmRequestSchema>;

export const apiErrorCodeSchema = z.enum([
  "invalid_request",
  "unauthorized",
  "not_found",
  "conflict",
  "internal_error",
]);

export const apiErrorSchema = z.object({
  requestId: z.string().min(1),
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
