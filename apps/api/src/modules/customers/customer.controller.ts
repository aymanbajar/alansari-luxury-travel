import type { Request, Response } from "express";
import { ok } from "../../lib/api-response.js";
import { getRequiredUser } from "../auth/auth.middleware.js";
import * as customerService from "./customer.service.js";

export async function list(req: Request, res: Response): Promise<Response> {
  const result = await customerService.listCustomers(req.query as never);
  return ok(res, { customers: result.items, pagination: result.pagination });
}

export async function create(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const result = await customerService.createCustomer(req.body, actor.id, req.ip);
  return ok(res, result, 201);
}

export async function get(req: Request, res: Response): Promise<Response> {
  const customer = await customerService.getCustomer(req.params.id);
  return ok(res, { customer });
}

export async function update(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const result = await customerService.updateCustomer(req.params.id, req.body, actor.id, req.ip);
  return ok(res, result);
}

export async function remove(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const customer = await customerService.deleteCustomer(req.params.id, actor.id, req.ip);
  return ok(res, { customer });
}

export async function bookings(req: Request, res: Response): Promise<Response> {
  const customerBookings = await customerService.getCustomerBookings(req.params.id);
  return ok(res, { bookings: customerBookings });
}
