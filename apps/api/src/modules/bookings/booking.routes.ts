import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAuthentication, requireStaffOrAdmin } from "../auth/auth.middleware.js";
import {
  bookingIdParamsSchema,
  cancelBookingSchema,
  createBookingSchema,
  listBookingsSchema,
  updateBookingSchema,
  updateBookingStatusSchema
} from "./booking.schemas.js";
import * as controller from "./booking.controller.js";

export const bookingRouter = Router();

bookingRouter.use(requireAuthentication, requireStaffOrAdmin);
bookingRouter.get("/", validate(listBookingsSchema), asyncHandler(controller.list));
bookingRouter.post("/", validate(createBookingSchema), asyncHandler(controller.create));
bookingRouter.get("/:id", validate(bookingIdParamsSchema), asyncHandler(controller.get));
bookingRouter.patch("/:id", validate(updateBookingSchema), asyncHandler(controller.update));
bookingRouter.patch(
  "/:id/status",
  validate(updateBookingStatusSchema),
  asyncHandler(controller.updateStatus)
);
bookingRouter.post("/:id/cancel", validate(cancelBookingSchema), asyncHandler(controller.cancel));
