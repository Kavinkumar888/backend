import express from "express";
import cors from "cors";
import multer from "multer";
import mongoose from "mongoose";
import compression from "compression";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ 1. COMPRESSION (BEST BANG FOR BUCK)
app.use(compression());

app.use(cors({
  origin: [
    "https://sssventures.in",
    "https://www.sssventures.in", 
    "http://localhost:5173",
    "http://localhost:3000"
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 2. STATIC FILES CACHE (BIG IMPACT)
app.use("/uploads", express.static("uploads", {
  maxAge: '7d' // 7 days cache for images
}));

// Multer config
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 },
});

// Product Schema
const productSchema = new mongoose.Schema(
  {
    name: String,
    price: Number,
    mainCategory: String,
    subCategory: String,
    nestedCategory: String,
    composition: String,
    gsm: String,
    width: String,
    count: String,
    construction: String,
    weave: String,
    finish: String,
    specifications: Object,
    imageUrl: String,
    productUrl: String,
    inStock: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// ✅ 3. DATABASE INDEXES (CRITICAL FOR SPEED)
productSchema.index({ mainCategory: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ inStock: 1 });

const Product = mongoose.model("Product", productSchema);

// Connect DB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ DB Error:", err);
  }
}

// Routes

// Health
app.get("/api/health", async (req, res) => {
  res.json({ status: "OK", time: Date.now() });
});

// ✅ 4. OPTIMIZED GET PRODUCTS (BIGGEST IMPACT)
app.get("/api/products", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 24; // Fixed limit for consistency
    const skip = (page - 1) * limit;

    // ✅ Select only needed fields + lean() for faster queries
    const products = await Product.find()
      .select('name price mainCategory subCategory imageUrl inStock')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Converts to plain JS objects (faster)

    // ✅ Cache header for CDN/Browser
    res.set('Cache-Control', 'public, max-age=120'); // 2 minutes cache
    
    res.json({
      products,
      pagination: {
        page,
        limit,
        hasMore: products.length === limit
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ error: "Not found" });
    
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
app.post("/api/products", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Image required" });

    let specs = {};
    if (req.body.specifications) {
      specs = typeof req.body.specifications === "string" 
        ? JSON.parse(req.body.specifications) 
        : req.body.specifications;
    }

    const newProduct = new Product({
      ...req.body,
      price: Number(req.body.price) || 0,
      specifications: specs,
      imageUrl: `/uploads/${req.file.filename}`,
    });

    const saved = await newProduct.save();
    res.status(201).json(saved);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update product
app.put("/api/products/:id", upload.single("image"), async (req, res) => {
  try {
    let specs = {};
    if (req.body.specifications) {
      specs = typeof req.body.specifications === "string"
        ? JSON.parse(req.body.specifications)
        : req.body.specifications;
    }

    const updateData = {
      ...req.body,
      price: Number(req.body.price) || 0,
      specifications: specs,
    };

    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`;
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

// Delete product
app.delete("/api/products/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// Start server
connectDB();
app.listen(PORT, () => console.log(`🚀 Optimized server running on port ${PORT}`));