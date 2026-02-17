const db = require("../startup/database"); 

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
      if (err) {
        return reject(err); 
      }
      
      resolve(results); 
    });
  });
};

exports.getAssetsByCategory = (userId, category) => {
  return new Promise((resolve, reject) => {
    let query;
    let values;

    if (Array.isArray(category)) {
      const placeholders = category.map(() => "?").join(",");
      query = `SELECT * FROM currentasset WHERE userId = ? AND category IN (${placeholders})`;
      values = [userId, ...category];
    } else {
      query = "SELECT * FROM currentasset WHERE userId = ? AND category = ?";
      values = [userId, category];
    }

    db.plantcare.query(query, values, (err, results) => {
      if (err) {
        return reject(err); 
      }
      resolve(results); 
    });
  });
};

exports.getCurrentAsset = (userId, category, assetId) => {
  return new Promise((resolve, reject) => {
    const query =
      "SELECT * FROM currentasset WHERE userId = ? AND category = ? AND id = ?";
    db.plantcare.execute(query, [userId, category, assetId], (err, results) => {
      if (err) {
        return reject(err); 
      }
      resolve(results); 
    });
  });
};

exports.deleteAsset = (userId, category, assetId) => {
  return new Promise((resolve, reject) => {
    const query =
      "DELETE FROM currentasset WHERE userId = ? AND category = ? AND id = ?";
    db.plantcare.execute(query, [userId, category, assetId], (err) => {
      if (err) {
        return reject(err); 
      }
      resolve();
    });
  });
};

exports.updateAsset = (userId, category, assetId, newNumOfUnit, newTotal) => {
  return new Promise((resolve, reject) => {
    const query =
      "UPDATE currentasset SET numOfUnit = ?, total = ? WHERE userId = ? AND category = ? AND id = ?";
    db.plantcare.execute(
      query,
      [newNumOfUnit, newTotal, userId, category, assetId],
      (err) => {
        if (err) {
          return reject(err); 
        }
        resolve(); 
      }
    );
  });
};

exports.insertRecord = (
  currentAssetId,
  numOfPlusUnit,
  numOfMinUnit,
  totalPrice
) => {
  return new Promise((resolve, reject) => {
    const query =
      "INSERT INTO currentassetrecord (currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice) VALUES (?, ?, ?, ?)";
    db.plantcare.execute(
      query,
      [currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice],
      (err) => {
        if (err) {
          return reject(err); 
        }
        resolve();
      }
    );
  });
};

exports.checkAssetExists = (userId, category, asset) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT * FROM currentasset WHERE userId = ? AND category = ? AND asset = ?
        `;
        db.plantcare.query(sql, [userId, category, asset], (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
};

exports.updateAsset = (updatedValues, assetId) => {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE currentasset
            SET numOfUnit = ?, total = ?, unitVolume = ?, unitPrice = ?, purchaseDate = ?, expireDate = ?, status = ?
            WHERE id = ?
        `;
        db.plantcare.query(sql, [...updatedValues, assetId], (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

exports.insertAsset = (insertValues) => {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO currentasset (
                userId, category, asset, brand, batchNum, unit, unitVolume, numOfUnit, unitPrice, total, purchaseDate, expireDate, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.plantcare.query(sql, insertValues, (err, insertResults) => {
            if (err) {
                return reject(err);
            }
            resolve(insertResults.insertId);
        });
    });
};

exports.insertAssetRecord = (recordValues) => {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO currentassetrecord (currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice)
            VALUES (?, ?, 0, ?)
        `;
        db.plantcare.query(sql, recordValues, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};