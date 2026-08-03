import express, { Express } from "express";
import cors from "cors";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import errorHandler from "./middleware/errorHandler";
import "./strategies/local-strategy";

import authRoutes from "./routes/authRoutes";
import testRoutes from "./routes/testRoutes";
import adminRoutes from "./routes/adminRoutes";
import eventRoutes from "./routes/eventRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import organizerUploadRoutes from "./routes/organizerUploadRoutes";
import adminUploadRoutes from "./routes/adminUploadRoutes";
import venuePublicRoutes from "./routes/venuePublicRoutes";
import organizerRoutes from "./routes/organizerRoutes";
import favoritesRoutes from "./routes/favoritesRoutes";
import configRoutes from "./routes/configRoutes";

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
export const createApp = (): Express => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error(
      "createApp() requires an active Mongoose connection (the session store reuses it)."
    );
  }

  const app = express();

  // Behind a proxy (Render/Vercel), trust the first hop so secure cookies and
  // client IPs resolve correctly.
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: [
        "https://ticketnest-iota.vercel.app",
        "https://ticketnest-l2l3aajc1-omers-projects-44a866c3.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
      ],
      credentials: true,
    })
  );
  app.use(express.json());

  app.use(
    session({
      secret: process.env.SESSION_SECRET as string,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      },
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
      }),
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use("/api/config", configRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/testAuth", testRoutes);
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
