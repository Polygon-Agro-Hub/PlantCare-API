const db = require("../startup/database");

exports.getShops = (search = "") => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        gs.id          AS shopId,
        gs.shopName,
        gs.logo,
        gs.approvedStatus,
        b.id           AS branchId,
        b.branchName,
        b.district,
        b.province,
        b.mobilePhone,
        b.isActive
      FROM govishops gs
      INNER JOIN branches b ON b.shopId = gs.id
      WHERE (
          gs.shopName  LIKE ? OR
          b.branchName LIKE ? OR
          b.district   LIKE ? OR
          b.province   LIKE ?
        )
      ORDER BY gs.shopName, b.branchName
    `;

    const searchTerm = `%${search}%`;
    const params = [searchTerm, searchTerm, searchTerm, searchTerm];

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

// Get categories for a branch
exports.getBranchCategories = (branchId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT DISTINCT
        sc.id        AS categoryId,
        sc.catName,
        sc.catCode,
        sc.thumbnail,
        sc.bgColor
      FROM branchproducts bp
      INNER JOIN shopproducts sp  ON sp.id = bp.productId
      INNER JOIN shopcategories sc ON sc.id = sp.categoryId
      WHERE bp.branchId = ?
        AND sc.isActive = 1
        AND sp.isActive = 1
      ORDER BY sc.catName
    `;
    db.govishop.query(query, [branchId], (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
};

// Get products for a branch, optionally filtered by categoryId
exports.getBranchProducts = (branchId, categoryId = null) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        sp.id          AS productId,
        sp.prodCode,
        sp.prodName,
        sp.thumbnail,
        sp.baseUom,
        sp.uomUnit,
        sp.uomQty,
        sp.minQty,
        sp.maxQty,
        sp.keyWords,
        sp.discription,
        sc.id          AS categoryId,
        sc.catName,
        sc.bgColor
      FROM branchproducts bp
      INNER JOIN shopproducts sp   ON sp.id = bp.productId
      INNER JOIN shopcategories sc ON sc.id = sp.categoryId
      WHERE bp.branchId = ?
        AND sp.isActive = 1
        AND sc.isActive = 1
    `;

    const params = [branchId];

    if (categoryId) {
      query += ` AND sc.id = ?`;
      params.push(categoryId);
    }

    query += ` ORDER BY sc.catName, sp.prodName`;

    db.govishop.query(query, params, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
};
