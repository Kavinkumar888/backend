// ------------------------- IMPORTS -------------------------
import express from "express";
import cors from "cors";
import multer from "multer";
import mongoose from "mongoose";
import compression from "compression";
import sharp from "sharp";
import fs from "fs";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------------- CORS -------------------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

// ------------------------- MIDDLEWARE -------------------------
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static("uploads"));

// ------------------------- MONGODB -------------------------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ Mongo Error:", err.message));

// ------------------------- MULTER STORAGE -------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s/g, "")),
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 10485760 },
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

    // ✅ FRONTEND EXPECTS THIS
    imageUrl: String,
  },
  { timestamps: true }
);

productSchema.index({ createdAt: -1 });

const Product = mongoose.model("Product", productSchema);

// ------------------------- HEALTH CHECK -------------------------
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
    let finalImage = "";

    if (req.file) {
      const compressedPath = `uploads/${Date.now()}-product.webp`;

      await sharp(req.file.path)
        .resize(800)
        .webp({ quality: 70 })
        .toFile(compressedPath);

      fs.unlinkSync(req.file.path);

      // ✅ FRONTEND FRIENDLY
      finalImage = `/${compressedPath}`;
    }

    const product = await Product.create({
      name: req.body.name,
      price: Number(req.body.price || 0),
      mainCategory: req.body.mainCategory,
      subCategory: req.body.subCategory,
      nestedCategory: req.body.nestedCategory,
      specifications: JSON.parse(req.body.specifications || "{}"),
      productUrl: req.body.productUrl,

      // ✅ MATCH FRONTEND
      imageUrl: finalImage,
    });

    res.status(201).json({ message: "Product created", product });
  } catch (err) {
    console.error("❌ CREATE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ------------------------- UPDATE PRODUCT -------------------------
app.put("/api/products/:id", upload.single("image"), async (req, res) => {
  try {
    let finalImage;

    if (req.file) {
      const compressedPath = `uploads/${Date.now()}-update.webp`;

      await sharp(req.file.path)
        .resize(800)
        .webp({ quality: 70 })
        .toFile(compressedPath);

      fs.unlinkSync(req.file.path);
      finalImage = `/${compressedPath}`;
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        price: Number(req.body.price || 0),
        mainCategory: req.body.mainCategory,
        subCategory: req.body.subCategory,
        nestedCategory: req.body.nestedCategory,
        specifications: JSON.parse(req.body.specifications || "{}"),
        productUrl: req.body.productUrl,

        ...(finalImage && { imageUrl: finalImage }),
      },
      { new: true }
    );

    res.json({ message: "Updated", product: updated });
  } catch (err) {
    console.error("❌ UPDATE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ------------------------- DELETE PRODUCT -------------------------
app.delete("/api/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------- 404 -------------------------
app.use((req, res) => {
  res.status(404).json({ error: "Route Not Found" });
});

// ------------------------- START SERVER -------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
