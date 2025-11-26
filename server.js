import express from "express";
import cors from "cors";
import multer from "multer";
import mongoose from "mongoose";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 10000;

// ------------------------- MongoDB -------------------------
const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://kavi8668182885_db_user:7pnnMgfVvmY9b06r@cluster0.rnt5vif.mongodb.net/sss_venture";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// ------------------------- Middleware -------------------------
app.use(
  cors({
    origin: [
      "https://sssventures.in",
      "https://www.sssventures.in",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// ------------------------- Multer (1MB limit) -------------------------
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
});

// ------------------------- Schema -------------------------
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

    productUrl: String,

    specifications: {
      composition: String,
      gsm: String,
      width: String,
      count: String,
      construction: String,
      weave: String,
      finish: String,
    },

    image: {
      data: Buffer,
      contentType: String,
    },

    imageUrl: String,
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

// ------------------------- Health Check -------------------------
app.get("/api/health", async (req, res) => {
  const count = await Product.countDocuments();
  res.json({ status: "OK", time: Date.now(), products: count });
});

// ------------------------- GET ALL PRODUCTS -------------------------
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    const output = products.map((p) => {
      const obj = p.toObject();

      // convert mongo buffer -> base64
      if (obj.image?.data) {
        obj.imageUrl = `data:${obj.image.contentType};base64,${obj.image.data.toString(
          "base64"
        )}`;
      } else {
        obj.imageUrl = null;
      }

      return obj;
    });

    res.json({ products: output });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------- CREATE PRODUCT -------------------------
app.post("/api/products", upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "Image is required (max 1MB)" });

    let specs = {};
    try {
      specs =
        typeof req.body.specifications === "string"
          ? JSON.parse(req.body.specifications)
          : req.body.specifications;
    } catch {
      specs = {};
    }

    const product = new Product({
      name: req.body.name,
      price: req.body.price ? Number(req.body.price) : 0,

      mainCategory: req.body.mainCategory,
      subCategory: req.body.subCategory,
      nestedCategory: req.body.nestedCategory,

      composition: req.body.composition,
      gsm: req.body.gsm,
      width: req.body.width,
      count: req.body.count,
      construction: req.body.construction,
      weave: req.body.weave,
      finish: req.body.finish,

      specifications: specs,
      productUrl: req.body.productUrl,

      image: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
    });

    const saved = await product.save();

    const obj = saved.toObject();
    obj.imageUrl = `data:${saved.image.contentType};base64,${saved.image.data.toString(
      "base64"
    )}`;

    res.status(201).json({ message: "Product created", product: obj });
  } catch (err) {
    console.log("❌ Create Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------------- UPDATE PRODUCT -------------------------
app.put("/api/products/:id", upload.single("image"), async (req, res) => {
  try {
    let specs = {};
    try {
      specs =
        typeof req.body.specifications === "string"
          ? JSON.parse(req.body.specifications)
          : req.body.specifications;
    } catch {
      specs = {};
    }

    const updateData = {
      name: req.body.name,
      price: req.body.price ? Number(req.body.price) : 0,

      mainCategory: req.body.mainCategory,
      subCategory: req.body.subCategory,
      nestedCategory: req.body.nestedCategory,

      composition: req.body.composition,
      gsm: req.body.gsm,
      width: req.body.width,
      count: req.body.count,
      construction: req.body.construction,
      weave: req.body.weave,
      finish: req.body.finish,

      specifications: specs,
      productUrl: req.body.productUrl,
    };

    if (req.file) {
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

    if (!updated) return res.status(404).json({ error: "Not found" });

    const obj = updated.toObject();
    if (obj.image?.data) {
      obj.imageUrl = `data:${obj.image.contentType};base64,${obj.image.data.toString(
        "base64"
      )}`;
    }

    res.json({ message: "Product updated", product: obj });
  } catch (err) {
    console.log("❌ Update Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------------- DELETE PRODUCT -------------------------
app.delete("/api/products/:id", async (req, res) => {
  try {
    const del = await Product.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ error: "Not found" });

    res.json({ message: "Deleted", id: del._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------- 404 -------------------------
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ------------------------- Start Server -------------------------
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT} (base64 images enabled)`)
);
