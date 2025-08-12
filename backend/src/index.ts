import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import errorHandler from "./middleware/errorHandler";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import userModel from "./models/userModel";
import { hashPassword } from "./utils/helperHash";
import authRoutes from "./routes/authRoutes";
import testRoutes from "./routes/testRoutes";
import adminRoutes from "./routes/adminRoutes";
import eventRoutes from "./routes/eventRoutes";
import cartRoutes from "./routes/cartRoutes";
import "./strategies/local-strategy";

dotenv.config();
const app = express();
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.log(err);
  });
app.use(cors());

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
    }),
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/api/auth", authRoutes);
app.use("/api/testAuth", testRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/cart", cartRoutes);
// app.get("/api/ping", (_req, res) => res.json({ status: "ok" }));
(async () => {
  const adminEmails: string[] = process.env.ADMIN_EMAILS
    ? JSON.parse(process.env.ADMIN_EMAILS)
    : [];
  const missingAdmins = [];
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

app.use(errorHandler);
app.listen(process.env.PORT || 5000, () => {
  console.log(`✅ Server is running on port ${process.env.PORT || 5000}`);
});
