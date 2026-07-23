import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAuthentication, requireStaffOrAdmin } from "../auth/auth.middleware.js";
import * as controller from "./availability.controller.js";
import { checkAvailabilitySchema, listAvailableResourcesSchema } from "./availability.schemas.js";

export const availabilityRouter = Router();

availabilityRouter.use(requireAuthentication, requireStaffOrAdmin);
availabilityRouter.post(
  "/check",
  validate(checkAvailabilitySchema),
  asyncHandler(controller.check)
);
availabilityRouter.get(
  "/vehicles",
  validate(listAvailableResourcesSchema),
  asyncHandler(controller.vehicles)
);
availabilityRouter.get(
  "/drivers",
  validate(listAvailableResourcesSchema),
  asyncHandler(controller.drivers)
);
availabilityRouter.get(
  "/suggestions",
  validate(listAvailableResourcesSchema),
  asyncHandler(controller.suggestions)
);
