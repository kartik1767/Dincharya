require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const connectDB = require("./config/db");
const { UPLOAD_DIR } = require("./middlewares/uploadMiddleware");

const app = express();

// Render (and most hosts) sit behind a proxy; without this req.protocol is
// "http" and uploaded image URLs break on the https site (mixed content).
app.set("trust proxy", 1);

// Connect to MongoDB
connectDB();

// Apply CORS (expose Content-Disposition so report downloads keep their filename)
app.use(cors({ exposedHeaders: ["Content-Disposition"] }));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));

// Unknown API routes should be a JSON 404, not the SPA's index.html
app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// Serve uploads
app.use("/uploads", express.static(UPLOAD_DIR));

const buildPath = path.join(__dirname, "../frontend/Task-Manager/dist");

// Serve static files
app.use(express.static(buildPath));

// Serve index.html for all unmatched routes (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

// Error handler (multer file-type / size errors, malformed JSON, etc.)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "Image must be 2 MB or smaller" : err.message;
    return res.status(400).json({ message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Something went wrong" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
