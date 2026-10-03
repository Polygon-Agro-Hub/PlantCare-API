const express = require("express");
const router = express.Router();
const os = require("os");
const path = require("path");

// ============================================================================
// 1. SERVICE METADATA & CONFIGURATION
// ============================================================================
let pkg = {};
try {
  pkg = require(path.join(__dirname, "../package.json"));
} catch (_) {
  pkg = {};
}

const SERVICE_NAME = "PlantCare API";
const SERVICE_VERSION = pkg.version || "1.0.0";

// ============================================================================
// 2. DATABASE POOLS
// ============================================================================
const { plantcare, collectionofficer, admin } = require("../startup/database");

const databasePools = {
  plantcare,
  collectionofficer,
  admin,
};

// ============================================================================
// 3. CORS & ROUTE MIDDLEWARE
// ============================================================================
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// ============================================================================
// 4. DATABASE CONNECTIVITY TEST HELPER
// ============================================================================
const testConnection = (pool, name) => {
  return new Promise((resolve) => {
    if (!pool) {
      return resolve({
        name,
        status: "disconnected",
        latencyMs: 0,
        error: "Database pool not found",
      });
    }

    const startTime = Date.now();
    let hasResolved = false;

    // 3-second safeguard timeout
    const timeout = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        resolve({
          name,
          status: "timeout",
          latencyMs: Date.now() - startTime,
          error: "Connection check timed out after 3000ms",
        });
      }
    }, 3000);

    pool.getConnection((err, connection) => {
      if (hasResolved) {
        if (connection) connection.release();
        return;
      }

      if (err) {
        clearTimeout(timeout);
        hasResolved = true;
        return resolve({
          name,
          status: "disconnected",
          latencyMs: Date.now() - startTime,
          error: err.message,
        });
      }

      connection.ping((pingErr) => {
        clearTimeout(timeout);
        connection.release();
        if (hasResolved) return;
        hasResolved = true;

        if (pingErr) {
          resolve({
            name,
            status: "disconnected",
            latencyMs: Date.now() - startTime,
            error: pingErr.message,
          });
        } else {
          resolve({
            name,
            status: "connected",
            latencyMs: Date.now() - startTime,
          });
        }
      });
    });
  });
};

const checkAllDatabases = async () => {
  const dbEntries = Object.entries(databasePools);
  const results = await Promise.allSettled(
    dbEntries.map(([key, pool]) => testConnection(pool, key))
  );

  const connections = {};
  let connectedCount = 0;
  const totalCount = dbEntries.length;

  results.forEach((res, index) => {
    const key = dbEntries[index][0];
    if (res.status === "fulfilled") {
      connections[key] = res.value.status;
      if (res.value.status === "connected") {
        connectedCount++;
      }
    } else {
      connections[key] = "disconnected";
    }
  });

  const allConnected = connectedCount === totalCount;
  const anyConnected = connectedCount > 0;

  return {
    status: allConnected ? "connected" : anyConnected ? "degraded" : "disconnected",
    allConnected,
    anyConnected,
    connections,
    connectedCount,
    totalCount,
  };
};

// ============================================================================
// 5. DIAGNOSTIC FORMATTERS & HELPERS
// ============================================================================
function formatUptime(seconds) {
  const s = Math.floor(seconds);
  const days = Math.floor(s / (3600 * 24));
  const hours = Math.floor((s % (3600 * 24)) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatMemoryUsage(memoryUsage) {
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
  const heapPercentage = ((heapUsedMB / heapTotalMB) * 100).toFixed(1) + "%";

  return {
    rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${heapTotalMB.toFixed(2)} MB`,
    heapUsed: `${heapUsedMB.toFixed(2)} MB`,
    external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
    heapUsedPercent: heapPercentage,
  };
}

// ============================================================================
// 6. HEALTH ROUTES & ENDPOINTS
// ============================================================================

router.get(["/health", "/healthz"], (req, res) => {
  res.status(200).json({
    status: "OK",
    healthy: true,
    message: "Service is running smoothly",
    timestamp: new Date().toISOString(),
    uptime: formatUptime(process.uptime()),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    version: SERVICE_VERSION,
    service: SERVICE_NAME,
  });
});

router.get(["/health/detailed", "/health/details"], async (req, res) => {
  const dbHealth = await checkAllDatabases();

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1) + "%";

  const isHealthy = dbHealth.allConnected;
  const statusCode = isHealthy ? 200 : dbHealth.anyConnected ? 207 : 503;

  res.status(statusCode).json({
    status: isHealthy ? "OK" : dbHealth.anyConnected ? "Degraded" : "Unhealthy",
    healthy: isHealthy,
    statusCode,
    message: isHealthy
      ? "All systems and database connections are operating normally"
      : "One or more database connections are degraded or unavailable",
    timestamp: new Date().toISOString(),
    uptime: formatUptime(process.uptime()),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",

    application: {
      name: SERVICE_NAME,
      version: SERVICE_VERSION,
      nodeVersion: process.version,
      pid: process.pid,
      memoryUsage: formatMemoryUsage(process.memoryUsage()),
      cpuUsage: process.cpuUsage(),
    },

    system: {
      platform: process.platform,
      architecture: process.arch,
      hostname: os.hostname(),
      cpus: os.cpus().length,
      loadAverage: os.loadavg(),
      freeMemory: formatBytes(freeMem),
      totalMemory: formatBytes(totalMem),
      memoryUsagePercent: memUsagePercent,
      systemUptime: formatUptime(os.uptime()),
      networkInterfaces: Object.keys(os.networkInterfaces()),
    },

    database: dbHealth.connections,
    databaseSummary: {
      status: dbHealth.status,
      connected: dbHealth.connectedCount,
      total: dbHealth.totalCount,
    },
  });
});

router.get("/health/live", (req, res) => {
  res.status(200).json({
    status: "alive",
    healthy: true,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

router.get("/health/ready", async (req, res) => {
  try {
    const dbHealth = await checkAllDatabases();

    if (dbHealth.allConnected) {
      res.status(200).json({
        status: "ready",
        healthy: true,
        timestamp: new Date().toISOString(),
        databases: dbHealth.connections,
      });
    } else {
      res.status(503).json({
        status: "not ready",
        healthy: false,
        timestamp: new Date().toISOString(),
        message: "Database connection checks failed",
        databases: dbHealth.connections,
      });
    }
  } catch (error) {
    res.status(503).json({
      status: "not ready",
      healthy: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

router.get("/version", (req, res) => {
  res.status(200).json({
    name: SERVICE_NAME,
    version: SERVICE_VERSION,
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString(),
  });
});

router.get("/health/db/:database", async (req, res) => {
  const { database } = req.params;
  const pool = databasePools[database];

  if (!pool) {
    return res.status(404).json({
      error: "Database not found",
      message: `Database '${database}' is not recognized`,
      configuredDatabases: Object.keys(databasePools),
    });
  }

  const result = await testConnection(pool, database);
  const isConnected = result.status === "connected";

  res.status(isConnected ? 200 : 503).json({
    database,
    status: result.status,
    latencyMs: result.latencyMs,
    error: result.error,
    timestamp: new Date().toISOString(),
  });
});

router.get("/metrics", (req, res) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  res.status(200).json({
    metrics: {
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
      },
      cpu: {
        user: `${cpuUsage.user} μs`,
        system: `${cpuUsage.system} μs`,
      },
      uptime: `${process.uptime().toFixed(1)}s`,
      uptimeFormatted: formatUptime(process.uptime()),
      pid: process.pid,
      nodeVersion: process.version,
    },
    timestamp: new Date().toISOString(),
  });
});

router.get("/home", (req, res) => {
  res.status(200).json({
    message: `Welcome to ${SERVICE_NAME}`,
    description: "Plant Care, Crop Health & Agro Diagnostic API",
    version: SERVICE_VERSION,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: {
        basic: "GET /health (or /healthz) - Lightweight service status & uptime",
        detailed: "GET /health/detailed (or /health/details) - System metrics & live database ping",
        liveness: "GET /health/live - Container liveness probe",
        readiness: "GET /health/ready - Container readiness probe",
        databaseTest: "GET /health/db/:database - Diagnostic check for single database pool",
        metrics: "GET /metrics - CPU, RAM and process metrics",
        version: "GET /version - Service release version",
      },
      api: {
        news: "GET /api/news - Agricultural news & articles",
        crop: "GET /api/crop - Crop calendar and guides",
        marketPrice: "GET /api/market-price - Daily market prices",
        complain: "GET/POST /api/complain - Farmer issues and complaints",
        farm: "GET/POST /api/farm - Farm registration and management",
        staff: "GET /api/staff - Field officer staff directory",
        requestInspection: "POST /api/requestInspection - Farm inspection requests",
        certificate: "GET/POST /api/certificate - Organic & GAP certificates",
        goviCapital: "GET/POST /api/goviCapital - Farmer loan & capital requests",
        pension: "GET/POST /api/pension - Agro pension management",
        goviShop: "GET /api/govi-shop - Agro inputs shop",
        appVersion: "GET /api/app-version - App version policy for update prompts",
      },
    },
  });
});

module.exports = router;
