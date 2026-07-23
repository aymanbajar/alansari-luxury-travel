import type { Request, Response } from "express";
import { ok } from "../../lib/api-response.js";
import { getRequiredUser } from "../auth/auth.middleware.js";
import * as bookingService from "./booking.service.js";

export async function list(req: Request, res: Response): Promise<Response> {
  const result = await bookingService.listBookings(req.query as never);
  return ok(res, { bookings: result.items, pagination: result.pagination });
}

export async function create(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const booking = await bookingService.createBooking(req.body, actor, req.ip);
  return ok(res, { booking }, 201);
}

export async function get(req: Request, res: Response): Promise<Response> {
  const booking = await bookingService.getBooking(req.params.id);
  return ok(res, { booking });
}

export async function update(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const booking = await bookingService.updateBooking(req.params.id, req.body, actor, req.ip);
  return ok(res, { booking });
}

export async function updateStatus(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const booking = await bookingService.updateBookingStatus(req.params.id, req.body, actor, req.ip);
  return ok(res, { booking });
}

export async function cancel(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const booking = await bookingService.cancelBooking(req.params.id, req.body, actor, req.ip);
  return ok(res, { booking });
}
