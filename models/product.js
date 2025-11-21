import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    default: 0
  },
  mainCategory: {
    type: String,
    required: true
  },
  subCategory: {
    type: String,
    required: true
  },
  nestedCategory: {
    type: String,
    default: ''
  },
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
    finish: String
  },
  image: {
    data: Buffer, // Image will be stored as Binary data
    contentType: String // MIME type of the image
  },
  imageUrl: String, // Optional: URL if you want to store path instead
  productUrl: String,
  inStock: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Product', productSchema);