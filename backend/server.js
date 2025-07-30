require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const reportRoutes = require("./routes/reportRoutes");

// Initialize Express
const app = express();

// ==============================================
// 1. Environment Configuration
// ==============================================
process.env.NODE_ENV = process.env.NODE_ENV || "development"; // Default to 'development'

// ==============================================
// 2. Middleware
// ==============================================
app.use(express.json());

// CORS Configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.NODE_ENV === "development" 
    ? ["http://localhost:5173"] 
    : []),
];

// Middleware to handle CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


// ==============================================
// 3. Database Connection
// ==============================================
connectDB();

// ==============================================
// 4. API Routes
// ==============================================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==============================================
// 5. Production Frontend Serving (Render)
// ==============================================
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/Task-Manager/dist");
  
  // Serve static frontend files
  app.use(express.static(frontendPath));
  
  // Handle SPA routing (fallback to index.html)
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// ==============================================
// 6. Error Handling
// ==============================================
// 404 Not Found
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }) // Show stacktrace in dev
  });
});

// ==============================================
// 7. Server Startup
// ==============================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ==============================================
  🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}
  ==============================================
  `);
});