import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  requireAdmin,
  requireAuthentication,
  requireStaffOrAdmin
} from "../auth/auth.middleware.js";
import {
  createVehicleSchema,
  listVehiclesSchema,
  updateVehicleSchema,
  updateVehicleStatusSchema,
  vehicleIdParamsSchema
} from "./vehicle.schemas.js";
import * as controller from "./vehicle.controller.js";

export const vehicleRouter = Router();

vehicleRouter.get(
  "/",
  requireAuthentication,
  requireStaffOrAdmin,
  validate(listVehiclesSchema),
  asyncHandler(controller.list)
);
vehicleRouter.post(
  "/",
  requireAuthentication,
  requireAdmin,
  validate(createVehicleSchema),
  asyncHandler(controller.create)
);
vehicleRouter.get(
  "/:id",
  requireAuthentication,
  requireStaffOrAdmin,
  validate(vehicleIdParamsSchema),
  asyncHandler(controller.get)
);
vehicleRouter.patch(
  "/:id",
  requireAuthentication,
  requireAdmin,
  validate(updateVehicleSchema),
  asyncHandler(controller.update)
);
vehicleRouter.patch(
  "/:id/status",
  requireAuthentication,
  requireAdmin,
  validate(updateVehicleStatusSchema),
  asyncHandler(controller.updateStatus)
);
vehicleRouter.delete(
  "/:id",
  requireAuthentication,
  requireAdmin,
  validate(vehicleIdParamsSchema),
  asyncHandler(controller.remove)
);
