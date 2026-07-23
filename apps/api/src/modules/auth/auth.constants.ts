export const authCookieNames = {
  accessToken: "alt_access_token",
  refreshToken: "alt_refresh_token",
  csrfToken: "alt_csrf_token"
} as const;

export const csrfHeaderName = "x-csrf-token";
