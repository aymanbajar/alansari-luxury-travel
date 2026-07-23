import type { Response } from "express";
import { env } from "../../config/env.js";
import { authCookieNames } from "./auth.constants.js";

const baseCookieOptions = {
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production" || env.COOKIE_SECURE,
  domain: env.COOKIE_DOMAIN || undefined,
  path: "/"
};

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  csrfToken: string
): void {
  res.cookie(authCookieNames.accessToken, accessToken, {
    ...baseCookieOptions,
    httpOnly: true,
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000
  });

  res.cookie(authCookieNames.refreshToken, refreshToken, {
    ...baseCookieOptions,
    httpOnly: true,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  });

  res.cookie(authCookieNames.csrfToken, csrfToken, {
    ...baseCookieOptions,
    httpOnly: false,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  });
}

export function setAccessCookie(res: Response, accessToken: string): void {
  res.cookie(authCookieNames.accessToken, accessToken, {
    ...baseCookieOptions,
    httpOnly: true,
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000
  });
}

export function clearAuthCookies(res: Response): void {
  const options = {
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/"
  };

  res.clearCookie(authCookieNames.accessToken, options);
  res.clearCookie(authCookieNames.refreshToken, options);
  res.clearCookie(authCookieNames.csrfToken, options);
}
