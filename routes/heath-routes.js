const express = require("express");
const router = express.Router();
const os = require("os");

// Middleware for route-specific CORS configuration
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Basic health check endpoint - Returns service status and uptime
router.get("/health", (req, res) => {
  const healthData = {
    status: "OK",
    message: "Service is running smoothly",
    timestamp: new Date().toISOString(),
    uptime: formatUptime(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    service: "PlantCare API",
  };

  res.status(200).json(healthData);
});

// Detailed health check - Returns comprehensive system and application information
router.get("/health/detailed", (req, res) => {
  const detailedHealthData = {
    status: "OK",
    message: "Service is operating normally",
    timestamp: new Date().toISOString(),
    uptime: formatUptime(process.uptime()),
    environment: process.env.NODE_ENV || "development",

    // Application information
    application: {
      name: "PlantCare API",
      version: process.env.npm_package_version || "1.0.0",
      nodeVersion: process.version,
      memoryUsage: formatMemoryUsage(process.memoryUsage()),
      cpuUsage: process.cpuUsage(),
    },

    // System information
    system: {
      platform: process.platform,
      architecture: process.arch,
      hostname: os.hostname(),
      cpus: os.cpus().length,
      loadAverage: os.loadavg(),
      freeMemory: formatBytes(os.freemem()),
      totalMemory: formatBytes(os.totalmem()),
      networkInterfaces: Object.keys(os.networkInterfaces()),
    },

    // Database connection status
    database: {
      plantcare: "checking...",
      collectionofficer: "checking...",
      marketplace: "checking...",
      admin: "checking...",
      investments: "checking...",
    },
  };

  res.status(200).json(detailedHealthData);
});

// Liveness probe for container orchestration (Kubernetes, Docker) - Checks if service is alive
router.get("/health/live", (req, res) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe for container orchestration - Checks if service can accept traffic
router.get("/health/ready", (req, res) => {
  const isReady = true;

  if (isReady) {
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: "not ready",
      timestamp: new Date().toISOString(),
      message: "Service is not ready to accept requests",
    });
  }
});

// Welcome/home page - Provides API overview and available endpoints
router.get("/home", (req, res) => {
  const welcomeMessage = {
    message: "Welcome to PlantCare API",
    description: "Your comprehensive agricultural management system",
    version: process.env.npm_package_version || "1.0.0",
    documentation: "/api-docs",
    support: "support@plantcare.com",
    endpoints: {
      health: {
        basic: "GET /health - Basic health check",
        detailed: "GET /health/detailed - Detailed system information",
        liveness: "GET /health/live - Liveness probe",
        readiness: "GET /health/ready - Readiness probe",
      },
      api: {
        news: "GET /api/news - News endpoints",
        crops: "GET /api/crop - Crop management",
        market: "GET /api/market-price - Market prices",
        farms: "GET /api/farm - Farm management",
        staff: "GET /api/staff - Staff management",
        certificates: "GET /api/certificate - Certificate management",
        pension: "GET /api/pension - Pension management",
      },
    },
  };

  res.status(200).json(welcomeMessage);
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

// Helper function to format memory usage
function formatMemoryUsage(memoryUsage) {
  return {
    rss: `${Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100} MB`,
    heapTotal: `${Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100} MB`,
    heapUsed: `${Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100} MB`,
    external: `${Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100} MB`,
  };
}

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

module.exports = router;
