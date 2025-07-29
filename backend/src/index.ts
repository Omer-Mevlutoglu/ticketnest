import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import errorHandler from "./middleware/errorHandler";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
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
app.get("/api/ping", (_req, res) => res.json({ status: "ok" }));

app.use(errorHandler);
app.listen(process.env.PORT || 5000, () => {
  console.log(`✅ Server is running on port ${process.env.PORT || 5000}`);
});
