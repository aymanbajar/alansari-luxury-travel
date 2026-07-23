import type { RequestHandler } from "express";

const startedAt = Date.now();
let totalRequests = 0;
const responsesByStatus = new Map<string, number>();

export const metricsMiddleware: RequestHandler = (_req, res, next) => {
  totalRequests += 1;
  res.on("finish", () => {
    const statusClass = `${Math.floor(res.statusCode / 100)}xx`;
    responsesByStatus.set(statusClass, (responsesByStatus.get(statusClass) ?? 0) + 1);
  });
  next();
};

export function renderMetrics(): string {
  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);
  const lines = [
    "# HELP alansari_api_uptime_seconds Process uptime in seconds.",
    "# TYPE alansari_api_uptime_seconds gauge",
    `alansari_api_uptime_seconds ${uptimeSeconds}`,
    "# HELP alansari_api_requests_total Total HTTP requests observed by the API process.",
    "# TYPE alansari_api_requests_total counter",
    `alansari_api_requests_total ${totalRequests}`,
    "# HELP alansari_api_responses_total HTTP responses grouped by status class.",
    "# TYPE alansari_api_responses_total counter"
  ];

  for (const [statusClass, count] of responsesByStatus.entries()) {
    lines.push(`alansari_api_responses_total{status_class="${statusClass}"} ${count}`);
  }

  return `${lines.join("\n")}\n`;
}
