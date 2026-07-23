import type { Request, Response } from "express";
import { ok } from "../../lib/api-response.js";
import { getRequiredUser } from "../auth/auth.middleware.js";
import * as vehicleService from "./vehicle.service.js";

export async function list(req: Request, res: Response): Promise<Response> {
  const result = await vehicleService.listVehicles(req.query as never);
  return ok(res, { vehicles: result.items, pagination: result.pagination });
}

export async function create(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const vehicle = await vehicleService.createVehicle(req.body, actor.id, req.ip);
  return ok(res, { vehicle }, 201);
}

export async function get(req: Request, res: Response): Promise<Response> {
  const vehicle = await vehicleService.getVehicle(req.params.id);
  return ok(res, { vehicle });
}

export async function update(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const vehicle = await vehicleService.updateVehicle(req.params.id, req.body, actor.id, req.ip);
  return ok(res, { vehicle });
}

export async function updateStatus(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const vehicle = await vehicleService.updateVehicleStatus(
    req.params.id,
    req.body,
    actor.id,
    req.ip
  );
  return ok(res, { vehicle });
}

export async function remove(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const vehicle = await vehicleService.softDeleteVehicle(req.params.id, actor.id, req.ip);
  return ok(res, { vehicle });
}
