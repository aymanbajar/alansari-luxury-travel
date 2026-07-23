import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAuthentication, requireStaffOrAdmin } from "../auth/auth.middleware.js";
import * as controller from "./report.controller.js";
import { reportExportSchema, reportPreviewSchema } from "./report.schemas.js";

export const reportRouter = Router();

reportRouter.use(requireAuthentication, requireStaffOrAdmin);
reportRouter.get("/", asyncHandler(controller.definitions));
reportRouter.get("/:type", validate(reportPreviewSchema), asyncHandler(controller.preview));
reportRouter.get(
  "/:type/export",
  validate(reportExportSchema),
  asyncHandler(controller.exportReport)
);
