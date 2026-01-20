import express from "express";
import multer from "multer";
import fs from "fs";
import Product from "../models/Product.js";

const router = express.Router();

/* 🔥 CACHE */
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000;

/* 🔥 MULTER */
const upload = multer({ dest: "uploads/" });

/* 🔥 IMAGE URL */
const imgUrl = (req, file) =>
  `${req.protocol}://${req.get("host")}/uploads/${file}`;

/* ================= GET PRODUCTS ================= */
router.get("/", async (req, res) => {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) {
    return res.json(cache);
  }

  const page = Number(req.query.page || 1);
  const limit = Math.min(Number(req.query.limit || 20), 20);

  const products = await Product.find()
    .select("name price image")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  cache = products;
  cacheTime = now;
  res.json(products);
});

/* ================= SEARCH ================= */
router.get("/search", async (req, res) => {
  const q = req.query.q || "";
  const products = await Product.find(
    { $text: { $search: q } },
    { score: { $meta: "textScore" } }
  )
    .select("name price image")
    .limit(20)
    .lean();

  res.json(products);
});

/* ================= CREATE ================= */
router.post("/", upload.single("image"), async (req, res) => {
  const data = req.body;
  if (req.file) data.image = imgUrl(req, req.file.filename);

  const product = await Product.create(data);
  cache = null;
  res.status(201).json(product);
});

/* ================= UPDATE ================= */
router.put("/:id", upload.single("image"), async (req, res) => {
  const data = req.body;
  if (req.file) data.image = imgUrl(req, req.file.filename);

  const product = await Product.findByIdAndUpdate(req.params.id, data, {
    new: true,
  });
  cache = null;
  res.json(product);
});

/* ================= DELETE ================= */
router.delete("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.sendStatus(404);

  if (product.image) {
    const f = product.image.split("/uploads/")[1];
    fs.existsSync(`uploads/${f}`) && fs.unlinkSync(`uploads/${f}`);
  }

  await product.deleteOne();
  cache = null;
  res.json({ success: true });
});

export default router;
