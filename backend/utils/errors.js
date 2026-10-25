// Turns Mongoose validation / cast errors into 400s instead of generic 500s.
const sendError = (res, error) => {
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }
  console.error(error);
  return res.status(500).json({ message: "Server error", error: error.message });
};

module.exports = { sendError };
