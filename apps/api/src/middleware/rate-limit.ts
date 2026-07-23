import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const generalRateLimiter = rateLimit({
  windowMs: env.GENERAL_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: env.GENERAL_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "تم تجاوز الحد المسموح من الطلبات. حاول لاحقاً."
    }
  }
});
