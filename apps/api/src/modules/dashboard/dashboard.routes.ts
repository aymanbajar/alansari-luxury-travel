import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAuthentication, requireStaffOrAdmin } from "../auth/auth.middleware.js";
import * as controller from "./dashboard.controller.js";
import { dashboardSummarySchema, dashboardTimelineSchema } from "./dashboard.schemas.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuthentication, requireStaffOrAdmin);
dashboardRouter.get("/summary", validate(dashboardSummarySchema), asyncHandler(controller.summary));
dashboardRouter.get(
  "/timeline",
  validate(dashboardTimelineSchema),
  asyncHandler(controller.timeline)
);
