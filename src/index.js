const { App } = require("@slack/bolt");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { logger } = require("./utils/logger");
const { setupScheduler } = require("./scheduler/weeklyCheckins");
const { setupSlackHandlers } = require("./handlers/slackHandlers");
const { setupDashboard } = require("./dashboard/server");

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Initialize Express server for dashboard
const expressApp = express();
const PORT = process.env.PORT || 3001; // Change from 3000 to 3001

// Security middleware
expressApp.use(helmet());
expressApp.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://your-domain.com"]
        : ["http://localhost:3001"], // Remove port 3000, keep only 3001
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
expressApp.use(limiter);

expressApp.use(express.json());

// Health check endpoint
expressApp.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

async function startApp() {
  try {
    // Setup Slack event handlers
    logger.info("Setting up Slack handlers...");
    await setupSlackHandlers(app);

    // Setup weekly scheduler
    logger.info("Setting up weekly scheduler...");
    await setupScheduler(app);

    // Setup dashboard
    logger.info("Setting up dashboard...");
    setupDashboard(expressApp);

    // Start Slack app
    await app.start();
    logger.info("⚡️ WDAI Hive Slack bot is running!");

    // Start Express server
    expressApp.listen(PORT, () => {
      logger.info(`🚀 Dashboard server running on port ${PORT}`);
      logger.info(`📊 Admin dashboard available at http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start WDAI Hive:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  await app.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully...");
  await app.stop();
  process.exit(0);
});

// Start the application
startApp();
