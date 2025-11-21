import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

const HealthCheckResponseSchema = z.object({
  status: z.enum(["healthy", "unhealthy", "degraded"]),
  service: z.string(),
  version: z.string(),
  timestamp: z.string(),
  uptime: z.number(),
});

export const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check endpoint",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: HealthCheckResponseSchema,
        },
      },
    },
  },
});
