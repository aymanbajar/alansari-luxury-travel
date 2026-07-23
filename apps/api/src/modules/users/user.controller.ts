import type { Request, Response } from "express";
import { ok } from "../../lib/api-response.js";
import { getRequiredUser } from "../auth/auth.middleware.js";
import * as userService from "./user.service.js";

export async function list(req: Request, res: Response): Promise<Response> {
  const users = await userService.listUsers();
  return ok(res, { users });
}

export async function create(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const user = await userService.createUser(req.body, actor.id, req.ip);
  return ok(res, { user }, 201);
}

export async function get(req: Request, res: Response): Promise<Response> {
  const user = await userService.getUser(req.params.id);
  return ok(res, { user });
}

export async function update(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const user = await userService.updateUser(req.params.id, req.body, actor.id, req.ip);
  return ok(res, { user });
}

export async function updateStatus(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const user = await userService.updateUserStatus(req.params.id, req.body, actor.id, req.ip);
  return ok(res, { user });
}

export async function resetPassword(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  await userService.resetPassword(req.params.id, req.body, actor.id, req.ip);
  return ok(res, { passwordReset: true });
}
