import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { validate } from "../../middleware/validate.js";
import { requireAdmin, requireAuthentication } from "../auth/auth.middleware.js";
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdParamsSchema
} from "./user.schemas.js";
import * as controller from "./user.controller.js";

export const userRouter = Router();

userRouter.use(requireAuthentication, requireAdmin);

userRouter.get("/", asyncHandler(controller.list));
userRouter.post("/", validate(createUserSchema), asyncHandler(controller.create));
userRouter.get("/:id", validate(userIdParamsSchema), asyncHandler(controller.get));
userRouter.patch("/:id", validate(updateUserSchema), asyncHandler(controller.update));
userRouter.patch(
  "/:id/status",
  validate(updateUserStatusSchema),
  asyncHandler(controller.updateStatus)
);
userRouter.post(
  "/:id/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(controller.resetPassword)
);
