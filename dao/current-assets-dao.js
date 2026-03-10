const db = require("../startup/database");

const query = (sql, values) =>
  new Promise((resolve, reject) =>
    db.plantcare.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    }),
  );

exports.checkUserExists = (userId) => {
  return query(`SELECT id FROM users WHERE id = ?`, [userId]);
};

exports.checkStaffExists = (staffId, farmId) => {
  return query(`SELECT id FROM farmstaff WHERE id = ? AND farmId = ?`, [
    staffId,
    farmId,
  ]);
};

exports.checkExistingAsset = (
  userId,
  category,
  asset,
  brand,
  batchNum,
  farmId,
) => {
  return query(
    `SELECT * FROM currentasset 
     WHERE userId = ? AND category = ? AND asset = ? AND brand = ? AND batchNum = ? AND farmId = ?`,
    [userId, category, asset, brand, batchNum, farmId],
  );
};

exports.updateAsset = (existingAsset, payload) => {
  const {
    numberOfUnits,
    totalPrice,
    volumeInt,
    unitPrice,
    formattedPurchaseDate,
    formattedExpireDate,
    status,
    staffId,
    staffExists,
  } = payload;

  const updatedNumOfUnits = (
    parseFloat(existingAsset.numOfUnit) + parseFloat(numberOfUnits)
  ).toFixed(2);
  const updatedTotalPrice = (
    parseFloat(existingAsset.total) + parseFloat(totalPrice)
  ).toFixed(2);

  const setClauses = [
    "numOfUnit = ?",
    "total = ?",
    "unitVolume = ?",
    "unitPrice = ?",
    "purchaseDate = ?",
    "expireDate = ?",
    "status = ?",
    staffExists ? "staffId = ?" : "staffId = NULL",
  ];

  const sql = `UPDATE currentasset SET ${setClauses.join(", ")} WHERE id = ?`;

  const values = [
    updatedNumOfUnits,
    updatedTotalPrice,
    volumeInt,
    unitPrice,
    formattedPurchaseDate,
    formattedExpireDate,
    status,
    ...(staffExists ? [staffId] : []),
    existingAsset.id,
  ];

  return query(sql, values);
};

exports.insertAsset = (payload) => {
  const {
    userId,
    staffId,
    staffExists,
    farmId,
    category,
    asset,
    brand,
    batchNum,
    volumeInt,
    unit,
    numberOfUnits,
    unitPrice,
    totalPrice,
    formattedPurchaseDate,
    formattedExpireDate,
    status,
  } = payload;

  const columns = [
    "userId",
    ...(staffExists ? ["staffId"] : []),
    "farmId",
    "category",
    "asset",
    "brand",
    "batchNum",
    "unitVolume",
    "unit",
    "numOfUnit",
    "unitPrice",
    "total",
    "purchaseDate",
    "expireDate",
    "status",
  ];

  const values = [
    userId,
    ...(staffExists ? [staffId] : []),
    farmId,
    category,
    asset,
    brand,
    batchNum,
    volumeInt,
    unit,
    numberOfUnits,
    unitPrice,
    totalPrice,
    formattedPurchaseDate,
    formattedExpireDate,
    status,
  ];

  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO currentasset (${columns.join(", ")}) VALUES (${placeholders})`;

  return query(sql, values);
};

exports.insertAssetRecord = (currentAssetId, numberOfUnits, totalPrice) => {
  return query(
    `INSERT INTO currentassetrecord (currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice)
     VALUES (?, ?, 0, ?)`,
    [currentAssetId, numberOfUnits, totalPrice],
  );
};

exports.getAllCurrentAssets = (userId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT category, SUM(total) AS totalSum 
      FROM currentasset 
      WHERE userId = ? 
      GROUP BY category
      HAVING totalSum > 0
    `;
    db.plantcare.query(sql, [userId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

exports.getAssetsByCategory = (userId, category) => {
  return new Promise((resolve, reject) => {
    let sql, values;

    if (Array.isArray(category)) {
      const placeholders = category.map(() => "?").join(",");
      sql = `SELECT * FROM currentasset WHERE userId = ? AND category IN (${placeholders})`;
      values = [userId, ...category];
    } else {
      sql = "SELECT * FROM currentasset WHERE userId = ? AND category = ?";
      values = [userId, category];
    }

    db.plantcare.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

exports.getCurrentAsset = (userId, category, assetId) => {
  return new Promise((resolve, reject) => {
    const sql =
      "SELECT * FROM currentasset WHERE userId = ? AND category = ? AND id = ?";
    db.plantcare.execute(sql, [userId, category, assetId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

exports.deleteAsset = (userId, category, assetId) => {
  return new Promise((resolve, reject) => {
    const sql =
      "DELETE FROM currentasset WHERE userId = ? AND category = ? AND id = ?";
    db.plantcare.execute(sql, [userId, category, assetId], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

exports.reduceAsset = (userId, category, assetId, newNumOfUnit, newTotal) => {
  return new Promise((resolve, reject) => {
    const sql =
      "UPDATE currentasset SET numOfUnit = ?, total = ? WHERE userId = ? AND category = ? AND id = ?";
    db.plantcare.execute(
      sql,
      [newNumOfUnit, newTotal, userId, category, assetId],
      (err) => {
        if (err) return reject(err);
        resolve();
      },
    );
  });
};

exports.insertRecord = (
  currentAssetId,
  numOfPlusUnit,
  numOfMinUnit,
  totalPrice,
) => {
  return new Promise((resolve, reject) => {
    const sql =
      "INSERT INTO currentassetrecord (currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice) VALUES (?, ?, ?, ?)";
    db.plantcare.execute(
      sql,
      [currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice],
      (err) => {
        if (err) return reject(err);
        resolve();
      },
    );
  });
};

exports.checkAssetExists = (userId, category, asset) => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM currentasset WHERE userId = ? AND category = ? AND asset = ?`;
    db.plantcare.query(sql, [userId, category, asset], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

exports.getCurrectAssetAlredayHaveByUser = (userId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT category, asset, brand, batchNum, unit, unitVolume
      FROM plant_care.currentasset 
      WHERE userId = ? AND status = 'Still valid'
      GROUP BY category, asset, brand, batchNum, unit, unitVolume
      ORDER BY category ASC, asset ASC, brand ASC, batchNum ASC
    `;
    db.plantcare.query(sql, [userId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};
