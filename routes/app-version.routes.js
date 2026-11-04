const express = require("express");
const path = require("path");
const router = express.Router();

/**
 * App Version Policy Endpoint
 * Returns the version policy JSON that controls in-app update prompts in the mobile app.
 * Edit remote-config/app-version.json to trigger or stop prompts without redeploying code.
 */
const getAppVersion = (req, res) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Content-Type", "application/json");
  res.sendFile(
    path.join(__dirname, "..", "remote-config", "app-version.json")
  );
};

// GET /api/app-version
router.get("/", getAppVersion);
router.get("", getAppVersion);

module.exports = router;
