// const express = require("express");
// const cors = require("cors"); 
// const { plantcare, collectionofficer, marketPlace, dash, admin } = require("./startup/database"); 

// require("dotenv").config();

// const app = express();
// const port = process.env.PORT || 3000;

// const newsRoutes = require("./routes/news");
// const cropRoutes = require("./routes/cropRoutes");
// const MarketPriceRoutes = require("./routes/marketPriceRoutes");
// const complainRoutes = require("./routes/complainRoutes");

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Apply CORS for a specific origin
// app.use(
//     cors({
//         origin: "http://localhost:8081", // The client origin that is allowed to access the resource
//         methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed methods
//         credentials: true, // Allow credentials (cookies, auth headers)
//     })
// );

// // Explicitly handle OPTIONS requests for preflight
// app.options(
//     "*",
//     cors({
//         origin: "http://localhost:8081", // Allow the client origin for preflight
//         methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed methods for the preflight response
//         credentials: true,
//     })
// );

// const DatabaseConnection = (db, name) => {
//     db.connect((err) => {
//         if (err) {
//             console.error(`Error connecting to the ${name} database:`, err);
//         } else {
//             console.log(`Connected to the ${name} database.`);
//         }
//     });

//     db.on('error', (err) => {
//         console.error(`Database error in ${name}:`, err);
//         if (err.code === 'PROTOCOL_CONNECTION_LOST') {
//             console.log(`Reconnecting to ${name} database...`);
//             DatabaseConnection(db, name);
//         }
//     });
// };

// // Initial database connections
// DatabaseConnection(plantcare, "PlantCare");
// DatabaseConnection(collectionofficer, "CollectionOfficer");
// DatabaseConnection(marketPlace, "MarketPlace");
// DatabaseConnection(dash, "Dash");
// DatabaseConnection(admin, "Admin");

// // Reconnect to the database every hour (3600000 ms = 1 hour)
// setInterval(() => {
//     console.log("Reconnecting to databases...");
//     DatabaseConnection(plantcare, "PlantCare");
//     DatabaseConnection(collectionofficer, "CollectionOfficer");
//     DatabaseConnection(marketPlace, "MarketPlace");
//     DatabaseConnection(dash, "Dash");
//     DatabaseConnection(admin, "Admin");
// }, 3600000); // 1 hour interval

// const myCropRoutes = require("./routes/UserCrop.routes");
// app.use(process.env.AUTHOR, myCropRoutes);

// const userRoutes = require("./routes/userAutth.routes");
// app.use(process.env.AUTHOR, userRoutes);

// const userFixedAssetsRoutes = require("./routes/fixedAsset.routes");
// app.use(process.env.AUTHOR, userFixedAssetsRoutes);

// const userCurrentAssetsRoutes = require("./routes/currentAssets.routes");
// app.use(process.env.AUTHOR, userCurrentAssetsRoutes);

// const publicforumRoutes = require("./routes/publicforum.routes");
// app.use(process.env.AUTHOR, publicforumRoutes);

// const calendartaskImages = require("./routes/cropCalendarimages-routes");
// app.use(process.env.AUTHOR, calendartaskImages);

// app.use("/api/news", newsRoutes);
// app.use("/api/crop", cropRoutes);
// app.use("/api/market-price", MarketPriceRoutes);
// app.use("/api/complain", complainRoutes);
// app.use("/home", (req, res) => {
//     res.send("Welcome to the home page");
// });

// app.listen(port, () => {
//     console.log(`Server running on http://localhost:${port}`);
// });


const express = require("express");
const cors = require("cors");
const { plantcare, collectionofficer, marketPlace, admin } = require("./startup/database");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

const newsRoutes = require("./routes/news");
const cropRoutes = require("./routes/cropRoutes");
const MarketPriceRoutes = require("./routes/marketPriceRoutes");
const complainRoutes = require("./routes/complainRoutes");
const heathRoutes = require("./routes/heathRoutes");
const farmRoutes = require("./routes/farm.routes")

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
    res.json("test run!")
})
app.use("/api/news", newsRoutes);
app.use("/api/crop", cropRoutes);
app.use("/api/market-price", MarketPriceRoutes);
app.use("/api/complain", complainRoutes);

app.use("/api/farm", farmRoutes);

app.use("", heathRoutes);


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});


module.exports = app;