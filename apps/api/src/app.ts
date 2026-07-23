import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "node:crypto";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { csrfProtection } from "./middleware/csrf.js";
import { generalRateLimiter } from "./middleware/rate-limit.js";
import { metricsMiddleware } from "./lib/metrics.js";
import { availabilityRouter } from "./modules/availability/availability.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { bookingRouter } from "./modules/bookings/booking.routes.js";
import { customerRouter } from "./modules/customers/customer.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { driverRouter } from "./modules/drivers/driver.routes.js";
import { reportRouter } from "./modules/reports/report.routes.js";
import { settingsRouter } from "./modules/settings/settings.routes.js";
import { userRouter } from "./modules/users/user.routes.js";
import { vehicleRouter } from "./modules/vehicles/vehicle.routes.js";
import { healthRouter } from "./routes/health.routes.js";

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incomingId = req.headers["x-request-id"];
        const requestId =
          typeof incomingId === "string" && incomingId.length <= 128
            ? incomingId
            : crypto.randomUUID();
        res.setHeader("x-request-id", requestId);
        return requestId;
      },
      redact: {
        paths: [
          "req.headers.cookie",
          "req.headers.authorization",
          "res.headers.set-cookie",
          "req.body.password",
          "req.body.currentPassword",
          "req.body.newPassword"
        ],
        censor: "[redacted]"
      }
    })
  );
  app.use(metricsMiddleware);
  app.use(generalRateLimiter);
  app.use(csrfProtection);

  app.use("/api", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/availability", availabilityRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/vehicles", vehicleRouter);
  app.use("/api/drivers", driverRouter);
  app.use("/api/customers", customerRouter);
  app.use("/api/bookings", bookingRouter);
  app.use("/api/reports", reportRouter);
  app.use("/api/settings", settingsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
