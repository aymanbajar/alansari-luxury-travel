import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAuthentication, requireStaffOrAdmin } from "../auth/auth.middleware.js";
import {
  createCustomerSchema,
  customerIdParamsSchema,
  listCustomersSchema,
  updateCustomerSchema
} from "./customer.schemas.js";
import * as controller from "./customer.controller.js";

export const customerRouter = Router();

customerRouter.use(requireAuthentication, requireStaffOrAdmin);
customerRouter.get("/", validate(listCustomersSchema), asyncHandler(controller.list));
customerRouter.post("/", validate(createCustomerSchema), asyncHandler(controller.create));
customerRouter.get(
  "/:id/bookings",
  validate(customerIdParamsSchema),
  asyncHandler(controller.bookings)
);
customerRouter.get("/:id", validate(customerIdParamsSchema), asyncHandler(controller.get));
customerRouter.patch("/:id", validate(updateCustomerSchema), asyncHandler(controller.update));
customerRouter.delete("/:id", validate(customerIdParamsSchema), asyncHandler(controller.remove));
