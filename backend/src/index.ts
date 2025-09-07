// src/index.ts
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import path from "path";
import errorHandler from "./middleware/errorHandler";
import "./strategies/local-strategy";

import authRoutes from "./routes/authRoutes";
import testRoutes from "./routes/testRoutes";
import adminRoutes from "./routes/adminRoutes";
import eventRoutes from "./routes/eventRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import { expireOverdueBookings } from "./services/bookingService";
import userModel from "./models/userModel";
import { hashPassword } from "./utils/helperHash";
import connectDB from "./configs/db";

dotenv.config();

const EXPIRE_JOB_MS = 60 * 1000; // run the sweep every 60s

const app = express();

// Core middleware (safe before DB)
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json());

async function bootstrap() {
  // 1) Connect to MongoDB (Atlas or local)
  await connectDB();

  // 2) Sessions (after DB is connected so MongoStore has a client)
  app.use(
    session({
      secret: process.env.SESSION_SECRET as string,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
        // collectionName: "sessions",
        // ttl: 60 * 60 * 24 * 30,
      }),
    })
  );

  // 3) Passport
  app.use(passport.initialize());
  app.use(passport.session());
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
  // 4) Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/testAuth", testRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/uploads", uploadRoutes);
  // 5) Seed admins once (after DB is connected)
  (async () => {
    const adminEmails: string[] = process.env.ADMIN_EMAILS
      ? JSON.parse(process.env.ADMIN_EMAILS)
      : [];
    const missingAdmins: string[] = [];
    for (const email of adminEmails) {
      const exists = await userModel.findOne({ email, role: "admin" });
      if (!exists) missingAdmins.push(email);
    }
    if (missingAdmins.length > 0) {
      for (const email of missingAdmins) {
        const pw = await hashPassword(process.env.ADMIN_INITIAL_PASSWORD!);
        await userModel.create({
          username: email.split("@")[0],
          email,
          passwordHash: pw,
          role: "admin",
          emailVerified: true,
        });
        console.log(`✅ Seeded admin account: ${email}`);
      }
    }
  })();

  // 6) Auto-expire unpaid bookings (runs every EXPIRE_JOB_MS)
  const runExpireJob = async () => {
    try {
      const { expiredCount, releasedSeats } = await expireOverdueBookings();
      if (expiredCount || releasedSeats) {
        console.log(
          `🕒 Auto-expire run → bookings expired: ${expiredCount}, seats released: ${releasedSeats}`
        );
      }
    } catch (err) {
      console.error("expireOverdueBookings error:", err);
    }
  };

  // Optional: first sweep on boot
  runExpireJob();

  // Schedule recurring job
  const expireTimer = setInterval(runExpireJob, EXPIRE_JOB_MS);

  // Clean up on shutdown
  process.on("SIGINT", () => {
    clearInterval(expireTimer);
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    clearInterval(expireTimer);
    process.exit(0);
  });

  // 7) Error handler & listen
  app.use(errorHandler);

  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Failed to bootstrap server:", err);
  process.exit(1);
});
