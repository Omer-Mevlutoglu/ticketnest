import mongoose from "mongoose";

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGO_URI (or MONGODB_URI) is not set in .env");
  }

  if (isConnected) return mongoose.connection;

  // Optional: quiet old warnings
  // mongoose.set("strictQuery", true);

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
    // If your DB name isn’t in the URI, uncomment:
    // dbName: process.env.MONGO_DB_NAME || "ticketnest",
    serverSelectionTimeoutMS: 15000,
  } as any);

  isConnected = true;

  // graceful shutdown
  process.once("SIGINT", async () => {
    await mongoose.connection.close();
    process.exit(0);
  });

  return mongoose.connection;
};

export default connectDB;
