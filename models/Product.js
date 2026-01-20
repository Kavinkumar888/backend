import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    image: String,
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
