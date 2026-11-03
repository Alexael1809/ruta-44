import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { globalLimiter } from "./middlewares/rateLimiters";

const app: Express = express();

// Trust reverse proxies (Cloudflare, Load Balancers, Replit edge) to read real client IPs
app.set("trust proxy", 1);

// HTTP Security headers (X-Frame-Options, XSS, HSTS, Content-Type sniffing prevention)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);

// Gzip / Deflate compression for response payloads (speeds up JSON responses for high concurrency)
app.use(compression());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:4173",
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      try {
        const hostname = new URL(origin).hostname;
        if (
          allowedOrigins.includes(origin) ||
          hostname.endsWith(".vercel.app") ||
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          process.env.NODE_ENV !== "production"
        ) {
          return callback(null, true);
        }
      } catch {
        // Fallback for non-standard origin URLs
      }
      return callback(null, origin);
    },
    credentials: true,
  })
);

const isClerkConfigured = Boolean(
  process.env.CLERK_PUBLISHABLE_KEY &&
  process.env.CLERK_PUBLISHABLE_KEY.startsWith("pk_") &&
  !process.env.CLERK_PUBLISHABLE_KEY.includes("placeholder")
);

if (isClerkConfigured) {
  app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
  app.use(
    clerkMiddleware((req) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(req) ?? "",
        process.env.CLERK_PUBLISHABLE_KEY,
      ),
    })),
  );
} else {
  // Graceful development mode when Clerk API keys are not yet provided
  app.use((req, _res, next) => {
    (req as any).auth = {
      userId: "master-seed:alexaelperdomo2410@gmail.com",
      sessionClaims: {
        email: "alexaelperdomo2410@gmail.com",
        name: "Admin Master",
      },
    };
    next();
  });
}

// Payload limit: Allow up to 10mb for receipts, images and CSV/Excel uploads
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting: Global tier for all API endpoints
app.use("/api", globalLimiter);

app.use("/api", router);

export default app;
