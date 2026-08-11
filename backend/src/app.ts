import express, { Express } from "express";
import cors from "cors";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import errorHandler from "./middleware/errorHandler";
import { rejectStaleSessions } from "./middleware/rejectStaleSessions";
import { globalLimiter } from "./middleware/rateLimiters";
import {
  csrfProtection,
  issueCsrfToken,
  validateRequestOrigin,
} from "./middleware/csrf";
import "./strategies/local-strategy";

import authRoutes from "./routes/authRoutes";
import sessionRoutes from "./routes/sessionRoutes";
import adminRoutes from "./routes/adminRoutes";
import eventRoutes from "./routes/eventRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import organizerUploadRoutes from "./routes/organizerUploadRoutes";
import adminUploadRoutes from "./routes/adminUploadRoutes";
import venuePublicRoutes from "./routes/venuePublicRoutes";
import organizerRoutes from "./routes/organizerRoutes";
import favoritesRoutes from "./routes/favoritesRoutes";
import configRoutes from "./routes/configRoutes";
import {
  createHealthRoutes,
  HealthRoutesOptions,
} from "./routes/healthRoutes";
import { requestContext } from "./middleware/requestContext";
import { getConfig } from "./configs/env";

/**
 * Builds the Express application.
 *
 * This function performs no I/O of its own: it does not connect to MongoDB,
 * seed accounts, start background jobs, or bind a port. Those belong to the
 * process bootstrap in `index.ts`. Keeping them separate lets integration
 * tests drive the real app through Supertest without opening a socket or
 * starting the expiry worker.
 *
 * Requires an already-established Mongoose connection, because the session
 * store reuses its MongoDB client.
 */
export interface CreateAppOptions extends HealthRoutesOptions {}

export const createApp = (options: CreateAppOptions = {}): Express => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error(
      "createApp() requires an active Mongoose connection (the session store reuses it)."
    );
  }

  const config = getConfig();
  const app = express();

  // First in the chain: everything logged below carries the request id.
  app.use(requestContext);

  // Behind a proxy (Render/Vercel), trust the first hop so secure cookies and
  // client IPs resolve correctly.
  app.set("trust proxy", 1);

  // Security headers first, so they are present even on responses produced by
  // middleware that runs before the routes.
  app.use(
    helmet({
      // This process serves JSON only; the browser app is hosted separately, so
      // a CSP here would govern nothing but error pages.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser(config.sessionSecret));

  // Before sessions, CSRF and the rate limiter. A probe must not be throttled,
  // must not need a token, and must not mint a session document per poll.
  app.use(createHealthRoutes(options));

  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
        secure: config.isProduction,
        sameSite: config.isProduction ? "none" : "lax",
      },
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
      }),
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Must run directly after passport.session(): everything downstream may then
  // assume req.user belongs to a session that is still valid.
  app.use(rejectStaleSessions);

  app.use(globalLimiter);

  // Both CSRF defences apply to every state-changing route below. The token
  // endpoint itself is a GET, so it is unaffected.
  app.get("/api/csrf-token", issueCsrfToken);
  app.use(validateRequestOrigin);
  app.use(csrfProtection);

  app.use("/api/config", configRoutes);
  app.use("/api/auth", sessionRoutes);
  app.use("/api/auth", authRoutes);
  // DEPRECATED alias for /api/auth/me. Remove once the deployed frontend has
  // shipped the new path — the two apps deploy separately.
  app.use("/api/testAuth", sessionRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/venues", venuePublicRoutes);
  app.use("/api/organizer", organizerRoutes);
  app.use("/api/favorites", favoritesRoutes);
  app.use("/api/admin/uploads", adminUploadRoutes);
  app.use("/api/organizer/uploads", organizerUploadRoutes);

  app.use(errorHandler);

  return app;
};

export default createApp;
