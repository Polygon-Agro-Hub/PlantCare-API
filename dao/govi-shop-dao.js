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

exports.getBranchProducts = (branchId, categoryId = null) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        sp.id          AS productId,
        sp.prodCode,
        sp.prodName,
        sp.thumbnail,
        sp.baseUom,      
        sp.searchKeyWord,
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

exports.getProductVariants = (productId) => {
  return new Promise((resolve, reject) => {
    const uomQuery = `
      SELECT baseUom 
      FROM shopproducts 
      WHERE id = ? AND isActive = 1
    `;

    db.govishop.query(uomQuery, [productId], (uomError, uomResult) => {
      if (uomError) return reject(uomError);
      if (!uomResult || uomResult.length === 0) return resolve([]);

      const baseUom = uomResult[0].baseUom;

      if (baseUom === "Equipment") {
        const query = `
          SELECT
            ec.id            AS variantId,
            NULL             AS qty,
            NULL             AS uom,
            ec.color         AS color,
            350   AS normalPrice,
            300 AS discountPrice
          FROM equipmentcolors ec
          INNER JOIN shopproducts sp ON sp.id = ec.productId
          WHERE ec.productId = ?
          ORDER BY ec.color ASC
        `;
        return db.govishop.query(query, [productId], (error, results) => {
          if (error) return reject(error);
          resolve(results);
        });
      }

      if (baseUom === "Pieces") {
        const subQuery = `
          SELECT
            id             AS variantId,
            qty            AS qty,
            unit           AS uom,
            300    AS normalPrice,
            250  AS discountPrice
          FROM subproducts
          WHERE productId = ?
            AND isAvailable = 1
          ORDER BY qty ASC
        `;

        db.govishop.query(subQuery, [productId], (subError, subResults) => {
          if (subError) return reject(subError);
          if (!subResults || subResults.length === 0) return resolve([]);

          const subIds = subResults.map((r) => r.variantId);

          const colorQuery = `
            SELECT
              subProdId,
              color
            FROM subproductcolors
            WHERE subProdId IN (?)
            ORDER BY subProdId ASC, color ASC
          `;

          db.govishop.query(
            colorQuery,
            [subIds],
            (colorError, colorResults) => {
              if (colorError) return reject(colorError);

              const colorMap = {};
              (colorResults || []).forEach((c) => {
                if (!colorMap[c.subProdId]) colorMap[c.subProdId] = [];
                colorMap[c.subProdId].push(c.color);
              });

              const merged = subResults.map((sp) => ({
                variantId: sp.variantId,
                qty: sp.qty,
                uom: sp.uom,
                normalPrice: sp.normalPrice,
                discountPrice: sp.discountPrice,
                colors: colorMap[sp.variantId] ?? [],
              }));

              resolve(merged);
            },
          );
        });

        return;
      }

      const query = `
        SELECT
          id             AS variantId,
          qty            AS qty,
          unit           AS uom,
          400    AS normalPrice,
          350  AS discountPrice,
          width          AS width,
          height         AS height
        FROM subproducts
        WHERE productId = ?
          AND isAvailable = 1
        ORDER BY qty ASC, unit ASC
      `;

      db.govishop.query(query, [productId], (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });
  });
};
