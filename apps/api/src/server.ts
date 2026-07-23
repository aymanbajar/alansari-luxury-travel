import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();
const port = env.API_PORT;

const server = app.listen(port, () => {
  logger.info({ port }, "API server started");
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    logger.error({ port }, "API startup failed because the port is already in use");
    process.exit(1);
  }

  if (error.code === "EACCES") {
    logger.error({ port }, "API startup failed because permission was denied for the port");
    process.exit(1);
  }

  logger.error({ error }, "API startup failed");
  process.exit(1);
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, "Shutdown signal received");

  const forceExit = setTimeout(() => {
    logger.error({ signal }, "Graceful shutdown timed out");
    process.exit(1);
  }, env.SHUTDOWN_GRACE_SECONDS * 1000);

  server.close(async (error) => {
    if (error) {
      logger.error({ error }, "HTTP server shutdown failed");
      process.exitCode = 1;
    }

    try {
      await prisma.$disconnect();
      logger.info("Database connection closed");
    } catch (caught) {
      logger.error({ error: caught }, "Database disconnect failed");
      process.exitCode = 1;
    } finally {
      clearTimeout(forceExit);
      process.exit();
    }
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
