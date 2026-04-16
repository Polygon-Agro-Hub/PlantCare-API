const db = require("../startup/database");

exports.getShops = (search = "") => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        gs.id,
        gs.shopName,
        gs.logo,
        gs.approvedStatus,
        COUNT(sp.id) AS productCount
      FROM govishops gs
      INNER JOIN shopcategories sc ON sc.shopId = gs.id
      INNER JOIN shopproducts sp   ON sp.categoryId = sc.id
      WHERE gs.approvedStatus = ?
        AND (
          gs.shopName  LIKE ? OR
          sp.prodName  LIKE ? OR
          sp.keyWords  LIKE ?
        )
      GROUP BY 
        gs.id,
        gs.shopName,
        gs.logo,
        gs.approvedStatus
    `;
    const searchTerm = `%${search}%`;
    const params = ["Approved", searchTerm, searchTerm, searchTerm];

    db.govishop.query(query, params, (error, results) => {
      if (error) {
        console.error("Error fetching shops:", error);
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};