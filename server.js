require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const app = require("./app");

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
    const server = app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
    let shuttingDown = false;
    const shutdown = signal => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`Received ${signal}; shutting down.`);

      server.close(async error => {
        if (error) {
          console.error("Failed to close HTTP server.", {
            name: error?.name || "Error",
            code: error?.code
          });
          process.exitCode = 1;
        }

        try {
          await mongoose.disconnect();
          console.log("MongoDB disconnected.");
        } catch (disconnectError) {
          console.error("Failed to disconnect MongoDB.", {
            name: disconnectError?.name || "Error",
            code: disconnectError?.code
          });
          process.exitCode = 1;
        }
      });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server: database connection failed.", {
      name: error.name || "Error",
      code: error.code
    });
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
