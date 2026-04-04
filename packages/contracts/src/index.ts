import { z } from "zod";

export const cacheMetricSnapshotSchema = z.object({
  hits: z.number().int().nonnegative(),
  misses: z.number().int().nonnegative(),
  sets: z.number().int().nonnegative(),
  deletes: z.number().int().nonnegative(),
  invalidations: z.number().int().nonnegative(),
  remembers: z.number().int().nonnegative(),
  averageLoadMs: z.number().nonnegative(),
});

export const invalidationEventSchema = z.object({
  id: z.string().min(1),
  namespace: z.string().min(1),
  tenantId: z.string().min(1).optional(),
  kind: z.enum(["key", "tag"]),
  target: z.string().min(1),
  createdAt: z.string().datetime(),
});

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

export const healthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string().min(1),
  uptimeSeconds: z.number().int().nonnegative(),
});

export const readinessResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string().min(1),
  checks: z.object({
    invalidationsBuffered: z.number().int().nonnegative(),
    warmRequests: z.number().int().nonnegative(),
  }),
});

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
