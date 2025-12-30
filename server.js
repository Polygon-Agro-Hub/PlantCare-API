const express = require("express");
const cors = require("cors");
const {
  plantcare,
  collectionofficer,
  marketPlace,
  admin,
  investments,
} = require("./startup/database");
const helmet = require("helmet");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

const newsRoutes = require("./routes/news");
const cropRoutes = require("./routes/cropRoutes");
const MarketPriceRoutes = require("./routes/marketPriceRoutes");
const complainRoutes = require("./routes/complainRoutes");
const heathRoutes = require("./routes/heathRoutes");
const farmRoutes = require("./routes/farm.routes");
const staffRoutes = require("./routes/staffRoutes");
const certificateRoutes = require("./routes/certificate");
const requestInspectionRoutes = require("./routes/requestInspection");
const goviCapitalRoutes = require("./routes/goviCapital");
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply CORS for a specific origin
app.use(
  cors({
    origin: "http://localhost:8081", // The client origin that is allowed to access the resource
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed methods
    credentials: true, // Allow credentials (cookies, auth headers)
  })
);

// Explicitly handle OPTIONS requests for preflight
app.options(
  "*",
  cors({
    origin: "http://localhost:8081", // Allow the client origin for preflight
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed methods for the preflight response
    credentials: true,
  })
);

const DatabaseConnection = (db, name) => {
  db.getConnection((err, connection) => {
    if (err) {
      console.error(`Error getting connection from ${name}:`, err);
    } else {
      connection.ping((err) => {
        if (err) {
          console.error(`Error pinging ${name} database:`, err);
        } else {
          console.log(`Ping to ${name} database successful.`);
        }
        connection.release();
      });
    }
  });
};
// Initial database connections
DatabaseConnection(plantcare, "PlantCare");
DatabaseConnection(collectionofficer, "CollectionOfficer");
DatabaseConnection(marketPlace, "MarketPlace");
DatabaseConnection(admin, "Admin");
DatabaseConnection(investments, "Investment");

const myCropRoutes = require("./routes/UserCrop.routes");
app.use(process.env.AUTHOR, myCropRoutes);

const userRoutes = require("./routes/userAutth.routes");
app.use(process.env.AUTHOR, userRoutes);

const userFixedAssetsRoutes = require("./routes/fixedAsset.routes");
app.use(process.env.AUTHOR, userFixedAssetsRoutes);

const userCurrentAssetsRoutes = require("./routes/currentAssets.routes");
app.use(process.env.AUTHOR, userCurrentAssetsRoutes);

const publicforumRoutes = require("./routes/publicforum.routes");
app.use(process.env.AUTHOR, publicforumRoutes);

const calendartaskImages = require("./routes/cropCalendarimages-routes");
app.use(process.env.AUTHOR, calendartaskImages);

const reportRoutes = require("./routes/reportRoutes");
app.use(process.env.AUTHOR, reportRoutes);

app.get("/test", (req, res) => {
  res.json("test run!");
});
app.use("/api/news", newsRoutes);
app.use("/api/crop", cropRoutes);
app.use("/api/market-price", MarketPriceRoutes);
app.use("/api/complain", complainRoutes);

app.use("/api/farm", farmRoutes);

app.use("/api/staff", staffRoutes);

app.use("/api/requestInspection", requestInspectionRoutes);

app.use("/api/certificate", certificateRoutes);

app.use("/api/goviCapital", goviCapitalRoutes);

app.use("", heathRoutes);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

module.exports = app;
