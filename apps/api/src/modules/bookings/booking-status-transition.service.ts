import type { BookingStatus, UserRole } from "@prisma/client";
import { AppError } from "../../lib/app-error.js";

const staffTransitions: Record<BookingStatus, BookingStatus[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

const adminTransitions: Record<BookingStatus, BookingStatus[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["DRAFT", "IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["CONFIRMED", "COMPLETED", "CANCELLED"],
  COMPLETED: ["CONFIRMED"],
  CANCELLED: ["DRAFT", "CONFIRMED"]
};

export function assertBookingStatusTransition(
  from: BookingStatus,
  to: BookingStatus,
  role: UserRole
): void {
  if (from === to) {
    return;
  }

  if (from === "CANCELLED" && (to === "IN_PROGRESS" || to === "COMPLETED")) {
    throw new AppError(
      400,
      "INVALID_STATUS_TRANSITION",
      "Cancelled bookings cannot move to in-progress or completed."
    );
  }

  const allowed = role === "ADMIN" ? adminTransitions[from] : staffTransitions[from];
  if (!allowed.includes(to)) {
    throw new AppError(
      400,
      "INVALID_STATUS_TRANSITION",
      "Booking status transition is not allowed."
    );
  }
}

export function assertBookingEditableByRole(status: BookingStatus, role: UserRole): void {
  if (status === "COMPLETED" && role !== "ADMIN") {
    throw new AppError(
      403,
      "BOOKING_READ_ONLY",
      "Completed bookings are read-only for Staff users."
    );
  }
}
