// server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

// Import database connections
const {
  plantcare,
  collectionofficer,
  marketPlace,
  admin,
  investments,
  govishop,
} = require("./startup/database");

// Import routes
const newsRoutes = require("./routes/news-routes");
const cropRoutes = require("./routes/crop-routes");
const MarketPriceRoutes = require("./routes/market-price-routes");
const complainRoutes = require("./routes/complain-routes");
const heathRoutes = require("./routes/heath-routes");
const farmRoutes = require("./routes/farm-routes");
const staffRoutes = require("./routes/staff-routes");
const certificateRoutes = require("./routes/certificate-routes");
const requestInspectionRoutes = require("./routes/request-Inspection-routes");
const goviCapitalRoutes = require("./routes/govi-capital-routes");
const myCropRoutes = require("./routes/user-crop-routes");
const userRoutes = require("./routes/user-auth-routes");
const userFixedAssetsRoutes = require("./routes/fixed-asset-routes");
const userCurrentAssetsRoutes = require("./routes/current-assets-routes");
const publicforumRoutes = require("./routes/public-forum-routes");
const calendartaskImages = require("./routes/crop-calendar-images-routes");
const reportRoutes = require("./routes/report-routes");
const pentionRoutes = require("./routes/pension-routes");
const goviShopRoutes = require("./routes/govi-shop-routes");

const app = express();
const port = process.env.PORT || 3000;

/**
 * Database Connection Testing Function
 * Tests and verifies connections to all databases
 */
const testDatabaseConnection = (db, name) => {
  db.getConnection((err, connection) => {
    if (err) {
      console.error(`Error getting connection from ${name}:`, err);
      return;
    }

    connection.ping((err) => {
      if (err) {
        console.error(`Error pinging ${name} database:`, err);
      } else {
        console.log(`✓ Ping to ${name} database successful.`);
      }
      connection.release();
    });
  });
};

/**
 * Middleware Configuration
 */
const configureMiddleware = () => {
  // Security middleware
  app.use(helmet());

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS configuration
  const corsOptions = {
    origin: "http://localhost:8081",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
};

/**
 * Route Registration
 * Registers all application routes with their respective base paths
 */
const registerRoutes = () => {
  const authorBasePath = process.env.AUTHOR || "/api";

  // Public routes
  app.use("/api/news", newsRoutes);
  app.use("/api/crop", cropRoutes);
  app.use("/api/market-price", MarketPriceRoutes);
  app.use("/api/complain", complainRoutes);
  app.use("/api/farm", farmRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/requestInspection", requestInspectionRoutes);
  app.use("/api/certificate", certificateRoutes);
  app.use("/api/goviCapital", goviCapitalRoutes);
  app.use("/api/pension", pentionRoutes);
  app.use("/api/govi-shop", goviShopRoutes);
  app.use("", heathRoutes); // Health check routes

  // Protected routes (with AUTHOR prefix)
  app.use(authorBasePath, myCropRoutes);
  app.use(authorBasePath, userRoutes);
  app.use(authorBasePath, userFixedAssetsRoutes);
  app.use(authorBasePath, userCurrentAssetsRoutes);
  app.use(authorBasePath, publicforumRoutes);
  app.use(authorBasePath, calendartaskImages);
  app.use(authorBasePath, reportRoutes);
  app.use(authorBasePath, pentionRoutes);

  // Test route
  app.get("/test", (req, res) => {
    res.json({ 
      message: "Server is running successfully!",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // 404 handler for undefined routes
  app.use("*", (req, res) => {
    res.status(404).json({
      error: "Route not found",
      message: `Cannot ${req.method} ${req.originalUrl}`
    });
  });
};

/**
 * Error Handling Middleware
 */
const setupErrorHandlers = () => {
  // Global error handler
  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);

    // Don't expose error details in production
    const errorResponse = {
      error: "Internal server error",
      message: process.env.NODE_ENV === "production" 
        ? "An unexpected error occurred" 
        : err.message
    };

    res.status(err.status || 500).json(errorResponse);
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    // Gracefully shutdown
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  });
};

/**
 * Server Initialization
 * Starts the server and tests database connections
 */
const initializeServer = () => {
  try {
    // Test all database connections
    console.log("\n🔍 Testing database connections...");
    testDatabaseConnection(plantcare, "PlantCare");
    testDatabaseConnection(collectionofficer, "CollectionOfficer");
    testDatabaseConnection(marketPlace, "MarketPlace");
    testDatabaseConnection(admin, "Admin");
    testDatabaseConnection(investments, "Investment");
    testDatabaseConnection(govishop, "Govishop");

    // Start server
    app.listen(port, () => {
      console.log(`\n🚀 Server is running!`);
      console.log(`📡 URL: http://localhost:${port}`);
      console.log(`🔄 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`📝 Test endpoint: http://localhost:${port}/test`);
      console.log(`\n✅ All systems operational\n`);
    });

  } catch (error) {
    console.error("❌ Failed to initialize server:", error);
    process.exit(1);
  }
};

/**
 * Application Bootstrap
 * Main entry point for setting up the application
 */
const bootstrap = () => {
  console.log("⚙️  Initializing application...");

  configureMiddleware();
  registerRoutes();
  setupErrorHandlers();
  initializeServer();

  console.log("📦 Application setup complete!");
};

// Start the application
bootstrap();

// Export for testing purposes
module.exports = app;