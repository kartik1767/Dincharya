require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB
connectDB();

// Apply CORS
app.use(cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Serve uploads (if needed)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const buildPath = path.join(__dirname, "../frontend/Task-Manager/dist");

// ✅ Serve static files
app.use(express.static(buildPath));

// ✅ Serve index.html for all unmatched routes (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
