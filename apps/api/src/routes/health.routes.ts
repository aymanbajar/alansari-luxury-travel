import { Router } from "express";
import type { HealthResponse } from "@alansari/shared";
import { ok } from "../lib/api-response.js";
import { prisma } from "../lib/prisma.js";
import { renderMetrics } from "../lib/metrics.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  const data: HealthResponse = {
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString()
  };

  return ok(res, data);
});

healthRouter.get("/ready", async (_req, res) => {
  const checkedAt = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok(res, {
      status: "ready",
      service: "api",
      timestamp: checkedAt,
      checks: {
        database: "ok"
      }
    });
  } catch {
    return res.status(503).json({
      success: false,
      error: {
        code: "NOT_READY",
        message: "Service is not ready.",
        details: {
          timestamp: checkedAt,
          checks: {
            database: "failed"
          }
        }
      }
    });
  }
});

healthRouter.get("/metrics", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  return res.send(renderMetrics());
});
