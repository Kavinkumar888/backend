import express from "express";
import multer from "multer";
import fs from "fs";
import Product from "../models/Product.js";

const router = express.Router();

/* -------- MULTER CONFIG -------- */
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE),
  },
  fileFilter(req, file, cb) {
    const allowed = process.env.ALLOWED_FILE_TYPES.split(",");
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Invalid file type"));
    }
    cb(null, true);
  },
});

/* -------- IMAGE URL GENERATOR -------- */
const getImageUrl = (req, filename) => {
  return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
};

/* -------- GET PRODUCTS -------- */
router.get("/", async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 100);

  const products = await Product.find()
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.json(products);
});

/* -------- SEARCH -------- */
router.get("/search", async (req, res) => {
  const q = req.query.q || "";
  const products = await Product.find({
    name: { $regex: q, $options: "i" },
  });
  res.json(products);
});

/* -------- CREATE -------- */
router.post("/", upload.single("image"), async (req, res) => {
  const data = req.body;

  if (data.specifications) {
    data.specifications = JSON.parse(data.specifications);
  }

  if (req.file) {
    data.image = getImageUrl(req, req.file.filename);
  }

  const product = await Product.create(data);
  res.status(201).json(product);
});

/* -------- UPDATE -------- */
router.put("/:id", upload.single("image"), async (req, res) => {
  const data = req.body;

  if (data.specifications) {
    data.specifications = JSON.parse(data.specifications);
  }

  if (req.file) {
    data.image = getImageUrl(req, req.file.filename);
  }

  const product = await Product.findByIdAndUpdate(req.params.id, data, {
    new: true,
  });

  res.json(product);
});

/* -------- DELETE -------- */
router.delete("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Not found" });

  if (product.image) {
    const filename = product.image.split("/uploads/")[1];
    const path = `uploads/${filename}`;
    fs.existsSync(path) && fs.unlinkSync(path);
  }

  await product.deleteOne();
  res.json({ success: true });
});

/* -------- EXPORT -------- */
router.get("/export-products", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

export default router;
