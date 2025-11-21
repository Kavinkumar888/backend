import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import 'dotenv/config';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB Connection from .env
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kavi8668182885_db_user:7pnnMgfVvmY9b06r@cluster0.rnt5vif.mongodb.net/textile_store?retryWrites=true&w=majority';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for memory storage (store image in buffer)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Product Schema
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
    data: Buffer,
    contentType: String
  },
  imageUrl: String,
  productUrl: String,
  inStock: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);

// MongoDB connection
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB Atlas successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const productsCount = await Product.countDocuments();
    
    res.json({ 
      status: 'OK', 
      message: 'Backend server is running smoothly with MongoDB Atlas!',
      timestamp: new Date().toISOString(),
      productsCount: productsCount,
      database: 'MongoDB Atlas with Image Storage',
      server: 'ES Module Version'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'MongoDB connection issue',
      error: error.message 
    });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    console.log('📦 Fetching products from MongoDB, count:', products.length);
    
    // Convert binary image data to base64 for frontend
    const productsWithImages = products.map(product => {
      const productObj = product.toObject();
      
      if (productObj.image && productObj.image.data) {
        productObj.imageUrl = `data:${productObj.image.contentType};base64,${productObj.image.data.toString('base64')}`;
      } else {
        productObj.imageUrl = 'https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Product+Image';
      }
      
      return productObj;
    });
    
    res.json(productsWithImages);
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      details: error.message 
    });
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const productObj = product.toObject();
    
    // Convert binary image data to base64 for frontend
    if (productObj.image && productObj.image.data) {
      productObj.imageUrl = `data:${productObj.image.contentType};base64,${productObj.image.data.toString('base64')}`;
    } else {
      productObj.imageUrl = 'https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Product+Image';
    }
    
    res.json(productObj);
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    res.status(500).json({ 
      error: 'Failed to fetch product',
      details: error.message 
    });
  }
});

// Get product image by ID
app.get('/api/products/:id/image', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product || !product.image || !product.image.data) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    res.set('Content-Type', product.image.contentType);
    res.send(product.image.data);
  } catch (error) {
    console.error('❌ Error fetching product image:', error);
    res.status(500).json({ 
      error: 'Failed to fetch product image',
      details: error.message 
    });
  }
});

// Create new product with image
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    console.log('🆕 Creating new product in MongoDB with image...');
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file ? `Size: ${req.file.size} bytes, Type: ${req.file.mimetype}` : 'No file');

    // Generate product URL based on categories
    const generateProductUrl = (product) => {
      if (!product.mainCategory && !product.subCategory) {
        return '/products';
      }

      const baseUrl = '/products?';
      const params = new URLSearchParams();

      if (product.mainCategory) {
        params.append('category', product.mainCategory);
      }

      if (product.mainCategory === 'fabrics structure' && product.subCategory) {
        params.append('subCategory', product.subCategory);
      } 
      else if (product.mainCategory === 'woven fabrics' && product.subCategory) {
        if (['greige', 'rfd', 'solid', 'printed'].includes(product.subCategory)) {
          params.append('type', product.subCategory);
          if (product.nestedCategory) {
            params.append('fabricType', product.nestedCategory);
          }
        } else {
          params.append('subCategory', product.subCategory);
        }
      } 
      else if (product.mainCategory === 'fabrics finish' && product.subCategory) {
        params.append('subCategory', product.subCategory);
      }

      return baseUrl + params.toString();
    };

    const productUrl = generateProductUrl({
      mainCategory: req.body.mainCategory,
      subCategory: req.body.subCategory,
      nestedCategory: req.body.nestedCategory
    });

    // Prepare image data for MongoDB
    let imageData = null;
    if (req.file) {
      imageData = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    }

    const productData = {
      name: req.body.name,
      price: req.body.price ? parseFloat(req.body.price) : 0,
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
      specifications: {
        category: req.body.mainCategory,
        subCategory: req.body.subCategory,
        composition: req.body.composition,
        gsm: req.body.gsm,
        width: req.body.width,
        count: req.body.count,
        construction: req.body.construction,
        weave: req.body.weave,
        finish: req.body.finish
      },
      image: imageData,
      productUrl: productUrl,
      inStock: true
    };

    const newProduct = new Product(productData);
    const savedProduct = await newProduct.save();
    
    // Convert binary image to base64 for response
    const productResponse = savedProduct.toObject();
    if (productResponse.image && productResponse.image.data) {
      productResponse.imageUrl = `data:${productResponse.image.contentType};base64,${productResponse.image.data.toString('base64')}`;
    }
    
    console.log('✅ Product created successfully in MongoDB:', savedProduct.name);
    console.log('🔗 Generated URL:', productUrl);
    console.log('📝 MongoDB ID:', savedProduct._id);
    
    res.status(201).json(productResponse);
    
  } catch (error) {
    console.error('❌ Error creating product in MongoDB:', error);
    res.status(500).json({ 
      error: 'Failed to create product',
      details: error.message 
    });
  }
});

// Update product with image
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  try {
    const productId = req.params.id;
    const existingProduct = await Product.findById(productId);
    
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log('✏️ Updating product in MongoDB:', productId);

    // Generate updated product URL
    const generateProductUrl = (product) => {
      if (!product.mainCategory && !product.subCategory) {
        return '/products';
      }

      const baseUrl = '/products?';
      const params = new URLSearchParams();

      if (product.mainCategory) {
        params.append('category', product.mainCategory);
      }

      if (product.mainCategory === 'fabrics structure' && product.subCategory) {
        params.append('subCategory', product.subCategory);
      } 
      else if (product.mainCategory === 'woven fabrics' && product.subCategory) {
        if (['greige', 'rfd', 'solid', 'printed'].includes(product.subCategory)) {
          params.append('type', product.subCategory);
          if (product.nestedCategory) {
            params.append('fabricType', product.nestedCategory);
          }
        } else {
          params.append('subCategory', product.subCategory);
        }
      } 
      else if (product.mainCategory === 'fabrics finish' && product.subCategory) {
        params.append('subCategory', product.subCategory);
      }

      return baseUrl + params.toString();
    };

    const productUrl = generateProductUrl({
      mainCategory: req.body.mainCategory,
      subCategory: req.body.subCategory,
      nestedCategory: req.body.nestedCategory
    });

    const updatedData = {
      name: req.body.name,
      price: req.body.price ? parseFloat(req.body.price) : 0,
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
      specifications: {
        category: req.body.mainCategory,
        subCategory: req.body.subCategory,
        composition: req.body.composition,
        gsm: req.body.gsm,
        width: req.body.width,
        count: req.body.count,
        construction: req.body.construction,
        weave: req.body.weave,
        finish: req.body.finish
      },
      productUrl: productUrl
    };

    // Handle image update
    if (req.file) {
      updatedData.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    // Convert binary image to base64 for response
    const productResponse = updatedProduct.toObject();
    if (productResponse.image && productResponse.image.data) {
      productResponse.imageUrl = `data:${productResponse.image.contentType};base64,${productResponse.image.data.toString('base64')}`;
    }
    
    console.log('✅ Product updated successfully in MongoDB:', updatedProduct.name);
    
    res.json(productResponse);
    
  } catch (error) {
    console.error('❌ Error updating product in MongoDB:', error);
    res.status(500).json({ 
      error: 'Failed to update product',
      details: error.message 
    });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const deletedProduct = await Product.findByIdAndDelete(productId);
    
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log('🗑️ Product deleted from MongoDB, ID:', productId);
    
    res.json({ 
      message: 'Product deleted successfully',
      deletedProduct: deletedProduct.name 
    });
    
  } catch (error) {
    console.error('❌ Error deleting product from MongoDB:', error);
    res.status(500).json({ 
      error: 'Failed to delete product',
      details: error.message 
    });
  }
});

// Get products by category
app.get('/api/products/category/:mainCategory', async (req, res) => {
  try {
    const mainCategory = req.params.mainCategory;
    const products = await Product.find({ mainCategory }).sort({ createdAt: -1 });
    
    // Convert binary image data to base64 for frontend
    const productsWithImages = products.map(product => {
      const productObj = product.toObject();
      
      if (productObj.image && productObj.image.data) {
        productObj.imageUrl = `data:${productObj.image.contentType};base64,${productObj.image.data.toString('base64')}`;
      } else {
        productObj.imageUrl = 'https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Product+Image';
      }
      
      return productObj;
    });
    
    console.log(`📂 Fetching products for category: ${mainCategory}, count: ${products.length}`);
    res.json(productsWithImages);
  } catch (error) {
    console.error('❌ Error fetching products by category:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products by category',
      details: error.message 
    });
  }
});

// Search products
app.get('/api/products/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const products = await Product.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { composition: { $regex: query, $options: 'i' } },
        { 'specifications.composition': { $regex: query, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });
    
    // Convert binary image data to base64 for frontend
    const productsWithImages = products.map(product => {
      const productObj = product.toObject();
      
      if (productObj.image && productObj.image.data) {
        productObj.imageUrl = `data:${productObj.image.contentType};base64,${productObj.image.data.toString('base64')}`;
      } else {
        productObj.imageUrl = 'https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Product+Image';
      }
      
      return productObj;
    });
    
    console.log(`🔍 Search results for "${query}": ${products.length} products`);
    res.json(productsWithImages);
  } catch (error) {
    console.error('❌ Error searching products:', error);
    res.status(500).json({ 
      error: 'Failed to search products',
      details: error.message 
    });
  }
});

// Initialize database connection and start server
async function startServer() {
  await connectToDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📦 Products API: http://localhost:${PORT}/api/products`);
    console.log(`💾 Storage: MongoDB Atlas with Image Binary Storage`);
    console.log(`🔗 MongoDB URI: ${MONGODB_URI}`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer().catch(console.error);