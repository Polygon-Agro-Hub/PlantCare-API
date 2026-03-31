const db = require("../startup/database");

exports.getShops = (search) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        gs.id,
        gs.shopName,
        gs.logo,
        COUNT(sp.id) AS productCount
      FROM govishops gs
      LEFT JOIN shopcategories sc ON sc.shopId = gs.id
      LEFT JOIN shopproducts sp ON sp.categoryId = sc.id
      WHERE gs.isActive = 1
        AND gs.approvedStatus = 'Approved'
    `;

    const params = [];

    // 🔍 Search condition (shop name OR product name)
    if (search) {
      query += `
        AND (
          gs.shopName LIKE ? 
          OR sp.prodName LIKE ?
        )
      `;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += `
      GROUP BY gs.id
      ORDER BY gs.createdAt DESC
    `;

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