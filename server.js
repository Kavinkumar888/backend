import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import productRoutes from "./routes/products.js";

dotenv.config();

const app = express();

/* -------- NO CACHE (304 FIX) -------- */
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

/* -------- CORS -------- */
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

/* -------- BODY -------- */
app.use(express.json());

/* -------- STATIC FILES -------- */
app.use("/uploads", express.static("uploads"));

/* -------- MONGO -------- */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ Mongo Error", err));

/* -------- HEALTH -------- */
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    env: process.env.NODE_ENV,
    time: new Date(),
  });
});

/* -------- ROUTES -------- */
app.use("/api/products", productRoutes);

/* -------- START -------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
