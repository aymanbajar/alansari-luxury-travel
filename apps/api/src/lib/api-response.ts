import type { Response } from "express";
import type { ApiErrorResponse, ApiSuccessResponse } from "@alansari/shared";

export function ok<TData>(
  res: Response,
  data: TData,
  status = 200
): Response<ApiSuccessResponse<TData>> {
  return res.status(status).json({ success: true, data });
}

export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
): Response<ApiErrorResponse> {
  return res.status(status).json({
    success: false,
    error: { code, message, details }
  });
}
