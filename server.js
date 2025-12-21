// ------------------------- IMPORTS -------------------------
import express from "express";
import cors from "cors";
import multer from "multer";
import mongoose from "mongoose";
import compression from "compression";
import sharp from "sharp";
import fs from "fs";
import Razorpay from "razorpay";
import crypto from "crypto";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------------- CORS -------------------------
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());

// ------------------------- MIDDLEWARE -------------------------
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static("uploads"));

// ------------------------- MONGO CONNECTION -------------------------
mongoose
  .connect(
    process.env.MONGODB_URI ||
      "mongodb+srv://kavi8668182885_db_user:7pnnMgfVvmY9b06r@cluster0.rnt5vif.mongodb.net/sss_fast"
  )
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ Mongo Error:", err.message));

// ------------------------- MULTER -------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s/g, "")),
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 },
});

// ------------------------- PRODUCT SCHEMA -------------------------
const productSchema = new mongoose.Schema(
  {
    name: String,
    price: Number,
    mainCategory: String,
    subCategory: String,
    nestedCategory: String,
    specifications: Object,
    productUrl: String,
    imageUrl: String,
  },
  { timestamps: true }
);

productSchema.index({ createdAt: -1 });
const Product = mongoose.model("Product", productSchema);

// ------------------------- RAZORPAY -------------------------
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ------------------------- HEALTH -------------------------
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", time: Date.now() });
});

// ------------------------- GET PRODUCTS -------------------------
app.get("/api/products", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 100);
    const skip = (page - 1) * limit;

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments();

    res.json({
      products,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------- CREATE PRODUCT -------------------------
app.post("/api/products", upload.single("image"), async (req, res) => {
  try {
    let finalImage = null;

    if (req.file) {
      const compressedName = `uploads/${Date.now()}.webp`;

      await sharp(req.file.path)
        .resize(800)
        .webp({ quality: 70 })
        .toFile(compressedName);

      fs.unlinkSync(req.file.path);
      finalImage = "/" + compressedName;
    }

    const product = await Product.create({
      name: req.body.name,
      price: Number(req.body.price || 0),
      mainCategory: req.body.mainCategory,
      subCategory: req.body.subCategory,
      nestedCategory: req.body.nestedCategory,
      specifications: JSON.parse(req.body.specifications || "{}"),
      productUrl: req.body.productUrl,
      imageUrl: finalImage,
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------- UPDATE PRODUCT -------------------------
app.put("/api/products/:id", upload.single("image"), async (req, res) => {
  try {
    let updateData = {
      name: req.body.name,
      price: Number(req.body.price),
      mainCategory: req.body.mainCategory,
      subCategory: req.body.subCategory,
      nestedCategory: req.body.nestedCategory,
      specifications: JSON.parse(req.body.specifications || "{}"),
      productUrl: req.body.productUrl,
    };

    if (req.file) {
      const compressedName = `uploads/${Date.now()}.webp`;

      await sharp(req.file.path)
        .resize(800)
        .webp({ quality: 70 })
        .toFile(compressedName);

      fs.unlinkSync(req.file.path);
      updateData.imageUrl = "/" + compressedName;
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------- DELETE PRODUCT -------------------------
app.delete("/api/products/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ======================= PAYMENT =======================

// CREATE ORDER
app.post("/api/payment/create-order", async (req, res) => {
  const { amount } = req.body;

  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: "receipt_" + Date.now(),
  });

  res.json(order);
});

// VERIFY PAYMENT
app.post("/api/payment/verify", (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign)
    .digest("hex");

  res.json({ success: expected === razorpay_signature });
});

// ------------------------- 404 -------------------------
app.use((req, res) =>
  res.status(404).json({ error: "Route Not Found" })
);

// ------------------------- START -------------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
