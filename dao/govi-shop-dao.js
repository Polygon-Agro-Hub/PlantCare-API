const db = require("../startup/database");

function dbQuery(sql, params = [], conn = null) {
  const executor = conn || db.govishop;
  return new Promise((resolve, reject) => {
    executor.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function getConnection(pool) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, conn) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });
}

function beginTransaction(conn) {
  return new Promise((resolve, reject) => {
    conn.beginTransaction((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function commitTransaction(conn) {
  return new Promise((resolve, reject) => {
    conn.commit((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function rollbackTransaction(conn) {
  return new Promise((resolve) => {
    conn.rollback(() => resolve());
  });
}

async function withTransaction(fn) {
  const conn = await getConnection(db.govishop);
  try {
    await beginTransaction(conn);
    const result = await fn(conn);
    await commitTransaction(conn);
    return result;
  } catch (err) {
    await rollbackTransaction(conn);
    throw err;
  } finally {
    conn.release();
  }
}

function groupAndResolve(rows, isMRP) {
  if (!rows || rows.length === 0) return [];

  const variantMap = new Map();
  for (const r of rows) {
    if (!variantMap.has(r.variantId)) {
      variantMap.set(r.variantId, { meta: r, batchRows: [] });
    }
    variantMap.get(r.variantId).batchRows.push(r);
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

async function getOrCreateCart(farmerId, branchId, conn) {
  const rows = await dbQuery(
    `SELECT id FROM cart WHERE farmerId = ? AND branchId = ? LIMIT 1`,
    [farmerId, branchId],
    conn,
  );
  if (rows.length > 0) return rows[0].id;

  const insert = await dbQuery(
    `INSERT INTO cart (farmerId, branchId) VALUES (?, ?)`,
    [farmerId, branchId],
    conn,
  );
  return insert.insertId;
}

async function findCartItem(
  cartId,
  productId,
  subProdId,
  subProdColorId,
  equipColorId,
  conn,
) {
  const rows = await dbQuery(
    `SELECT id, qty FROM cartitems
     WHERE cartId          = ?
       AND productId       = ?
       AND (subProdId      <=> ?)
       AND (subProdColorId <=> ?)
       AND (equipColorId   <=> ?)
     LIMIT 1`,
    [cartId, productId, subProdId, subProdColorId, equipColorId],
    conn,
  );
  return rows[0] ?? null;
}

async function fetchBatches(subProdId, equipColorId, branchId, conn) {
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
      conn,
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
    conn,
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

async function replaceCartItemStock(cartItemId, newAllocation) {
  const oldRows = await dbQuery(
    `SELECT stockInId, outQty FROM cartitemstock WHERE cartItemId = ?`,
    [cartItemId],
  );
  for (const row of oldRows) {
    await dbQuery(`UPDATE stockin SET purchQty = purchQty + ? WHERE id = ?`, [
      row.outQty,
      row.stockInId,
    ]);
  }

  await dbQuery(`DELETE FROM cartitemstock WHERE cartItemId = ?`, [cartItemId]);

  if (newAllocation.length === 0) return;

  const values = newAllocation.map((a) => [cartItemId, a.stockInId, a.outQty]);
  await dbQuery(
    `INSERT INTO cartitemstock (cartItemId, stockInId, outQty) VALUES ?`,
    [values],
  );

  for (const a of newAllocation) {
    await dbQuery(`UPDATE stockin SET purchQty = purchQty - ? WHERE id = ?`, [
      a.outQty,
      a.stockInId,
    ]);
  }
}

async function restoreAndDeleteCartItemStock(cartItemId) {
  const oldRows = await dbQuery(
    `SELECT stockInId, outQty FROM cartitemstock WHERE cartItemId = ?`,
    [cartItemId],
  );
  for (const row of oldRows) {
    await dbQuery(`UPDATE stockin SET purchQty = purchQty + ? WHERE id = ?`, [
      row.outQty,
      row.stockInId,
    ]);
  }
  await dbQuery(`DELETE FROM cartitemstock WHERE cartItemId = ?`, [cartItemId]);
}

exports.getShops = (search = "", userDistrict = "") => {
  return new Promise((resolve, reject) => {
    const query = `
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
        -- PATH 1: Branch name / location match
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
        -- PATH 2: Shop name OR product name/keyword match
        EXISTS (
          SELECT 1
          FROM branchproducts bp
          INNER JOIN shopproducts sp ON sp.id = bp.productId
          WHERE bp.branchId = b.id
            AND sp.isActive = 1
            AND (
              sp.prodName      LIKE ? OR
              sp.searchKeyWord LIKE ? OR
              gs.shopName      LIKE ?
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
      if (error) reject(error);
      else resolve(results);
    });
  });
};

exports.getUserDistrict = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT district FROM users WHERE id = ? LIMIT 1`;
    db.plantcare.query(query, [userId], (error, results) => {
      if (error) reject(error);
      else resolve(results[0]?.district || null);
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
      INNER JOIN shopproducts sp   ON sp.id = bp.productId
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
      query += ` AND (sp.prodName LIKE ? OR sp.searchKeyWord LIKE ?)`;
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
    db.govishop.query(
      `SELECT baseUom, isMRP FROM shopproducts WHERE id = ? AND isActive = 1`,
      [productId],
      (uomError, uomResult) => {
        if (uomError) return reject(uomError);
        if (!uomResult || uomResult.length === 0) return resolve([]);

        const { baseUom, isMRP } = uomResult[0];

        if (baseUom === "Equipment") {
          const colorQuery = `
            SELECT
              ec.id            AS variantId,
              NULL             AS qty,
              NULL             AS uom,
              ec.color         AS color,
              NULL             AS width,
              NULL             AS height,
              si.purchQty      AS batchQty,
              si.salePrice     AS salePrice,
              si.originalPrice AS originalPrice,
              si.createdAt     AS createdAt
            FROM equipmentcolors ec
            INNER JOIN stockin si
              ON  si.equipColorId = ec.id
              AND si.branchId     = ?
              AND (si.expiryDate IS NULL OR si.expiryDate > NOW())
              AND si.purchQty > 0
            WHERE ec.productId = ?
            ORDER BY ec.id ASC, si.createdAt ASC
          `;

          return db.govishop.query(
            colorQuery,
            [branchId, productId],
            (err, colorRows) => {
              if (err) return reject(err);

              if (colorRows && colorRows.length > 0) {
                return resolve(groupAndResolve(colorRows, isMRP));
              }

              const directQuery = `
              SELECT
                ?                AS variantId,
                NULL             AS qty,
                NULL             AS uom,
                NULL             AS color,
                NULL             AS width,
                NULL             AS height,
                si.purchQty      AS batchQty,
                si.salePrice     AS salePrice,
                si.originalPrice AS originalPrice,
                si.createdAt     AS createdAt
              FROM stockin si
              WHERE si.productId    = ?
                AND si.branchId     = ?
                AND si.subProdId    IS NULL
                AND si.equipColorId IS NULL
                AND (si.expiryDate IS NULL OR si.expiryDate > NOW())
                AND si.purchQty > 0
              ORDER BY si.createdAt ASC
            `;

              db.govishop.query(
                directQuery,
                [productId, productId, branchId],
                (err2, directRows) => {
                  if (err2) return reject(err2);
                  if (!directRows || directRows.length === 0)
                    return resolve([]);
                  resolve(groupAndResolve(directRows, isMRP));
                },
              );
            },
          );
        }

        if (baseUom === "Pieces") {
          const subQuery = `
            SELECT sp.id AS variantId, sp.qty AS qty, sp.unit AS uom
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
                spc.id           AS colorId,
                spc.subProdId    AS subProdId,
                spc.color        AS color,
                si.purchQty      AS batchQty,
                si.salePrice     AS salePrice,
                si.originalPrice AS originalPrice,
                si.createdAt     AS createdAt
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
                  if (!colorMap.has(r.colorId))
                    colorMap.set(r.colorId, { meta: r, batchRows: [] });
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
                    originalPrice && salePrice < originalPrice
                      ? salePrice
                      : null;
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
                for (const sub of subRows)
                  subMap.set(sub.variantId, { sub, colors: [] });
                for (const c of resolvedColors) {
                  if (subMap.has(c.subProdId))
                    subMap.get(c.subProdId).colors.push(c);
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
            sp.id            AS variantId,
            sp.qty           AS qty,
            sp.unit          AS uom,
            NULL             AS color,
            sp.width         AS width,
            sp.height        AS height,
            si.purchQty      AS batchQty,
            si.salePrice     AS salePrice,
            si.originalPrice AS originalPrice,
            si.createdAt     AS createdAt
          FROM subproducts sp
          INNER JOIN stockin si
            ON  si.subProdId = sp.id
            AND si.branchId  = ?
            AND (si.expiryDate IS NULL OR si.expiryDate > NOW())
            AND si.purchQty > 0
          WHERE sp.productId = ? AND sp.isAvailable = 1
          ORDER BY sp.qty ASC, sp.unit ASC, si.createdAt ASC
        `;

        db.govishop.query(query, [branchId, productId], (err, rows) => {
          if (err) return reject(err);
          resolve(groupAndResolve(rows, isMRP));
        });
      },
    );
  });
};

exports.upsertCartItem = async ({
  farmerId,
  branchId,
  productId,
  subProdId = null,
  subProdColorId = null,
  equipColorId = null,
  qty,
}) => {
  if (qty === 0) {
    await exports.removeCartItem({
      farmerId,
      branchId,
      productId,
      subProdId,
      subProdColorId,
      equipColorId,
    });
    return { message: "Item removed from cart" };
  }

  return withTransaction(async (conn) => {
    const cartId = await getOrCreateCart(farmerId, branchId, conn);

    const productRows = await dbQuery(
      `SELECT isMRP FROM shopproducts WHERE id = ? AND isActive = 1 LIMIT 1`,
      [productId],
      conn,
    );
    if (!productRows.length) throw new Error("Product not found");
    const isMRP = productRows[0].isMRP === 1;

    const existing = await findCartItem(
      cartId,
      productId,
      subProdId,
      subProdColorId,
      equipColorId,
      conn,
    );
    let cartItemId;

    if (existing) {
      await dbQuery(
        `UPDATE cartitems SET qty = ? WHERE id = ?`,
        [qty, existing.id],
        conn,
      );
      cartItemId = existing.id;
    } else {
      const insert = await dbQuery(
        `INSERT INTO cartitems
           (cartId, productId, subProdId, subProdColorId, equipColorId, qty)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [cartId, productId, subProdId, subProdColorId, equipColorId, qty],
        conn,
      );
      cartItemId = insert.insertId;
    }

    if (isMRP) {
      if (existing) {
        const oldAllocation = await dbQuery(
          `SELECT stockInId, outQty FROM cartitemstock WHERE cartItemId = ?`,
          [existing.id],
          conn,
        );
        for (const row of oldAllocation) {
          await dbQuery(
            `UPDATE stockin SET purchQty = purchQty + ? WHERE id = ?`,
            [row.outQty, row.stockInId],
            conn,
          );
        }
        await dbQuery(
          `DELETE FROM cartitemstock WHERE cartItemId = ?`,
          [existing.id],
          conn,
        );
      }

      const batches = await fetchBatches(
        subProdId,
        equipColorId,
        branchId,
        conn,
      );
      const allocation = allocateFIFO(batches, qty);

      if (allocation.length > 0) {
        const values = allocation.map((a) => [
          cartItemId,
          a.stockInId,
          a.outQty,
        ]);
        await dbQuery(
          `INSERT INTO cartitemstock (cartItemId, stockInId, outQty) VALUES ?`,
          [values],
          conn,
        );
        for (const a of allocation) {
          await dbQuery(
            `UPDATE stockin SET purchQty = purchQty - ? WHERE id = ?`,
            [a.outQty, a.stockInId],
            conn,
          );
        }
      }
    } else {
      await dbQuery(
        `DELETE FROM cartitemstock WHERE cartItemId = ?`,
        [cartItemId],
        conn,
      );
    }

    return {
      cartId,
      cartItemId,
      qty,
      message: existing ? "Cart item updated" : "Item added to cart",
    };
  });
};

exports.removeCartItem = async ({
  farmerId,
  branchId,
  productId,
  subProdId = null,
  subProdColorId = null,
  equipColorId = null,
}) => {
  const cartRows = await dbQuery(
    `SELECT id FROM cart WHERE farmerId = ? AND branchId = ? LIMIT 1`,
    [farmerId, branchId],
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

  await restoreAndDeleteCartItemStock(item.id);
  await dbQuery(`DELETE FROM cartitems WHERE id = ?`, [item.id]);
};

exports.placeOrder = async (farmerId, branchId) => {
  return withTransaction(async (conn) => {
    const cartRows = await dbQuery(
      `SELECT id FROM cart WHERE farmerId = ? AND branchId = ? LIMIT 1`,
      [farmerId, branchId],
      conn,
    );
    if (!cartRows.length) throw new Error("Cart not found");
    const cartId = cartRows[0].id;

    const items = await dbQuery(
      `SELECT id AS cartItemId, productId, subProdId, subProdColorId, equipColorId, qty
       FROM cartitems WHERE cartId = ?`,
      [cartId],
      conn,
    );
    if (!items.length) throw new Error("Cart is empty");

    const cartItemIds = items.map((i) => i.cartItemId);
    const stockRows = await dbQuery(
      `SELECT cartItemId, stockInId, outQty
       FROM cartitemstock WHERE cartItemId IN (?)`,
      [cartItemIds],
      conn,
    );

    const priceMap = {};
    for (const item of items) {
      let stockInRows = [];
      if (item.equipColorId) {
        stockInRows = await dbQuery(
          `SELECT salePrice, purchQty FROM stockin
           WHERE equipColorId = ? AND branchId = ? AND purchQty > 0
             AND (expiryDate IS NULL OR expiryDate > NOW())
           ORDER BY createdAt ASC`,
          [item.equipColorId, branchId],
          conn,
        );
      } else if (item.subProdColorId) {
        stockInRows = await dbQuery(
          `SELECT salePrice, purchQty FROM stockin
           WHERE subProdColorId = ? AND branchId = ? AND purchQty > 0
             AND (expiryDate IS NULL OR expiryDate > NOW())
           ORDER BY createdAt ASC`,
          [item.subProdColorId, branchId],
          conn,
        );
      } else if (item.subProdId) {
        stockInRows = await dbQuery(
          `SELECT salePrice, purchQty FROM stockin
           WHERE subProdId = ? AND branchId = ? AND purchQty > 0
             AND (expiryDate IS NULL OR expiryDate > NOW())
           ORDER BY createdAt ASC`,
          [item.subProdId, branchId],
          conn,
        );
      }

      const salePrice =
        stockInRows.length > 0
          ? Number(stockInRows[stockInRows.length - 1].salePrice ?? 0)
          : 0;
      priceMap[item.cartItemId] = salePrice;
    }

    const price = items.reduce(
      (s, i) => s + priceMap[i.cartItemId] * Number(i.qty),
      0,
    );
    const chargeP2 = parseFloat((price * 0.02).toFixed(2));
    const chargeP3 = parseFloat((price * 0.03).toFixed(2));

    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const datePart = `${yy}${mm}${dd}`;
    const prefix = `GS${farmerId}${datePart}`;

    const lastInvRows = await dbQuery(
      `SELECT invNo FROM govishoporders
       WHERE farmerId = ? AND invNo LIKE ?
       ORDER BY invNo DESC LIMIT 1`,
      [farmerId, `${prefix}%`],
      conn,
    );

    let nextSeq = 1;
    if (lastInvRows.length > 0) {
      const lastInv = lastInvRows[0].invNo;
      const lastSeqStr = lastInv.slice(prefix.length);
      const lastSeq = parseInt(lastSeqStr, 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }
    const invNo = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    const orderInsert = await dbQuery(
      `INSERT INTO govishoporders (farmerId, branchId, invNo, price, chargeP2, chargeP3)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [farmerId, branchId, invNo, price, chargeP2, chargeP3],
      conn,
    );
    const orderId = orderInsert.insertId;

    const stockMap = {};
    for (const s of stockRows) {
      if (!stockMap[s.cartItemId]) stockMap[s.cartItemId] = [];
      stockMap[s.cartItemId].push(s);
    }

    for (const item of items) {
      const itemInsert = await dbQuery(
        `INSERT INTO orderitems
           (orderId, productId, subProdId, subProdColorId, equipColorId, qty)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.productId,
          item.subProdId ?? null,
          item.subProdColorId ?? null,
          item.equipColorId ?? null,
          item.qty,
        ],
        conn,
      );
      const orderItemId = itemInsert.insertId;

      const allocs = stockMap[item.cartItemId] ?? [];
      for (const alloc of allocs) {
        await dbQuery(
          `INSERT INTO orderstockout (orderItmId, stockInId, outQty)
           VALUES (?, ?, ?)`,
          [orderItemId, alloc.stockInId, alloc.outQty],
          conn,
        );
      }
    }

    await dbQuery(
      `DELETE FROM cartitemstock WHERE cartItemId IN (?)`,
      [cartItemIds],
      conn,
    );
    await dbQuery(`DELETE FROM cartitems WHERE cartId = ?`, [cartId], conn);
    await dbQuery(`DELETE FROM cart WHERE id = ?`, [cartId], conn);

    const branchRows = await dbQuery(
      `SELECT branchName, district, province FROM branches WHERE id = ? LIMIT 1`,
      [branchId],
      conn,
    );
    const branch = branchRows[0] ?? {};
    const shopAddress = [branch.branchName, branch.district, branch.province]
      .filter(Boolean)
      .join(", ");

    return { orderId, invNo, price, chargeP2, chargeP3, shopAddress };
  });
};

exports.getCart = async (farmerId, branchId) => {
  const cartRows = await dbQuery(
    `SELECT id FROM cart WHERE farmerId = ? AND branchId = ? LIMIT 1`,
    [farmerId, branchId],
  );
  if (!cartRows.length) return { cartId: null, items: [] };

  const cartId = cartRows[0].id;

  const rows = await dbQuery(
    `SELECT
       ci.id               AS cartItemId,
       ci.productId,
       ci.subProdId,
       ci.subProdColorId,
       ci.equipColorId,
       ci.qty,
       sp.prodName         AS productName,
       sp.thumbnail        AS productImage,
       sp.baseUom,
       sp.isMRP,
       -- subproduct fields (BOTTLE/PACK/ROLL/LOOSE_*)
       sub.qty             AS subQty,
       sub.unit            AS subUnit,
       sub.width           AS subWidth,
       sub.height          AS subHeight,
       -- equipment color fields
       ec.color            AS equipColor,
       -- pieces color fields
       spc.color           AS piecesColor,
       spc.subProdId       AS piecesSubProdId,
       -- sub product qty/unit for pieces
       psub.qty            AS piecesSubQty,
       psub.unit           AS piecesSubUnit
     FROM cartitems ci
     INNER JOIN shopproducts sp       ON sp.id  = ci.productId
     LEFT  JOIN subproducts  sub      ON sub.id = ci.subProdId
                                      AND sp.baseUom NOT IN ('Equipment','Pieces')
     LEFT  JOIN equipmentcolors ec    ON ec.id  = ci.equipColorId
     LEFT  JOIN subproductcolors spc  ON spc.id = ci.subProdColorId
     LEFT  JOIN subproducts psub      ON psub.id = spc.subProdId
     WHERE ci.cartId = ?
     ORDER BY ci.createdAt ASC`,
    [cartId],
  );

  const enriched = await Promise.all(
    rows.map(async (r) => {
      let stockRows = [];
      if (r.equipColorId) {
        stockRows = await dbQuery(
          `SELECT purchQty AS batchQty, salePrice, originalPrice
           FROM stockin
           WHERE equipColorId = ? AND branchId = ?
             AND purchQty > 0
             AND (expiryDate IS NULL OR expiryDate > NOW())
           ORDER BY createdAt ASC`,
          [r.equipColorId, branchId],
        );
      } else if (r.subProdColorId) {
        stockRows = await dbQuery(
          `SELECT purchQty AS batchQty, salePrice, originalPrice
           FROM stockin
           WHERE subProdColorId = ? AND branchId = ?
             AND purchQty > 0
             AND (expiryDate IS NULL OR expiryDate > NOW())
           ORDER BY createdAt ASC`,
          [r.subProdColorId, branchId],
        );
      } else if (r.subProdId) {
        stockRows = await dbQuery(
          `SELECT purchQty AS batchQty, salePrice, originalPrice
           FROM stockin
           WHERE subProdId = ? AND branchId = ?
             AND purchQty > 0
             AND (expiryDate IS NULL OR expiryDate > NOW())
           ORDER BY createdAt ASC`,
          [r.subProdId, branchId],
        );
      }

      const rawBatches = stockRows.map((b) => ({
        qty: Number(b.batchQty),
        salePrice: Number(b.salePrice ?? 0),
        originalPrice: b.originalPrice ? Number(b.originalPrice) : null,
      }));

      const mergedBatches = [];
      for (const b of rawBatches) {
        const last = mergedBatches[mergedBatches.length - 1];
        if (last && last.salePrice === b.salePrice) last.qty += b.qty;
        else mergedBatches.push({ ...b });
      }

      const totalQty = mergedBatches.reduce((s, b) => s + b.qty, 0);
      const displayBatch = r.isMRP
        ? mergedBatches[0]
        : mergedBatches[mergedBatches.length - 1];

      const salePrice = displayBatch?.salePrice ?? 0;
      const originalPrice = displayBatch?.originalPrice ?? null;
      const pricePerUnit = salePrice;
      const origPrice =
        originalPrice && salePrice < originalPrice ? originalPrice : null;

      const baseUom = r.baseUom ?? "";
      let variantLabel = "";
      let type = "BOTTLE";
      let colorCode = null;

      if (baseUom === "Equipment") {
        type = "EQUIPMENT";
        colorCode = r.equipColor ?? null;
        variantLabel = r.equipColor ? `Color` : "Equipment";
      } else if (baseUom === "Pieces") {
        type = "PIECES";
        colorCode = r.piecesColor ?? null;
        const qty = r.piecesSubQty ?? "";
        const unit = r.piecesSubUnit ?? "";
        variantLabel = qty && unit ? `${qty} ${unit}` : "Pieces";
      } else if (baseUom === "ROLL") {
        type = "ROLL";
        const w = r.subWidth,
          h = r.subHeight;
        variantLabel =
          w && h
            ? `${r.subQty ?? ""} ${r.subUnit ?? ""} x ${w} m`
            : `${r.subQty ?? ""} ${r.subUnit ?? ""}`.trim();
      } else if (baseUom === "LOOSE_WEIGHT") {
        type = "LOOSE_WEIGHT";
        variantLabel = `${r.subQty ?? ""} ${r.subUnit ?? ""}`.trim();
      } else if (baseUom === "LOOSE_VOLUME") {
        type = "LOOSE_VOLUME";
        variantLabel = `${r.subQty ?? ""} ${r.subUnit ?? ""}`.trim();
      } else if (baseUom === "PACK") {
        type = "PACK";
        variantLabel = `${r.subQty ?? ""} ${r.subUnit ?? ""}`.trim();
      } else {
        type = "BOTTLE";
        variantLabel = `${r.subQty ?? ""} ${r.subUnit ?? ""}`.trim();
      }

      const isOutOfStock = totalQty === 0;

      const availableQty = totalQty + (r.isMRP ? r.qty : 0);

      return {
        cartItemId: r.cartItemId,
        productId: r.productId,
        productName: r.productName,
        productImage: r.productImage,
        subProdId: r.subProdId ?? null,
        subProdColorId: r.subProdColorId ?? null,
        equipColorId: r.equipColorId ?? null,
        qty: r.qty,
        type,
        variantLabel,
        colorCode,
        pricePerUnit,
        originalPrice: origPrice,
        availableQty: isOutOfStock ? 0 : availableQty,
        isOutOfStock,
      };
    }),
  );

  return { cartId, items: enriched };
};

exports.getOrderInvoice = async (orderId, farmerId) => {
  const orderRows = await dbQuery(
    `SELECT
       o.id          AS orderId,
       o.invNo,
       o.price       AS subtotal,
       o.chargeP2,
       o.chargeP3,
       o.createdAt   AS invoiceDate,
       o.farmerId,
       o.branchId,
       b.branchName,
       b.district,
       b.province,
       b.mobilePhone AS branchPhone,
       gs.shopName,
       gs.logo
     FROM govishoporders o
     INNER JOIN branches b   ON b.id = o.branchId
     INNER JOIN govishops gs ON gs.id = b.shopId
     WHERE o.id = ? AND o.farmerId = ?
     LIMIT 1`,
    [orderId, farmerId],
  );

  if (!orderRows.length) return null;
  const order = orderRows[0];

  const itemRows = await dbQuery(
    `SELECT
       oi.id            AS orderItemId,
       oi.productId,
       oi.subProdId,
       oi.subProdColorId,
       oi.equipColorId,
       oi.qty,
       sp.prodName      AS productName,
       sp.baseUom,
       sub.qty          AS subQty,
       sub.unit         AS subUnit,
       sub.width        AS subWidth,
       sub.height       AS subHeight,
       ec.color         AS equipColor,
       spc.color        AS piecesColor,
       spc.subProdId    AS piecesSubProdId,
       psub.qty         AS piecesSubQty,
       psub.unit        AS piecesSubUnit
     FROM orderitems oi
     INNER JOIN shopproducts sp      ON sp.id  = oi.productId
     LEFT  JOIN subproducts  sub     ON sub.id = oi.subProdId
                                     AND sp.baseUom NOT IN ('Equipment','Pieces')
     LEFT  JOIN equipmentcolors ec   ON ec.id  = oi.equipColorId
     LEFT  JOIN subproductcolors spc ON spc.id = oi.subProdColorId
     LEFT  JOIN subproducts psub     ON psub.id = spc.subProdId
     WHERE oi.orderId = ?
     ORDER BY oi.id ASC`,
    [orderId],
  );

  const orderItemIds = itemRows.map((r) => r.orderItemId);
  let stockOutRows = [];
  if (orderItemIds.length > 0) {
    stockOutRows = await dbQuery(
      `SELECT oso.orderItmId, oso.outQty, si.salePrice
       FROM orderstockout oso
       INNER JOIN stockin si ON si.id = oso.stockInId
       WHERE oso.orderItmId IN (?)`,
      [orderItemIds],
    );
  }

  const priceByOrderItem = {};
  for (const row of stockOutRows) {
    if (!priceByOrderItem[row.orderItmId]) {
      priceByOrderItem[row.orderItmId] = { totalQty: 0, totalValue: 0 };
    }
    const qty = Number(row.outQty);
    const price = Number(row.salePrice ?? 0);
    priceByOrderItem[row.orderItmId].totalQty += qty;
    priceByOrderItem[row.orderItmId].totalValue += qty * price;
  }

  for (const r of itemRows) {
    if (priceByOrderItem[r.orderItemId]) continue;

    let fallbackRows = [];
    if (r.equipColorId) {
      fallbackRows = await dbQuery(
        `SELECT salePrice FROM stockin
         WHERE equipColorId = ? AND branchId = ?
         ORDER BY createdAt DESC LIMIT 1`,
        [r.equipColorId, order.branchId],
      );
    } else if (r.subProdColorId) {
      fallbackRows = await dbQuery(
        `SELECT salePrice FROM stockin
         WHERE subProdColorId = ? AND branchId = ?
         ORDER BY createdAt DESC LIMIT 1`,
        [r.subProdColorId, order.branchId],
      );
    } else if (r.subProdId) {
      fallbackRows = await dbQuery(
        `SELECT salePrice FROM stockin
         WHERE subProdId = ? AND branchId = ?
         ORDER BY createdAt DESC LIMIT 1`,
        [r.subProdId, order.branchId],
      );
    } else {
      fallbackRows = await dbQuery(
        `SELECT salePrice FROM stockin
         WHERE productId = ? AND branchId = ?
         ORDER BY createdAt DESC LIMIT 1`,
        [r.productId, order.branchId],
      );
    }

    if (fallbackRows.length > 0) {
      const unitPrice = Number(fallbackRows[0].salePrice ?? 0);
      const itemQty = Number(r.qty);
      priceByOrderItem[r.orderItemId] = {
        totalQty: itemQty,
        totalValue: parseFloat((unitPrice * itemQty).toFixed(2)),
      };
    }
  }

  const items = itemRows.map((r, index) => {
    const baseUom = r.baseUom ?? "";
    let variantLabel = "";
    let colorCode = null;

    if (baseUom === "Equipment") {
      colorCode = r.equipColor ?? null;
      variantLabel = "";
    } else if (baseUom === "Pieces") {
      colorCode = r.piecesColor ?? null;
      const qty = r.piecesSubQty ?? "";
      const unit = r.piecesSubUnit ?? "";
      variantLabel = qty && unit ? `${qty} ${unit}` : "";
    } else if (baseUom === "ROLL") {
      const w = r.subWidth;
      const h = r.subHeight;
      variantLabel =
        w && h
          ? `${r.subQty ?? ""} ${r.subUnit ?? ""} x ${w} m`
          : `${r.subQty ?? ""} ${r.subUnit ?? ""}`.trim();
    } else {
      variantLabel = `${r.subQty ?? ""} ${r.subUnit ?? ""}`.trim();
    }

    const qty = Number(r.qty);
    const agg = priceByOrderItem[r.orderItemId];
    const lineTotal = agg ? agg.totalValue : 0;
    const unitPrice = agg && agg.totalQty > 0 ? lineTotal / agg.totalQty : 0;

    return {
      no: index + 1,
      productId: r.productId,
      name: r.productName,
      variantLabel,
      colorCode,
      qty,
      unitPrice: parseFloat(unitPrice.toFixed(2)),
      lineTotal: parseFloat(lineTotal.toFixed(2)),
    };
  });

  const subtotal = Number(order.subtotal ?? 0);
  const chargeP2 = Number(order.chargeP2 ?? 0);
  const chargeP3 = Number(order.chargeP3 ?? 0);
  const serviceCharge = parseFloat((chargeP2 + chargeP3).toFixed(2));
  const grandTotal = parseFloat((subtotal + serviceCharge).toFixed(2));

  const userRows = await new Promise((resolve, reject) => {
    db.plantcare.query(
      `SELECT firstName, lastName, phoneNumber FROM users WHERE id = ? LIMIT 1`,
      [order.farmerId],
      (error, results) => {
        if (error) reject(error);
        else resolve(results);
      },
    );
  });
  const user = userRows[0] ?? {};
  const customerName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || "N/A";

  return {
    orderId: order.orderId,
    invNo: order.invNo,
    invoiceDate: order.invoiceDate,
    shop: {
      shopName: order.shopName,
      logo: order.logo,
    },
    branch: {
      branchName: order.branchName,
      district: order.district,
      province: order.province,
      phone: order.branchPhone,
    },
    customer: {
      name: customerName,
      phone: user.phoneNumber ?? null,
    },
    items,
    subtotal,
    serviceCharge,
    grandTotal,
  };
};
