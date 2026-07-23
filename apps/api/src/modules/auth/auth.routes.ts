import rateLimit from "express-rate-limit";
import { Router } from "express";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { validate } from "../../middleware/validate.js";
import { requireAuthentication } from "./auth.middleware.js";
import { changePasswordSchema, loginSchema } from "./auth.schemas.js";
import * as controller from "./auth.controller.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit:
    env.NODE_ENV === "development"
      ? Math.max(env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS, 100)
      : env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "تم تجاوز عدد محاولات تسجيل الدخول. حاول لاحقاً."
    }
  }
});

authRouter.post("/login", loginLimiter, validate(loginSchema), asyncHandler(controller.login));
authRouter.post("/refresh", asyncHandler(controller.refresh));
authRouter.post("/logout", requireAuthentication, asyncHandler(controller.logout));
authRouter.get("/me", requireAuthentication, asyncHandler(controller.me));
authRouter.post(
  "/change-password",
  requireAuthentication,
  validate(changePasswordSchema),
  asyncHandler(controller.changePassword)
);
