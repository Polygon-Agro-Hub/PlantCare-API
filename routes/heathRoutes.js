const express = require("express");
const router = express.Router();

router.use((req, res, next) => {
  res.header("Access-Control-Allow-Methods", "GET");
  next();
});
router.get("/health", (req, res) => {
  const data = {
    uptime: process.uptime(),
    message: "Ok",
    date: new Date(),
  };

  res.status(200).send(data);
});
router.get("/home", (req, res) => {
  res.send("Welcome to the home page");
});
module.exports = router;
