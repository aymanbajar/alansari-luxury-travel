import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { fail } from "../lib/api-response.js";
import { AppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return fail(res, 400, "VALIDATION_ERROR", "Request validation failed.", error.flatten());
  }

  if (error instanceof AppError) {
    return fail(res, error.status, error.code, error.message, error.details);
  }

  logger.error({ error }, "Unhandled error");
  return fail(res, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
};
