import type { Request, Response } from "express";
import { ok } from "../../lib/api-response.js";
import { getRequiredUser } from "../auth/auth.middleware.js";
import * as driverService from "./driver.service.js";

export async function list(req: Request, res: Response): Promise<Response> {
  const result = await driverService.listDrivers(req.query as never);
  return ok(res, { drivers: result.items, pagination: result.pagination });
}

export async function create(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const driver = await driverService.createDriver(req.body, actor.id, req.ip);
  return ok(res, { driver }, 201);
}

export async function get(req: Request, res: Response): Promise<Response> {
  const driver = await driverService.getDriver(req.params.id);
  return ok(res, { driver });
}

export async function update(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const driver = await driverService.updateDriver(req.params.id, req.body, actor.id, req.ip);
  return ok(res, { driver });
}

export async function updateStatus(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const driver = await driverService.updateDriverStatus(req.params.id, req.body, actor.id, req.ip);
  return ok(res, { driver });
}

export async function remove(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const driver = await driverService.softDeleteDriver(req.params.id, actor.id, req.ip);
  return ok(res, { driver });
}
