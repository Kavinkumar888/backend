// server/index.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// In-memory storage (replace with database in production)
let products = [];

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/products', (req, res) => {
  res.json(products);
});

app.post('/api/products', upload.single('image'), (req, res) => {
  try {
    const productData = {
      id: 'prod-' + Date.now(),
      ...req.body,
      specifications: typeof req.body.specifications === 'string' 
        ? JSON.parse(req.body.specifications) 
        : req.body.specifications,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    products.push(productData);
    
    console.log('✅ Product created:', productData.name);
    res.status(201).json(productData);
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', upload.single('image'), (req, res) => {
  try {
    const productId = req.params.id;
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedData = {
      ...req.body,
      specifications: typeof req.body.specifications === 'string' 
        ? JSON.parse(req.body.specifications) 
        : req.body.specifications,
      updatedAt: new Date().toISOString()
    };

    // Keep existing image if no new image uploaded
    if (req.file) {
      updatedData.image = `/uploads/${req.file.filename}`;
    } else {
      updatedData.image = products[productIndex].image;
    }

    products[productIndex] = { ...products[productIndex], ...updatedData };
    
    console.log('✅ Product updated:', products[productIndex].name);
    res.json(products[productIndex]);
  } catch (error) {
    console.error('❌ Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const productId = req.params.id;
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const deletedProduct = products.splice(productIndex, 1)[0];
    console.log('✅ Product deleted:', deletedProduct.name);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});