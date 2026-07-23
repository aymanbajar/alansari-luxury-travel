import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  requireAdmin,
  requireAuthentication,
  requireStaffOrAdmin
} from "../auth/auth.middleware.js";
import * as controller from "./settings.controller.js";
import { updateOvernightSettingsSchema } from "./settings.schemas.js";

export const settingsRouter = Router();

settingsRouter.get(
  "/overnight",
  requireAuthentication,
  requireStaffOrAdmin,
  asyncHandler(controller.getOvernight)
);
settingsRouter.patch(
  "/overnight",
  requireAuthentication,
  requireAdmin,
  validate(updateOvernightSettingsSchema),
  asyncHandler(controller.updateOvernight)
);
