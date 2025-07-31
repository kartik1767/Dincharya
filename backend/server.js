require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Connect MongoDB
connectDB();

// CORS Configuration (Dev + Production)
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  process.env.CLIENT_URL,  // Production frontend URL
].filter(Boolean); // Remove undefined values (if CLIENT_URL missing)

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : '*', // Fallback to * if empty
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Middleware
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Serve uploads (if any)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Production: Serve React App
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  🚀 Backend running on port ${PORT}
  🌍 CORS allowed for: ${allowedOrigins.join(', ') || '*'}
  `);
});