import mongoose from "mongoose";
import { getConfig } from "./env";

let isConnected = false;

const connectDB = async () => {
  // Validated at startup — see configs/env.ts.
  const uri = getConfig().mongoUri;

  if (isConnected) return mongoose.connection;

  mongoose.connection.on("connected", () =>
    console.log("✅ MongoDB connected")
  );
  mongoose.connection.on("error", (err) =>
    console.error("❌ MongoDB error:", err)
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("⚠️ MongoDB disconnected")
  );

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  } as any);

  isConnected = true;

  // Shutdown is owned by the process bootstrap (index.ts). A `process.exit()`
  // here would race the graceful path and cut off in-flight work.

  return mongoose.connection;
};

export default connectDB;
