import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import { ensureMarketplaceSeed } from "./lib/seed";
import { startOrderExpirationJob } from "./jobs/order-expiration";

const rawPort = process.env["PORT"] || "5000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

ensureMarketplaceSeed()
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
      // Start background order expiration worker (every 5 min)
      startOrderExpirationJob();
    });
  })
  .catch((err) => {
    logger.error({ err }, "Could not seed marketplace database");
    process.exit(1);
  });
