const db = require("../startup/database");

exports.getShops = (search = "", userDistrict = "") => {
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
      WHERE b.district = ?
      AND (

        -- ✅ PATH 1: Branch name / location match
        --    (branch-level fields only — safe, no cross-branch bleed)
        (
          (
            b.branchName LIKE ? OR
            b.district   LIKE ? OR
            b.province   LIKE ?
          )
          AND EXISTS (
            SELECT 1
            FROM branchproducts bp2
            INNER JOIN shopproducts sp2 ON sp2.id = bp2.productId
            WHERE bp2.branchId = b.id
              AND sp2.isActive = 1
          )
        )

        OR

        -- ✅ PATH 2: Shop name OR product name/keyword match
        --    Tied to EXISTS so only branches that HAVE the matching product show
        EXISTS (
          SELECT 1
          FROM branchproducts bp
          INNER JOIN shopproducts sp ON sp.id = bp.productId
          WHERE bp.branchId = b.id
            AND sp.isActive = 1
            AND (
              sp.prodName      LIKE ? OR
              sp.searchKeyWord LIKE ? OR
              gs.shopName      LIKE ?    -- ✅ shop name checked here, scoped per branch
            )
        )

      )
      ORDER BY gs.shopName, b.branchName
    `;

    const searchTerm = `%${search}%`;
    const params = [
      userDistrict,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
    ];

    db.govishop.query(query, params, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};

exports.getUserDistrict = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT district FROM users WHERE id = ? LIMIT 1`;
    db.plantcare.query(query, [userId], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results[0]?.district || null);
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

exports.getBranchProducts = (branchId, categoryId = null, search = "") => {
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

    if (search && search.trim().length > 0) {
      const keyword = `%${search.trim()}%`;
      query += ` AND (
        sp.prodName LIKE ?
        OR sp.searchKeyWord LIKE ?
      )`;
      params.push(keyword, keyword);
    }

    query += ` ORDER BY sp.prodName ASC`;

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
        // First try equipmentcolors (colored equipment)
        const colorQuery = `
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

        return db.govishop.query(colorQuery, [branchId, productId], (err, colorRows) => {
          if (err) return reject(err);

          // Has colored variants — use existing logic
          if (colorRows && colorRows.length > 0) {
            const grouped = groupAndResolve(colorRows, isMRP);
            return resolve(grouped);
          }

          // No colors — check direct stockin on productId (no subProd, no equipColor)
          const directQuery = `
      SELECT
        ? AS variantId,
        NULL AS qty,
        NULL AS uom,
        NULL AS color,
        NULL AS width,
        NULL AS height,
        si.purchQty  AS batchQty,
        si.salePrice AS salePrice,
        si.originalPrice AS originalPrice,
        si.createdAt AS createdAt
      FROM stockin si
      WHERE si.productId = ?
        AND si.branchId = ?
        AND si.subProdId IS NULL
        AND si.equipColorId IS NULL
        AND (si.expiryDate IS NULL OR si.expiryDate > NOW())
        AND si.purchQty > 0
      ORDER BY si.createdAt ASC
    `;

          db.govishop.query(directQuery, [productId, productId, branchId], (err2, directRows) => {
            if (err2) return reject(err2);
            if (!directRows || directRows.length === 0) return resolve([]);
            const grouped = groupAndResolve(directRows, isMRP);
            resolve(grouped);
          });
        });
      }

      if (baseUom === "Pieces") {
        const subQuery = `
    SELECT
      sp.id        AS variantId,
      sp.qty       AS qty,
      sp.unit      AS uom
    FROM subproducts sp
    WHERE sp.productId = ? AND sp.isAvailable = 1
    ORDER BY sp.qty ASC
  `;

        db.govishop.query(subQuery, [productId], (subErr, subRows) => {
          if (subErr) return reject(subErr);
          if (!subRows || subRows.length === 0) return resolve([]);

          const subIds = subRows.map((r) => r.variantId);

          const colorStockQuery = `
      SELECT
        spc.id          AS colorId,
        spc.subProdId   AS subProdId,
        spc.color       AS color,
        si.purchQty     AS batchQty,
        si.salePrice    AS salePrice,
        si.originalPrice AS originalPrice,
        si.createdAt    AS createdAt
      FROM subproductcolors spc
      INNER JOIN stockin si
        ON  si.subProdColorId = spc.id
        AND si.branchId       = ?
        AND (si.expiryDate IS NULL OR si.expiryDate > NOW())
        AND si.purchQty > 0
      WHERE spc.subProdId IN (?)
        AND spc.isAvailable = 1
      ORDER BY spc.subProdId ASC, spc.id ASC, si.createdAt ASC
    `;

          db.govishop.query(
            colorStockQuery,
            [branchId, subIds],
            (colorErr, colorRows) => {
              if (colorErr) return reject(colorErr);
              if (!colorRows || colorRows.length === 0) return resolve([]);

              const colorMap = new Map();
              for (const r of colorRows) {
                if (!colorMap.has(r.colorId)) {
                  colorMap.set(r.colorId, { meta: r, batchRows: [] });
                }
                colorMap.get(r.colorId).batchRows.push(r);
              }

              const resolvedColors = [];
              for (const [, { meta, batchRows }] of colorMap) {
                const rawBatches = batchRows
                  .filter((r) => Number(r.batchQty) > 0)
                  .map((r) => ({
                    qty: Number(r.batchQty),
                    salePrice: Number(r.salePrice ?? 0),
                    originalPrice: r.originalPrice
                      ? Number(r.originalPrice)
                      : null,
                  }));

                if (rawBatches.length === 0) continue;

                const mergedBatches = [];
                for (const b of rawBatches) {
                  const last = mergedBatches[mergedBatches.length - 1];
                  if (last && last.salePrice === b.salePrice) {
                    last.qty += b.qty;
                  } else {
                    mergedBatches.push({ ...b });
                  }
                }

                const totalQty = mergedBatches.reduce((s, b) => s + b.qty, 0);

                const displayBatch = isMRP
                  ? mergedBatches[0]
                  : mergedBatches[mergedBatches.length - 1];

                const salePrice = displayBatch.salePrice;
                const originalPrice = displayBatch.originalPrice;
                const discountPrice =
                  originalPrice && salePrice < originalPrice ? salePrice : null;
                const normalPrice = discountPrice ? originalPrice : salePrice;

                if (normalPrice === 0 && !discountPrice) continue;

                resolvedColors.push({
                  colorId: meta.colorId,
                  subProdId: meta.subProdId,
                  color: meta.color,
                  normalPrice,
                  discountPrice,
                  availableQty: totalQty,
                  isMRP: isMRP ? 1 : 0,
                  batches: mergedBatches.map((b) => ({
                    qty: b.qty,
                    salePrice: b.salePrice,
                    originalPrice: b.originalPrice ?? null,
                  })),
                });
              }

              if (resolvedColors.length === 0) return resolve([]);

              const subMap = new Map();
              for (const sub of subRows) {
                subMap.set(sub.variantId, { sub, colors: [] });
              }
              for (const c of resolvedColors) {
                if (subMap.has(c.subProdId)) {
                  subMap.get(c.subProdId).colors.push(c);
                }
              }

              const result = [];
              for (const [, { sub, colors }] of subMap) {
                if (colors.length === 0) continue;

                const first = colors[0];

                result.push({
                  variantId: sub.variantId,
                  qty: sub.qty,
                  uom: sub.uom,
                  color: null,
                  width: null,
                  height: null,
                  normalPrice: first.normalPrice,
                  discountPrice: first.discountPrice,
                  availableQty: first.availableQty,
                  isMRP: isMRP ? 1 : 0,

                  colorDetails: colors.map((c) => ({
                    colorId: c.colorId,
                    color: c.color,
                    normalPrice: c.normalPrice,
                    discountPrice: c.discountPrice,
                    availableQty: c.availableQty,
                    batches: c.batches,
                  })),
                });
              }

              resolve(result);
            },
          );
        });
        return;
      }

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

      db.govishop.query(query, [branchId, productId], (err, rows) => {
        if (err) return reject(err);
        const grouped = groupAndResolve(rows, isMRP);
        resolve(grouped);
      });
    });
  });
};

function groupAndResolve(rows, isMRP) {
  if (!rows || rows.length === 0) return [];

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
    const rawBatches = batchRows
      .filter((r) => Number(r.batchQty) > 0)
      .map((r) => ({
        qty: Number(r.batchQty),
        salePrice: Number(r.salePrice ?? 0),
        originalPrice: r.originalPrice ? Number(r.originalPrice) : null,
      }));

    if (rawBatches.length === 0) continue;

    const mergedBatches = [];
    for (const b of rawBatches) {
      const last = mergedBatches[mergedBatches.length - 1];
      if (last && last.salePrice === b.salePrice) {
        last.qty += b.qty;
      } else {
        mergedBatches.push({ ...b });
      }
    }

    const totalQty = mergedBatches.reduce((sum, b) => sum + b.qty, 0);

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
      availableQty: totalQty,
      isMRP: isMRP ? 1 : 0,

      batches: mergedBatches.map((b) => ({
        qty: b.qty,
        salePrice: b.salePrice,
        originalPrice: b.originalPrice ?? null,
      })),
    });
  }

  return result;
}

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

  const availableQty =
    isMRP && row.oldestBatchQty != null
      ? Number(row.oldestBatchQty)
      : Number(row.availableQty ?? 0);

  const nextBatchQty =
    isMRP && row.nextBatchQty != null ? Number(row.nextBatchQty) : null;

  return {
    variantId: row.variantId,
    qty: row.qty ?? null,
    uom: row.uom ?? null,
    color: row.color ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
    normalPrice,
    discountPrice,
    availableQty,
    isMRP: isMRP ? 1 : 0,
    nextBatchPrice,
    nextBatchQty,
  };
}

exports.upsertCartItem = async ({
  farmerId,
  branchId,
  productId,
  subProdId,
  subProdColorId,
  equipColorId,
  qty,
}) => {
  if (qty === 0) {
    await exports.removeCartItem({
      farmerId,
      productId,
      subProdId,
      subProdColorId,
      equipColorId,
    });
    return { message: "Item removed from cart" };
  }

  const cartId = await getOrCreateCart(farmerId);

  const productRows = await dbQuery(
    `SELECT isMRP FROM shopproducts WHERE id = ? AND isActive = 1 LIMIT 1`,
    [productId],
  );
  if (!productRows.length) throw new Error("Product not found");
  const isMRP = productRows[0].isMRP === 1;

  const existing = await findCartItem(
    cartId,
    productId,
    subProdId,
    subProdColorId,
    equipColorId,
  );

  let cartItemId;

  if (existing) {
    await dbQuery(`UPDATE cartitems SET qty = ? WHERE id = ?`, [
      qty,
      existing.id,
    ]);
    cartItemId = existing.id;
  } else {
    const insert = await dbQuery(
      `INSERT INTO cartitems
         (cartId, productId, subProdId, subProdColorId, equipColorId, qty)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        cartId,
        productId,
        subProdId ?? null,
        subProdColorId ?? null,
        equipColorId ?? null,
        qty,
      ],
    );
    cartItemId = insert.insertId;
  }

  if (isMRP) {
    const batches = await fetchBatches(subProdId, equipColorId, branchId);
    const allocation = allocateFIFO(batches, qty);
    await replaceCartItemStock(cartItemId, allocation);
  } else {
    await dbQuery(`DELETE FROM cartitemstock WHERE cartItemId = ?`, [
      cartItemId,
    ]);
  }

  return {
    cartId,
    cartItemId,
    qty,
    message: existing ? "Cart item updated" : "Item added to cart",
  };
};

exports.removeCartItem = async ({
  farmerId,
  productId,
  subProdId,
  subProdColorId,
  equipColorId,
}) => {
  const cartRows = await dbQuery(
    `SELECT id FROM cart WHERE farmerId = ? LIMIT 1`,
    [farmerId],
  );
  if (!cartRows.length) return;

  const cartId = cartRows[0].id;
  const item = await findCartItem(
    cartId,
    productId,
    subProdId,
    subProdColorId,
    equipColorId,
  );
  if (!item) return;

  await dbQuery(`DELETE FROM cartitemstock WHERE cartItemId = ?`, [item.id]);
  await dbQuery(`DELETE FROM cartitems WHERE id = ?`, [item.id]);
};

exports.getCart = async (farmerId) => {
  const cartRows = await dbQuery(
    `SELECT id FROM cart WHERE farmerId = ? LIMIT 1`,
    [farmerId],
  );
  if (!cartRows.length) return { cartId: null, items: [] };

  const cartId = cartRows[0].id;

  const items = await dbQuery(
    `SELECT
       ci.id            AS cartItemId,
       ci.productId,
       sp.prodName      AS productName,
       sp.thumbnail     AS productImage,
       sp.baseUom,
       ci.subProdId,
       ci.subProdColorId,
       ci.equipColorId,
       ci.qty,
       ci.createdAt
     FROM cartitems ci
     INNER JOIN shopproducts sp ON sp.id = ci.productId
     WHERE ci.cartId = ?
     ORDER BY ci.createdAt ASC`,
    [cartId],
  );

  return { cartId, items };
};

function dbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.govishop.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

async function getOrCreateCart(farmerId) {
  const rows = await dbQuery(`SELECT id FROM cart WHERE farmerId = ? LIMIT 1`, [
    farmerId,
  ]);
  if (rows.length > 0) return rows[0].id;

  const insert = await dbQuery(`INSERT INTO cart (farmerId) VALUES (?)`, [
    farmerId,
  ]);
  return insert.insertId;
}

async function findCartItem(
  cartId,
  productId,
  subProdId,
  subProdColorId,
  equipColorId,
) {
  const rows = await dbQuery(
    `SELECT id, qty FROM cartitems
     WHERE cartId         = ?
       AND productId      = ?
       AND (subProdId      <=> ?)
       AND (subProdColorId <=> ?)
       AND (equipColorId   <=> ?)
     LIMIT 1`,
    [cartId, productId, subProdId, subProdColorId, equipColorId],
  );
  return rows[0] ?? null;
}

async function fetchBatches(subProdId, equipColorId, branchId) {
  if (equipColorId) {
    return dbQuery(
      `SELECT id AS stockInId, purchQty AS availableQty, salePrice
       FROM stockin
       WHERE equipColorId = ?
         AND branchId     = ?
         AND purchQty     > 0
         AND (expiryDate IS NULL OR expiryDate > NOW())
       ORDER BY createdAt ASC`,
      [equipColorId, branchId],
    );
  }
  return dbQuery(
    `SELECT id AS stockInId, purchQty AS availableQty, salePrice
     FROM stockin
     WHERE subProdId = ?
       AND branchId  = ?
       AND purchQty  > 0
       AND (expiryDate IS NULL OR expiryDate > NOW())
     ORDER BY createdAt ASC`,
    [subProdId, branchId],
  );
}

function allocateFIFO(batches, totalQty) {
  const allocation = [];
  let remaining = totalQty;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.availableQty, remaining);
    allocation.push({ stockInId: batch.stockInId, outQty: take });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error(
      `Insufficient stock. Only ${totalQty - remaining} available.`,
    );
  }
  return allocation;
}

async function replaceCartItemStock(cartItemId, allocation) {
  await dbQuery(`DELETE FROM cartitemstock WHERE cartItemId = ?`, [cartItemId]);

  if (allocation.length === 0) return;

  const values = allocation.map((a) => [cartItemId, a.stockInId, a.outQty]);
  await dbQuery(
    `INSERT INTO cartitemstock (cartItemId, stockInId, outQty) VALUES ?`,
    [values],
  );
}