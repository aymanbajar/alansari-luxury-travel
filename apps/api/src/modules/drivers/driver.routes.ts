import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  requireAdmin,
  requireAuthentication,
  requireStaffOrAdmin
} from "../auth/auth.middleware.js";
import {
  createDriverSchema,
  driverIdParamsSchema,
  listDriversSchema,
  updateDriverSchema,
  updateDriverStatusSchema
} from "./driver.schemas.js";
import * as controller from "./driver.controller.js";

export const driverRouter = Router();

driverRouter.get(
  "/",
  requireAuthentication,
  requireStaffOrAdmin,
  validate(listDriversSchema),
  asyncHandler(controller.list)
);
driverRouter.post(
  "/",
  requireAuthentication,
  requireAdmin,
  validate(createDriverSchema),
  asyncHandler(controller.create)
);
driverRouter.get(
  "/:id",
  requireAuthentication,
  requireStaffOrAdmin,
  validate(driverIdParamsSchema),
  asyncHandler(controller.get)
);
driverRouter.patch(
  "/:id",
  requireAuthentication,
  requireAdmin,
  validate(updateDriverSchema),
  asyncHandler(controller.update)
);
driverRouter.patch(
  "/:id/status",
  requireAuthentication,
  requireAdmin,
  validate(updateDriverStatusSchema),
  asyncHandler(controller.updateStatus)
);
driverRouter.delete(
  "/:id",
  requireAuthentication,
  requireAdmin,
  validate(driverIdParamsSchema),
  asyncHandler(controller.remove)
);
