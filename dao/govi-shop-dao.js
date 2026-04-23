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

      // ─────────────────────────────────────────────
      // EQUIPMENT
      // ─────────────────────────────────────────────
      if (baseUom === "Equipment") {
        const query = `
          SELECT
            ec.id        AS variantId,
            NULL         AS qty,
            NULL         AS uom,
            ec.color     AS color,
            NULL         AS width,
            NULL         AS height,
            si.purchQty  AS batchQty,
            si.salePrice AS salePrice,
            si.originalPrice AS originalPrice,
            si.createdAt AS createdAt
          FROM equipmentcolors ec
          INNER JOIN stockin si
            ON si.equipColorId = ec.id
            AND si.branchId = ?
            AND (si.expiryDate IS NULL OR si.expiryDate > NOW())
            AND si.purchQty > 0
          WHERE ec.productId = ?
          ORDER BY ec.id ASC, si.createdAt ASC
        `;

        return db.govishop.query(
          query,
          [branchId, productId],
          (err, rows) => {
            if (err) return reject(err);
            const grouped = groupAndResolve(rows, isMRP);
            resolve(grouped);
          }
        );
      }

      // ─────────────────────────────────────────────
      // PIECES  (has color chips per sub-product)
      // ─────────────────────────────────────────────
      if (baseUom === "Pieces") {
        const subQuery = `
          SELECT
            sp.id        AS variantId,
            sp.qty       AS qty,
            sp.unit      AS uom,
            NULL         AS color,
            NULL         AS width,
            NULL         AS height,
            si.purchQty  AS batchQty,
            si.salePrice AS salePrice,
            si.originalPrice AS originalPrice,
            si.createdAt AS createdAt
          FROM subproducts sp
          INNER JOIN stockin si
            ON si.subProdId = sp.id
            AND si.branchId = ?
            AND (si.expiryDate IS NULL OR si.expiryDate > NOW())
            AND si.purchQty > 0
          WHERE sp.productId = ? AND sp.isAvailable = 1
          ORDER BY sp.id ASC, si.createdAt ASC
        `;

        db.govishop.query(
          subQuery,
          [branchId, productId],
          (subErr, subRows) => {
            if (subErr) return reject(subErr);
            if (!subRows || subRows.length === 0) return resolve([]);

            const resolved = groupAndResolve(subRows, isMRP);
            if (resolved.length === 0) return resolve([]);

            const subIds = resolved.map((r) => r.variantId);
            const colorQuery = `
              SELECT subProdId, color
              FROM subproductcolors
              WHERE subProdId IN (?)
              ORDER BY subProdId ASC, color ASC
            `;

            db.govishop.query(
              colorQuery,
              [subIds],
              (colorErr, colorRows) => {
                if (colorErr) return reject(colorErr);

                const colorMap = {};
                (colorRows || []).forEach((c) => {
                  if (!colorMap[c.subProdId]) colorMap[c.subProdId] = [];
                  colorMap[c.subProdId].push(c.color);
                });

                resolve(
                  resolved.map((v) => ({
                    ...v,
                    colors: colorMap[v.variantId] ?? [],
                  }))
                );
              }
            );
          }
        );
        return;
      }

      // ─────────────────────────────────────────────
      // DEFAULT  (Loose / Roll / any other baseUom)
      // ─────────────────────────────────────────────
      const query = `
        SELECT
          sp.id        AS variantId,
          sp.qty       AS qty,
          sp.unit      AS uom,
          NULL         AS color,
          sp.width     AS width,
          sp.height    AS height,
          si.purchQty  AS batchQty,
          si.salePrice AS salePrice,
          si.originalPrice AS originalPrice,
          si.createdAt AS createdAt
        FROM subproducts sp
        INNER JOIN stockin si
          ON si.subProdId = sp.id
          AND si.branchId = ?
          AND (si.expiryDate IS NULL OR si.expiryDate > NOW())
          AND si.purchQty > 0
        WHERE sp.productId = ? AND sp.isAvailable = 1
        ORDER BY sp.qty ASC, sp.unit ASC, si.createdAt ASC
      `;

      db.govishop.query(
        query,
        [branchId, productId],
        (err, rows) => {
          if (err) return reject(err);
          const grouped = groupAndResolve(rows, isMRP);
          resolve(grouped);
        }
      );
    });
  });
};

// ─────────────────────────────────────────────────────────────
// groupAndResolve
//
// Groups raw per-batch rows by variantId, merges consecutive
// batches that have the same salePrice, then resolves pricing.
//
// isMRP = 1  → FIFO: display price = oldest batch price
//              availableQty = total across all batches
//              batches[] returned in createdAt ASC order
//
// isMRP = 0  → display price = latest batch price
//              availableQty = total across all batches
//              batches[] still returned (single merged entry)
// ─────────────────────────────────────────────────────────────
function groupAndResolve(rows, isMRP) {
  if (!rows || rows.length === 0) return [];

  // Step 1: group rows by variantId, preserving order
  const variantMap = new Map();
  for (const r of rows) {
    const key = r.variantId;
    if (!variantMap.has(key)) {
      variantMap.set(key, { meta: r, batchRows: [] });
    }
    variantMap.get(key).batchRows.push(r);
  }

  const result = [];

  for (const [, { meta, batchRows }] of variantMap) {
    // Step 2: build raw batch list (filter zero qty rows just in case)
    const rawBatches = batchRows
      .filter((r) => Number(r.batchQty) > 0)
      .map((r) => ({
        qty: Number(r.batchQty),
        salePrice: Number(r.salePrice ?? 0),
        originalPrice: r.originalPrice ? Number(r.originalPrice) : null,
      }));

    if (rawBatches.length === 0) continue;

    // Step 3: merge consecutive batches with identical salePrice
    // e.g. [5@1200, 3@1200, 4@1205] → [8@1200, 4@1205]
    const mergedBatches = [];
    for (const b of rawBatches) {
      const last = mergedBatches[mergedBatches.length - 1];
      if (last && last.salePrice === b.salePrice) {
        last.qty += b.qty;
        // keep originalPrice from first batch in the group
      } else {
        mergedBatches.push({ ...b });
      }
    }

    // Step 4: total qty across all merged batches
    const totalQty = mergedBatches.reduce((sum, b) => sum + b.qty, 0);

    // Step 5: resolve display price
    // isMRP=1 → show oldest (first) batch price on the card
    // isMRP=0 → show latest (last) batch price on the card
    const displayBatch = isMRP
      ? mergedBatches[0]
      : mergedBatches[mergedBatches.length - 1];

    const salePrice = displayBatch.salePrice;
    const originalPrice = displayBatch.originalPrice;

    const discountPrice =
      originalPrice && salePrice < originalPrice ? salePrice : null;
    const normalPrice = discountPrice ? originalPrice : salePrice;

    if (normalPrice === 0 && !discountPrice) continue;

    result.push({
      variantId: meta.variantId,
      qty: meta.qty ?? null,
      uom: meta.uom ?? null,
      color: meta.color ?? null,
      width: meta.width ?? null,
      height: meta.height ?? null,
      normalPrice,
      discountPrice,
      availableQty: totalQty,      // always total across all batches
      isMRP: isMRP ? 1 : 0,
      // batches array — frontend uses this for boundary detection & modal
      // isMRP=0: still send batches so frontend can display if needed
      batches: mergedBatches.map((b) => ({
        qty: b.qty,
        salePrice: b.salePrice,
        originalPrice: b.originalPrice ?? null,
      })),
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// resolveStockPrice
//
// isMRP = 1  →  oldest batch pricing (FIFO stock consumption)
//               availableQty = oldest batch qty only  ← KEY CHANGE
//               nextBatchQty = second batch qty
//
// isMRP = 0  →  latest batch pricing
//               availableQty = total across all batches
// ─────────────────────────────────────────────────────────────
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

  // isMRP: show only the oldest batch qty as "available"
  // so the + button triggers the modal exactly when that batch runs out.
  // Non-isMRP: show total across all batches.
  const availableQty =
    isMRP && row.oldestBatchQty != null
      ? Number(row.oldestBatchQty)
      : Number(row.availableQty ?? 0);

  // Qty in the second-oldest batch (shown in modal as "remaining X bottles")
  const nextBatchQty =
    isMRP && row.nextBatchQty != null
      ? Number(row.nextBatchQty)
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
    availableQty,   // oldest-batch qty for isMRP, total for non-isMRP
    isMRP: isMRP ? 1 : 0,
    nextBatchPrice, // price of the second batch (null if only one batch)
    nextBatchQty,   // qty  of the second batch (null if only one batch)
  };
}