import type { RequestHandler } from "express";
import { fail } from "../lib/api-response.js";
import { authCookieNames, csrfHeaderName } from "../modules/auth/auth.constants.js";

const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const csrfExemptPaths = new Set(["/api/auth/login", "/api/auth/refresh"]);

export const csrfProtection: RequestHandler = (req, res, next) => {
  if (!stateChangingMethods.has(req.method) || csrfExemptPaths.has(req.path)) {
    next();
    return;
  }

  const cookieToken = req.cookies[authCookieNames.csrfToken];
  const headerToken = req.header(csrfHeaderName);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return fail(res, 403, "CSRF_TOKEN_INVALID", "تعذر التحقق من أمان الطلب.");
  }

  next();
};
