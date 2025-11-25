import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mongoose from 'mongoose';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 10000;

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kavi8668182885_db_user:7pnnMgfVvmY9b06r@cluster0.rnt5vif.mongodb.net/textile_store?retryWrites=true&w=majority';

// ✅ CORS CONFIG
app.use(cors({
  origin: [
    "https://sssventures.in",
    "https://www.sssventures.in", 
    "http://localhost:5173",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true
}));

app.options('*', cors());

// Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ✅ STRICT IMAGE UPLOAD - 1MB LIMIT
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Strict 1MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP images are allowed'), false);
    }
  }
});

// ---------- PRODUCT SCHEMA ----------
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
    mainCategory: { type: String, required: true },
    subCategory: { type: String, required: true },
    nestedCategory: { type: String, default: "" },
    composition: String,
    gsm: String,
    width: String,
    count: String,
    construction: String,
    weave: String,
    finish: String,
    specifications: {
      category: String,
      subCategory: String,
      composition: String,
      gsm: String,
      width: String,
      count: String,
      construction: String,
      weave: String,
      finish: String,
    },
    image: { 
      data: { type: Buffer, required: true },
      contentType: { type: String, required: true }
    },
    imageUrl: String,
    productUrl: String,
    inStock: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

// ---------- DB CONNECT ----------
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
}

// ---------- HEALTH CHECK ----------
app.get("/api/health", async (req, res) => {
  try {
    const count = await Product.countDocuments();
    res.json({
      status: "OK",
      database: "MongoDB Atlas",
      products: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ status: "ERROR", error: error.message });
  }
});

// ---------- GET ALL PRODUCTS ----------
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });

    const result = products.map((p) => {
      const obj = p.toObject();
      if (obj.image && obj.image.data) {
        obj.imageUrl = `data:${obj.image.contentType};base64,${obj.image.data.toString("base64")}`;
      }
      return obj;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- GET SINGLE PRODUCT ----------
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const obj = product.toObject();
    if (obj.image && obj.image.data) {
      obj.imageUrl = `data:${obj.image.contentType};base64,${obj.image.data.toString("base64")}`;
    }

    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- STRICT CREATE PRODUCT (IMAGE REQUIRED) ----------
app.post("/api/products", upload.single("image"), async (req, res) => {
  try {
    // ✅ STRICT: Image is required
    if (!req.file) {
      return res.status(400).json({ error: "Product image is required" });
    }

    // ✅ STRICT: Validate file size
    if (req.file.size > 1 * 1024 * 1024) {
      return res.status(400).json({ error: "Image size must be less than 1MB" });
    }

    const imageData = {
      data: req.file.buffer,
      contentType: req.file.mimetype,
    };

    let specifications = {};
    if (req.body.specifications) {
      try {
        specifications = typeof req.body.specifications === 'string' 
          ? JSON.parse(req.body.specifications) 
          : req.body.specifications;
      } catch (e) {
        console.warn("⚠️ Specifications parse error:", e.message);
      }
    }

    const productData = {
      name: req.body.name,
      price: req.body.price ? Number(req.body.price) : 0,
      mainCategory: req.body.mainCategory,
      subCategory: req.body.subCategory,
      nestedCategory: req.body.nestedCategory || "",
      composition: req.body.composition,
      gsm: req.body.gsm,
      width: req.body.width,
      count: req.body.count,
      construction: req.body.construction,
      weave: req.body.weave,
      finish: req.body.finish,
      specifications: specifications,
      productUrl: req.body.productUrl,
      image: imageData, // ✅ Image is required
    };

    const product = new Product(productData);
    const saved = await product.save();

    const obj = saved.toObject();
    if (obj.image && obj.image.data) {
      obj.imageUrl = `data:${obj.image.contentType};base64,${obj.image.data.toString("base64")}`;
    }

    console.log(`✅ Product created: ${saved.name} with image`);
    res.status(201).json(obj);
  } catch (error) {
    console.error("❌ Create Product Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------- UPDATE PRODUCT ----------
app.put("/api/products/:id", upload.single("image"), async (req, res) => {
  try {
    let specifications = {};
    if (req.body.specifications) {
      try {
        specifications = typeof req.body.specifications === 'string' 
          ? JSON.parse(req.body.specifications) 
          : req.body.specifications;
      } catch (e) {
        console.warn("⚠️ Specifications parse error:", e.message);
      }
    }

    const updateData = {
      name: req.body.name,
      price: req.body.price ? Number(req.body.price) : 0,
      mainCategory: req.body.mainCategory,
      subCategory: req.body.subCategory,
      nestedCategory: req.body.nestedCategory || "",
      composition: req.body.composition,
      gsm: req.body.gsm,
      width: req.body.width,
      count: req.body.count,
      construction: req.body.construction,
      weave: req.body.weave,
      finish: req.body.finish,
      specifications: specifications,
      productUrl: req.body.productUrl,
    };

    // ✅ If new image provided, update it
    if (req.file) {
      if (req.file.size > 1 * 1024 * 1024) {
        return res.status(400).json({ error: "Image size must be less than 1MB" });
      }
      updateData.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Product not found" });
    }

    const obj = updated.toObject();
    if (obj.image && obj.image.data) {
      obj.imageUrl = `data:${obj.image.contentType};base64,${obj.image.data.toString("base64")}`;
    }

    console.log(`✅ Product updated: ${updated.name}`);
    res.json(obj);
  } catch (error) {
    console.error("❌ Update Product Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------- DELETE PRODUCT ----------
app.delete("/api/products/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });

    console.log(`✅ Product deleted: ${deleted.name}`);
    res.json({ 
      message: "Product deleted successfully", 
      product: deleted.name,
      id: deleted._id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- CATEGORY FILTER ----------
app.get("/api/products/category/:cat", async (req, res) => {
  try {
    const products = await Product.find({ mainCategory: req.params.cat });

    const result = products.map((p) => {
      const obj = p.toObject();
      if (obj.image && obj.image.data) {
        obj.imageUrl = `data:${obj.image.contentType};base64,${obj.image.data.toString("base64")}`;
      }
      return obj;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- SEARCH ----------
app.get("/api/products/search/:q", async (req, res) => {
  try {
    const q = req.params.q;
    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { mainCategory: { $regex: q, $options: "i" } },
        { subCategory: { $regex: q, $options: "i" } }
      ],
    });

    const result = products.map((p) => {
      const obj = p.toObject();
      if (obj.image && obj.image.data) {
        obj.imageUrl = `data:${obj.image.contentType};base64,${obj.image.data.toString("base64")}`;
      }
      return obj;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ ROOT ENDPOINT
app.get("/", (req, res) => {
  res.json({
    message: "SSS Ventures Textile API Server - STRICT MODE",
    status: "Running",
    requirements: {
      image: "Required (1MB max)",
      local_storage: "Disabled",
      operations: "Backend only"
    },
    endpoints: {
      health: "/api/health",
      products: "/api/products",
      documentation: "Visit /api/health for server status"
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("🚨 Server Error:", error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: "Image size must be less than 1MB" });
    }
  }
  
  res.status(500).json({ 
    error: "Internal Server Error",
    message: error.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ---------- START SERVER ----------
async function startServer() {
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 STRICT MODE: Backend operations only`);
    console.log(`📸 Image upload: Required (1MB max)`);
    console.log(`💾 Local storage: Disabled`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  });
}

startServer().catch(console.error);