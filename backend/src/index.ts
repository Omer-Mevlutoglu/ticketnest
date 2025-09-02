import dotenv from "dotenv";
import express from "express";
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

import userModel from "./models/userModel";
import { hashPassword } from "./utils/helperHash";
import connectDB from "./configs/db";

dotenv.config();

const app = express();

// Core middleware (safe before DB)
app.use(cors());
app.use(express.json());

async function bootstrap() {
  // 1) Connect to MongoDB (Atlas or local replica set)
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
        // collectionName: "sessions", // optional
        // ttl: 60 * 60 * 24 * 30,      // optional explicit TTL
      }),
    })
  );

  // 3) Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // 4) Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/testAuth", testRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/bookings", bookingRoutes);

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

  // 6) Error handler & listen
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
