import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import compression from "compression";
import dotenv from "dotenv";
import productRoutes from "./routes/products.js";

dotenv.config();
const app = express();

/* 🔥 SPEED */
app.use(compression());
app.use(express.json());

/* 🔥 CORS */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);

/* 🔥 STATIC */
app.use("/uploads", express.static("uploads"));

/* 🔥 MONGO (RAM SAFE) */
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
});
mongoose.connection.once("open", () =>
  console.log("✅ MongoDB Connected")
);

/* 🔥 HEALTH */
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", time: Date.now() });
});

/* 🔥 ROUTES */
app.use("/api/products", productRoutes);

/* 🔥 START */
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Backend running on ${PORT}`)
);
server.setTimeout(60000);
