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

exports.getProductVariants = (productId, branchId) => {
  return new Promise((resolve, reject) => {
    const uomQuery = `
      SELECT baseUom, isMRP
      FROM shopproducts
      WHERE id = ? AND isActive = 1
    `;

    db.govishop.query(uomQuery, [productId], (uomError, uomResult) => {
      if (uomError) return reject(uomError);
      if (!uomResult || uomResult.length === 0) return resolve([]);

      const { baseUom, isMRP } = uomResult[0];

      if (baseUom === "Equipment") {
        const query = `
          SELECT
            ec.id                                    AS variantId,
            NULL                                     AS qty,
            NULL                                     AS uom,
            ec.color                                 AS color,
            COALESCE(SUM(si.purchQty), 0)            AS availableQty,
            (SELECT s2.salePrice FROM stockin s2
              INNER JOIN equipmentcolors ec2 ON s2.equipColorId = ec2.id
              WHERE ec2.id = ec.id AND s2.branchId = ?
                AND (s2.expiryDate IS NULL OR s2.expiryDate > NOW())
              ORDER BY s2.createdAt DESC LIMIT 1)    AS latestSalePrice,
            (SELECT s2.originalPrice FROM stockin s2
              INNER JOIN equipmentcolors ec2 ON s2.equipColorId = ec2.id
              WHERE ec2.id = ec.id AND s2.branchId = ?
                AND (s2.expiryDate IS NULL OR s2.expiryDate > NOW())
              ORDER BY s2.createdAt DESC LIMIT 1)    AS latestOriginalPrice,
            (SELECT s3.salePrice FROM stockin s3
              INNER JOIN equipmentcolors ec3 ON s3.equipColorId = ec3.id
              WHERE ec3.id = ec.id AND s3.branchId = ?
                AND (s3.expiryDate IS NULL OR s3.expiryDate > NOW())
              ORDER BY s3.createdAt ASC LIMIT 1)     AS oldestSalePrice,
            (SELECT s3.originalPrice FROM stockin s3
              INNER JOIN equipmentcolors ec3 ON s3.equipColorId = ec3.id
              WHERE ec3.id = ec.id AND s3.branchId = ?
                AND (s3.expiryDate IS NULL OR s3.expiryDate > NOW())
              ORDER BY s3.createdAt ASC LIMIT 1)     AS oldestOriginalPrice,
            (SELECT s4.salePrice FROM stockin s4
              INNER JOIN equipmentcolors ec4 ON s4.equipColorId = ec4.id
              WHERE ec4.id = ec.id AND s4.branchId = ?
                AND (s4.expiryDate IS NULL OR s4.expiryDate > NOW())
              ORDER BY s4.createdAt ASC LIMIT 1 OFFSET 1) AS nextBatchSalePrice
          FROM equipmentcolors ec
          INNER JOIN stockin si
            ON si.equipColorId = ec.id
            AND si.branchId = ?
            AND (si.expiryDate IS NULL OR si.expiryDate > NOW())
          WHERE ec.productId = ?
          GROUP BY ec.id
          HAVING availableQty > 0
        `;
        return db.govishop.query(
          query,
          [
            branchId,
            branchId,
            branchId,
            branchId,
            branchId,
            branchId,
            productId,
          ],
          (err, rows) => {
            if (err) return reject(err);
            resolve(
              (rows || [])
                .map((r) => resolveStockPrice(r, isMRP))
                .filter(Boolean),
            );
          },
        );
      }

      if (baseUom === "Pieces") {
        const subQuery = `
          SELECT
            sp.id                                    AS variantId,
            sp.qty                                   AS qty,
            sp.unit                                  AS uom,
            COALESCE(SUM(si.purchQty), 0)            AS availableQty,
            (SELECT s2.salePrice FROM stockin s2
              WHERE s2.subProdId = sp.id AND s2.branchId = ?
                AND (s2.expiryDate IS NULL OR s2.expiryDate > NOW())
              ORDER BY s2.createdAt DESC LIMIT 1)    AS latestSalePrice,
            (SELECT s2.originalPrice FROM stockin s2
              WHERE s2.subProdId = sp.id AND s2.branchId = ?
                AND (s2.expiryDate IS NULL OR s2.expiryDate > NOW())
              ORDER BY s2.createdAt DESC LIMIT 1)    AS latestOriginalPrice,
            (SELECT s3.salePrice FROM stockin s3
              WHERE s3.subProdId = sp.id AND s3.branchId = ?
                AND (s3.expiryDate IS NULL OR s3.expiryDate > NOW())
              ORDER BY s3.createdAt ASC LIMIT 1)     AS oldestSalePrice,
            (SELECT s3.originalPrice FROM stockin s3
              WHERE s3.subProdId = sp.id AND s3.branchId = ?
                AND (s3.expiryDate IS NULL OR s3.expiryDate > NOW())
              ORDER BY s3.createdAt ASC LIMIT 1)     AS oldestOriginalPrice,
            (SELECT s4.salePrice FROM stockin s4
              WHERE s4.subProdId = sp.id AND s4.branchId = ?
                AND (s4.expiryDate IS NULL OR s4.expiryDate > NOW())
              ORDER BY s4.createdAt ASC LIMIT 1 OFFSET 1) AS nextBatchSalePrice
          FROM subproducts sp
          INNER JOIN stockin si
            ON si.subProdId = sp.id
            AND si.branchId = ?
            AND (si.expiryDate IS NULL OR si.expiryDate > NOW())
          WHERE sp.productId = ? AND sp.isAvailable = 1
          GROUP BY sp.id
        `;

        db.govishop.query(
          subQuery,
          [
            branchId,
            branchId,
            branchId,
            branchId,
            branchId,
            branchId,
            productId,
          ],
          (subErr, subRows) => {
            if (subErr) return reject(subErr);
            if (!subRows || subRows.length === 0) return resolve([]);

            const subIds = subRows.map((r) => r.variantId);
            const colorQuery = `
              SELECT subProdId, color
              FROM subproductcolors
              WHERE subProdId IN (?)
              ORDER BY subProdId ASC, color ASC
            `;
            db.govishop.query(colorQuery, [subIds], (colorErr, colorRows) => {
              if (colorErr) return reject(colorErr);

              const colorMap = {};
              (colorRows || []).forEach((c) => {
                if (!colorMap[c.subProdId]) colorMap[c.subProdId] = [];
                colorMap[c.subProdId].push(c.color);
              });

              resolve(
                subRows
                  .map((sp) => {
                    const resolved = resolveStockPrice(sp, isMRP);
                    if (!resolved) return null;
                    return {
                      ...resolved,
                      colors: colorMap[sp.variantId] ?? [],
                    };
                  })
                  .filter(Boolean),
              );
            });
          },
        );
        return;
      }

      const query = `
        SELECT
          sp.id                                    AS variantId,
          sp.qty                                   AS qty,
          sp.unit                                  AS uom,
          sp.width                                 AS width,
          sp.height                                AS height,
          COALESCE(SUM(si.purchQty), 0)            AS availableQty,
          (SELECT s2.salePrice FROM stockin s2
            WHERE s2.subProdId = sp.id AND s2.branchId = ?
              AND (s2.expiryDate IS NULL OR s2.expiryDate > NOW())
            ORDER BY s2.createdAt DESC LIMIT 1)    AS latestSalePrice,
          (SELECT s2.originalPrice FROM stockin s2
            WHERE s2.subProdId = sp.id AND s2.branchId = ?
              AND (s2.expiryDate IS NULL OR s2.expiryDate > NOW())
            ORDER BY s2.createdAt DESC LIMIT 1)    AS latestOriginalPrice,
          (SELECT s3.salePrice FROM stockin s3
            WHERE s3.subProdId = sp.id AND s3.branchId = ?
              AND (s3.expiryDate IS NULL OR s3.expiryDate > NOW())
            ORDER BY s3.createdAt ASC LIMIT 1)     AS oldestSalePrice,
          (SELECT s3.originalPrice FROM stockin s3
            WHERE s3.subProdId = sp.id AND s3.branchId = ?
              AND (s3.expiryDate IS NULL OR s3.expiryDate > NOW())
            ORDER BY s3.createdAt ASC LIMIT 1)     AS oldestOriginalPrice,
          (SELECT s4.salePrice FROM stockin s4
            WHERE s4.subProdId = sp.id AND s4.branchId = ?
              AND (s4.expiryDate IS NULL OR s4.expiryDate > NOW())
            ORDER BY s4.createdAt ASC LIMIT 1 OFFSET 1) AS nextBatchSalePrice
        FROM subproducts sp
        INNER JOIN stockin si
          ON si.subProdId = sp.id
          AND si.branchId = ?
          AND (si.expiryDate IS NULL OR si.expiryDate > NOW())
        WHERE sp.productId = ? AND sp.isAvailable = 1
        GROUP BY sp.id
        HAVING availableQty > 0
        ORDER BY sp.qty ASC, sp.unit ASC
      `;

      db.govishop.query(
        query,
        [branchId, branchId, branchId, branchId, branchId, branchId, productId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(
            (rows || [])
              .map((r) => resolveStockPrice(r, isMRP))
              .filter(Boolean),
          );
        },
      );
    });
  });
};

function resolveStockPrice(row, isMRP) {
  const rawSale = isMRP ? row.oldestSalePrice : row.latestSalePrice;
  const rawOriginal = isMRP ? row.oldestOriginalPrice : row.latestOriginalPrice;

  const salePrice = rawSale ? Number(rawSale) : 0;
  const originalPrice = rawOriginal ? Number(rawOriginal) : null;

  const discountPrice =
    originalPrice && salePrice < originalPrice ? salePrice : null;
  const normalPrice = discountPrice ? originalPrice : salePrice;

  if (normalPrice === 0 && !discountPrice) return null;

  const nextBatchPrice =
    isMRP && row.nextBatchSalePrice != null
      ? Number(row.nextBatchSalePrice)
      : null;

  return {
    variantId: row.variantId,
    qty: row.qty ?? null,
    uom: row.uom ?? null,
    color: row.color ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
    normalPrice,
    discountPrice,
    availableQty: Number(row.availableQty ?? 0),
    isMRP: isMRP ? 1 : 0,
    nextBatchPrice,
  };
}
