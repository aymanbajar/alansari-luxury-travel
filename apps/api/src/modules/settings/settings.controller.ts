import type { Request, Response } from "express";
import { ok } from "../../lib/api-response.js";
import { getRequiredUser } from "../auth/auth.middleware.js";
import * as settingsService from "./settings.service.js";

export async function getOvernight(req: Request, res: Response): Promise<Response> {
  const settings = await settingsService.getOvernightSettings();
  return ok(res, { settings });
}

export async function updateOvernight(req: Request, res: Response): Promise<Response> {
  const actor = getRequiredUser(req);
  const settings = await settingsService.updateOvernightSettings(req.body, actor.id, req.ip);
  return ok(res, { settings });
}
