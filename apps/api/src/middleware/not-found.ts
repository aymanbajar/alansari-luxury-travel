import type { RequestHandler } from "express";
import { fail } from "../lib/api-response.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  return fail(res, 404, "NOT_FOUND", `Route ${req.method} ${req.path} was not found.`);
};
