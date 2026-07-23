import type { Request, Response } from "express";
import { ok } from "../../lib/api-response.js";
import { getRequiredUser } from "../auth/auth.middleware.js";
import type { DashboardSummaryInput, DashboardTimelineInput } from "./dashboard.schemas.js";
import { getDashboardSummary, getVehicleTimeline } from "./dashboard.service.js";

export async function summary(req: Request, res: Response): Promise<Response> {
  const user = getRequiredUser(req);
  const dashboard = await getDashboardSummary(
    req.query as unknown as DashboardSummaryInput,
    user.role
  );
  return ok(res, { dashboard });
}

export async function timeline(req: Request, res: Response): Promise<Response> {
  const timelineData = await getVehicleTimeline(req.query as unknown as DashboardTimelineInput);
  return ok(res, { timeline: timelineData });
}
