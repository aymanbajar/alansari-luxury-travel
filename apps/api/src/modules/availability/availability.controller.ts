import type { Request, Response } from "express";
import { ok } from "../../lib/api-response.js";
import { availabilityService, toDateRangeRequest } from "./availability.service.js";

export async function check(req: Request, res: Response): Promise<Response> {
  const result = await availabilityService.checkBookingConflicts(toDateRangeRequest(req.body));
  return ok(res, { availability: result });
}

export async function vehicles(req: Request, res: Response): Promise<Response> {
  const result = await availabilityService.checkBookingConflicts(
    toDateRangeRequest(req.query as never)
  );
  return ok(res, { vehicles: result.alternativeVehicles });
}

export async function drivers(req: Request, res: Response): Promise<Response> {
  const result = await availabilityService.checkBookingConflicts(
    toDateRangeRequest(req.query as never)
  );
  return ok(res, { drivers: result.alternativeDrivers });
}

export async function suggestions(req: Request, res: Response): Promise<Response> {
  const result = await availabilityService.checkBookingConflicts(
    toDateRangeRequest(req.query as never)
  );
  return ok(res, {
    vehicles: result.alternativeVehicles,
    drivers: result.alternativeDrivers
  });
}
