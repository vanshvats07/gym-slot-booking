require("dotenv").config();

const express = require("express");
const path = require("path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const sessionRoutes = require("./routes/sessions");
const bookingRoutes = require("./routes/bookings");
const adminRoutes = require("./routes/admin");
const { requireAuth, allowRoles } = require("./middleware/auth");

const app = express();

app.use(express.json({ limit: "100kb" }));

app.get("/admin.html", requireAuth, allowRoles("admin"), (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Gym Slot Booking API is running"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.use((error, req, res, next) => {
  const status = Number.isInteger(error.status) &&
    error.status >= 400 &&
    error.status < 600
    ? error.status
    : 500;

  console.error("Request failed:", {
    name: error.name || "Error",
    status,
    path: req.path
  });

  let message = "Internal server error";
  if (status === 400) message = "Invalid request body";
  if (status === 413) message = "Request body is too large";
  if (status < 500) message = "Request failed";

  res.status(status).json({ success: false, message });
});

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error("Failed to start server: JWT_SECRET must contain at least 32 characters.");
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error("Failed to start server: MONGO_URI is missing.");
    process.exit(1);
  }

  try {
    await connectDB();

    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch {
    console.error("Failed to start server: database connection failed.");
    process.exit(1);
  }
}

startServer();
