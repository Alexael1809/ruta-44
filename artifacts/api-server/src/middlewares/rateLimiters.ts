/**
 * @file rateLimiters.ts
 * Layered rate-limiting middleware using express-rate-limit.
 * Defends against DDoS, inventory hoarding, bank reference brute forcing, and admin abuse.
 */

import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

/**
 * 1. Global Read Limiter:
 * Up to 180 requests per 15 minutes per IP.
 * Protects catalog browsing, rate lookups, and static queries.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiadas peticiones desde esta IP. Intenta de nuevo en 15 minutos.",
  },
  skip: (req: Request) => {
    // Skip health check or internal proxy paths
    return req.path === "/health" || req.path.startsWith("/__clerk");
  },
});

/**
 * 2. Checkout and Payment Limiter:
 * Maximum 10 requests per 15 minutes per IP/authenticated user.
 * Blocks automated inventory hoarding bots and payment reference collision/brute-force attacks.
 */
export const checkoutAndPaymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const user = (req as Request & { user?: { id?: string } }).user;
    return user?.id ? `user_${user.id}` : (req.ip || "unknown_ip");
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Has alcanzado el límite de intentos de compra/pago. Por favor espera 15 minutos antes de intentar de nuevo.",
    });
  },
});

/**
 * 3. Admin Operations Limiter:
 * Maximum 30 requests per 15 minutes for administrative routes (/admin/* and /payment-receiver).
 * Protects privileged actions, merchant creation, user role elevations, and rate changes.
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiadas operaciones administrativas. Intenta de nuevo en 15 minutos.",
  },
});
