require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Connect MongoDB
connectDB();

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "https://dincharya.onrender.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Handle preflight
app.options("*", cors({
  origin: allowedOrigins,
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
  const buildPath = path.join(__dirname, "../frontend/Task-Manager/dist");
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
