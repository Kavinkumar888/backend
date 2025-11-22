import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import 'dotenv/config';

// ES module dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB URI
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://kavi8668182885_db_user:7pnnMgfVvmY9b06r@cluster0.rnt5vif.mongodb.net/textile_store?retryWrites=true&w=majority';

// ✅ FIXED CORS FOR HOSTINGER + RENDER + LOCAL
app.use(
  cors({
    origin: [
      "https://sssventures.in",
       "https://www.sssventures.in",     // <---- REPLACE WITH YOUR HOSTINGER DOMAIN
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Multer for image upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"), false);
  }
});

// ---------- PRODUCT SCHEMA ----------
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
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

    image: { data: Buffer, contentType: String },
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
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ error: "Not found" });

    const obj = p.toObject();
    if (obj.image && obj.image.data) {
      obj.imageUrl = `data:${obj.image.contentType};base64,${obj.image.data.toString("base64")}`;
    }

    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- CREATE PRODUCT ----------
app.post("/api/products", upload.single("image"), async (req, res) => {
  try {
    const imageData = req.file
      ? {
          data: req.file.buffer,
          contentType: req.file.mimetype,
        }
      : null;

    const product = new Product({
      ...req.body,
      price: req.body.price ? Number(req.body.price) : 0,
      specifications: JSON.parse(req.body.specifications || "{}"),
      image: imageData,
    });

    const saved = await product.save();

    const obj = saved.toObject();
    if (obj.image && obj.image.data) {
      obj.imageUrl = `data:${obj.image.contentType};base64,${obj.image.data.toString("base64")}`;
    }

    res.status(201).json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- UPDATE PRODUCT ----------
app.put("/api/products/:id", upload.single("image"), async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      price: req.body.price ? Number(req.body.price) : 0,
      specifications: JSON.parse(req.body.specifications || "{}"),
    };

    if (req.file) {
      updateData.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    const obj = updated.toObject();
    if (obj.image && obj.image.data) {
      obj.imageUrl = `data:${obj.image.contentType};base64,${obj.image.data.toString("base64")}`;
    }

    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- DELETE PRODUCT ----------
app.delete("/api/products/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });

    res.json({ message: "Deleted", product: deleted.name });
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
      $or: [{ name: { $regex: q, $options: "i" } }],
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

// ---------- START SERVER ----------
async function startServer() {
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

startServer();
