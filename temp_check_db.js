const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "centerbeam.proxy.rlwy.net",
  user: "root",
  password: "cJQXColhqcMgBKWoyOTOlVsEIdhfKEta",
  port: 54310,
  database: "govi_shop"
});

connection.connect((err) => {
  if (err) {
    console.error("Connection error:", err);
    process.exit(1);
  }
  console.log("Connected to MySQL.");

  const queries = [
    `SELECT * FROM subproducts WHERE productId = 76`,
    `SELECT * FROM subproductcolors WHERE subProdId IN (SELECT id FROM subproducts WHERE productId = 76)`,
    `SELECT * FROM equipmentcolors WHERE productId = 7`
  ];

  function runQuery(index) {
    if (index >= queries.length) {
      connection.end();
      return;
    }
    const q = queries[index];
    console.log(`\n--- Query: ${q} ---`);
    connection.query(q, (error, results) => {
      if (error) {
        console.error("Query error:", error);
      } else {
        console.log(results);
      }
      runQuery(index + 1);
    });
  }

  runQuery(0);
});
