import type { Request, Response } from "express";
import { ok } from "../../lib/api-response.js";
import { authCookieNames } from "./auth.constants.js";
import { clearAuthCookies, setAuthCookies } from "./cookie.service.js";
import { getRequiredUser } from "./auth.middleware.js";
import * as authService from "./auth.service.js";

export async function login(req: Request, res: Response): Promise<Response> {
  const result = await authService.login(req.body, req);
  setAuthCookies(res, result.accessToken, result.refreshToken, result.csrfToken);
  return ok(res, { user: result.user });
}

export async function refresh(req: Request, res: Response): Promise<Response> {
  const result = await authService.refreshSession(req.cookies[authCookieNames.refreshToken], req);
  setAuthCookies(res, result.accessToken, result.refreshToken, result.csrfToken);
  return ok(res, { user: result.user });
}

export async function logout(req: Request, res: Response): Promise<Response> {
  await authService.logout(req.cookies[authCookieNames.refreshToken], req.user?.id, req);
  clearAuthCookies(res);
  return ok(res, { loggedOut: true });
}

export async function me(req: Request, res: Response): Promise<Response> {
  const user = getRequiredUser(req);
  const currentUser = await authService.getCurrentUser(user.id);
  return ok(res, { user: currentUser });
}

export async function changePassword(req: Request, res: Response): Promise<Response> {
  const user = getRequiredUser(req);
  await authService.changePassword(user.id, req.body, req);
  clearAuthCookies(res);
  return ok(res, { passwordChanged: true });
}
