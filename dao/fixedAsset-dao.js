const db = require("../startup/database");

const query = (sql, values) =>
  new Promise((resolve, reject) =>
    db.plantcare.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    }),
  );

const queryWithConnection = (connection, sql, values) =>
  new Promise((resolve, reject) =>
    connection.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    }),
  );

const getConnection = () =>
  new Promise((resolve, reject) =>
    db.plantcare.getConnection((err, connection) => {
      if (err) return reject(err);
      resolve(connection);
    }),
  );

const beginTransaction = (connection) =>
  new Promise((resolve, reject) =>
    connection.beginTransaction((err) => {
      if (err) return reject(err);
      resolve();
    }),
  );

const commitTransaction = (connection) =>
  new Promise((resolve, reject) =>
    connection.commit((err) => {
      if (err) return reject(err);
      resolve();
    }),
  );

exports.getFarmDistrict = (farmId) => {
  return query(`SELECT district FROM farms WHERE id = ? LIMIT 1`, [farmId]);
};

exports.insertFixedAsset = (
  userId,
  staffId,
  includeStaffId,
  category,
  farmId,
) => {
  if (includeStaffId) {
    return query(
      `INSERT INTO fixedasset (userId, staffId, category, farmId) VALUES (?, ?, ?, ?)`,
      [userId, staffId, category, farmId],
    );
  }
  return query(
    `INSERT INTO fixedasset (userId, category, farmId) VALUES (?, ?, ?)`,
    [userId, category, farmId],
  );
};

exports.updateFixedAssetUpdatedBy = (staffId, faId, userId) => {
  return query(
    `UPDATE fixedasset SET updatedBy = ? WHERE id = ? AND userId = ?`,
    [staffId, faId, userId],
  );
};

exports.insertBuildingAsset = (
  fixedAssetId,
  type,
  floorArea,
  ownership,
  generalCondition,
  district,
) => {
  return query(
    `INSERT INTO buildingfixedasset (fixedAssetId, type, floorArea, ownership, generalCondition, district) VALUES (?, ?, ?, ?, ?, ?)`,
    [fixedAssetId, type, floorArea, ownership, generalCondition, district],
  );
};

exports.updateBuildingAsset = (assetData, userId) => {
  return query(
    `UPDATE buildingfixedasset bfa
     JOIN fixedasset fa ON fa.id = bfa.fixedAssetId
     SET bfa.type = COALESCE(NULLIF(?, ''), bfa.type),
         bfa.floorArea = COALESCE(NULLIF(?, ''), bfa.floorArea),
         bfa.ownership = COALESCE(NULLIF(?, ''), bfa.ownership),
         bfa.generalCondition = COALESCE(NULLIF(?, ''), bfa.generalCondition),
         bfa.district = COALESCE(NULLIF(?, ''), bfa.district)
     WHERE fa.userId = ? AND fa.id = ?`,
    [
      assetData.type,
      assetData.floorArea,
      assetData.ownership,
      assetData.generalCondition,
      assetData.district,
      userId,
      assetData.faId,
    ],
  );
};

exports.insertLandAsset = (
  fixedAssetId,
  extentha,
  extentac,
  extentp,
  ownership,
  district,
  landFenced,
  perennialCrop,
) => {
  return query(
    `INSERT INTO landfixedasset (fixedAssetId, extentha, extentac, extentp, ownership, district, landFenced, perennialCrop) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fixedAssetId,
      extentha,
      extentac,
      extentp,
      ownership,
      district,
      landFenced,
      perennialCrop,
    ],
  );
};

exports.updateLandAsset = (assetData, userId) => {
  return query(
    `UPDATE landfixedasset lfa
     JOIN fixedasset fa ON fa.id = lfa.fixedAssetId
     SET lfa.district = COALESCE(NULLIF(?, ''), lfa.district),
         lfa.extentha = COALESCE(NULLIF(?, ''), lfa.extentha),
         lfa.extentac = COALESCE(NULLIF(?, ''), lfa.extentac),
         lfa.extentp = COALESCE(NULLIF(?, ''), lfa.extentp),
         lfa.ownership = COALESCE(NULLIF(?, ''), lfa.ownership),
         lfa.landFenced = COALESCE(NULLIF(?, ''), lfa.landFenced),
         lfa.perennialCrop = COALESCE(NULLIF(?, ''), lfa.perennialCrop)
     WHERE fa.userId = ? AND fa.id = ?`,
    [
      assetData.district,
      assetData.extentha,
      assetData.extentac,
      assetData.extentp,
      assetData.ownership,
      assetData.landFenced,
      assetData.perennialCrop,
      userId,
      assetData.faId,
    ],
  );
};

exports.insertMachToolsAsset = (
  fixedAssetId,
  asset,
  assetType,
  mentionOther,
  brand,
  numberOfUnits,
  unitPrice,
  totalPrice,
  warranty,
) => {
  return query(
    `INSERT INTO machtoolsfixedasset (fixedAssetId, asset, assetType, mentionOther, brand, numberOfUnits, unitPrice, totalPrice, warranty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fixedAssetId,
      asset,
      assetType,
      mentionOther,
      brand,
      numberOfUnits,
      unitPrice,
      totalPrice,
      warranty,
    ],
  );
};

exports.insertMachToolsWarranty = (
  machToolsId,
  purchaseDate,
  expireDate,
  warrantystatus,
) => {
  return query(
    `INSERT INTO machtoolsfixedassetwarranty (machToolsId, purchaseDate, expireDate, warrantystatus) VALUES (?, ?, ?, ?)`,
    [machToolsId, purchaseDate, expireDate, warrantystatus],
  );
};

exports.updateMachToolsAsset = (assetData, userId) => {
  return query(
    `UPDATE machtoolsfixedasset mtfa
     JOIN fixedasset fa ON fa.id = mtfa.fixedAssetId
     SET mtfa.asset = COALESCE(NULLIF(?, ''), mtfa.asset),
         mtfa.assetType = COALESCE(NULLIF(?, ''), mtfa.assetType),
         mtfa.brand = COALESCE(NULLIF(?, ''), mtfa.brand),
         mtfa.numberOfUnits = COALESCE(NULLIF(?, ''), mtfa.numberOfUnits),
         mtfa.unitPrice = COALESCE(NULLIF(?, ''), mtfa.unitPrice),
         mtfa.totalPrice = COALESCE(NULLIF(?, ''), mtfa.totalPrice),
         mtfa.warranty = COALESCE(NULLIF(?, ''), mtfa.warranty),
         mtfa.mentionOther = COALESCE(NULLIF(?, ''), mtfa.mentionOther)
     WHERE fa.userId = ? AND fa.id = ?`,
    [
      assetData.asset,
      assetData.assetType,
      assetData.brand,
      assetData.numberOfUnits,
      assetData.unitPrice,
      assetData.totalPrice,
      assetData.warranty,
      assetData.mentionOther,
      userId,
      assetData.faId,
    ],
  );
};

exports.updateMachToolsWarranty = (
  assetId,
  purchaseDate,
  expireDate,
  warrantystatus,
) => {
  return query(
    `UPDATE machtoolsfixedassetwarranty SET purchaseDate = ?, expireDate = ?, warrantystatus = ? WHERE machToolsId = ?`,
    [purchaseDate, expireDate, warrantystatus, assetId],
  );
};

exports.insertOwnershipOwner = (
  idField,
  idValue,
  issuedDate,
  estimateValue,
) => {
  return query(
    `INSERT INTO ownershipownerfixedasset (${idField}, issuedDate, estimateValue) VALUES (?, COALESCE(NULLIF(?, ''), NULL), COALESCE(NULLIF(?, ''), NULL))`,
    [idValue, issuedDate, estimateValue],
  );
};

exports.insertOwnershipLease = (
  idField,
  idValue,
  startDate,
  durationYears,
  durationMonths,
  leastAmountAnnually,
) => {
  return query(
    `INSERT INTO ownershipleastfixedasset (${idField}, startDate, durationYears, durationMonths, leastAmountAnnually) VALUES (?, COALESCE(NULLIF(?, ''), NULL), COALESCE(NULLIF(?, ''), NULL), COALESCE(NULLIF(?, ''), NULL), COALESCE(NULLIF(?, ''), NULL))`,
    [idValue, startDate, durationYears, durationMonths, leastAmountAnnually],
  );
};

exports.insertOwnershipPermit = (
  idField,
  idValue,
  issuedDate,
  permitFeeAnnually,
) => {
  return query(
    `INSERT INTO ownershippermitfixedasset (${idField}, issuedDate, permitFeeAnnually) VALUES (?, COALESCE(NULLIF(?, ''), NULL), COALESCE(NULLIF(?, ''), NULL))`,
    [idValue, issuedDate, permitFeeAnnually],
  );
};

exports.insertOwnershipShared = (idField, idValue, paymentAnnually) => {
  return query(
    `INSERT INTO ownershipsharedfixedasset (${idField}, paymentAnnually) VALUES (?, COALESCE(NULLIF(?, ''), NULL))`,
    [idValue, paymentAnnually],
  );
};

exports.updateOwnershipOwner = (
  idField,
  idValue,
  issuedDate,
  estimateValue,
) => {
  return query(
    `UPDATE ownershipownerfixedasset SET issuedDate = COALESCE(NULLIF(?, ''), issuedDate), estimateValue = COALESCE(NULLIF(?, ''), estimateValue) WHERE ${idField} = ?`,
    [issuedDate, estimateValue, idValue],
  );
};

exports.updateOwnershipLease = (
  idField,
  idValue,
  startDate,
  durationYears,
  durationMonths,
  leastAmountAnnually,
) => {
  return query(
    `UPDATE ownershipleastfixedasset SET startDate = COALESCE(NULLIF(?, ''), startDate), durationYears = COALESCE(NULLIF(?, ''), durationYears), durationMonths = COALESCE(NULLIF(?, ''), durationMonths), leastAmountAnnually = COALESCE(NULLIF(?, ''), leastAmountAnnually) WHERE ${idField} = ?`,
    [startDate, durationYears, durationMonths, leastAmountAnnually, idValue],
  );
};

exports.updateOwnershipPermit = (
  idField,
  idValue,
  issuedDate,
  permitFeeAnnually,
) => {
  return query(
    `UPDATE ownershippermitfixedasset SET issuedDate = COALESCE(NULLIF(?, ''), issuedDate), permitFeeAnnually = COALESCE(NULLIF(?, ''), permitFeeAnnually) WHERE ${idField} = ?`,
    [issuedDate, permitFeeAnnually, idValue],
  );
};

exports.updateOwnershipShared = (idField, idValue, paymentAnnually) => {
  return query(
    `UPDATE ownershipsharedfixedasset SET paymentAnnually = COALESCE(NULLIF(?, ''), paymentAnnually) WHERE ${idField} = ?`,
    [paymentAnnually, idValue],
  );
};

exports.deleteOwnershipExcept = (idField, idValue, keepTable) => {
  const allTables = [
    "ownershipownerfixedasset",
    "ownershipleastfixedasset",
    "ownershippermitfixedasset",
    "ownershipsharedfixedasset",
  ];
  const toDelete = allTables.filter((t) => t !== keepTable);
  return Promise.all(
    toDelete.map((table) =>
      query(`DELETE FROM ${table} WHERE ${idField} = ?`, [idValue]),
    ),
  );
};

exports.getAssetsByCategory = (userId, category) => {
  const categoryQueries = {
    Land: `
      SELECT fa.id, fa.category, fa.farmId, f.farmName, lfa.district
      FROM fixedasset fa
      JOIN landfixedasset lfa ON fa.id = lfa.fixedAssetId
      LEFT JOIN farms f ON fa.farmId = f.id
      WHERE fa.userId = ? AND fa.category = 'Land' ORDER BY fa.id ASC`,

    "Building and Infrastructures": `
      SELECT fa.id, fa.category, fa.farmId, f.farmName, bfa.type, bfa.district
      FROM fixedasset fa
      JOIN buildingfixedasset bfa ON fa.id = bfa.fixedAssetId
      LEFT JOIN farms f ON fa.farmId = f.id
      WHERE fa.userId = ? AND fa.category = 'Building and Infrastructures' ORDER BY fa.id ASC`,

    "Machine and Vehicles": `
      SELECT fa.id, fa.category, fa.farmId, f.farmName, mtfa.asset, mtfa.assetType
      FROM fixedasset fa
      JOIN machtoolsfixedasset mtfa ON fa.id = mtfa.fixedAssetId
      LEFT JOIN farms f ON fa.farmId = f.id
      WHERE fa.userId = ? AND fa.category = 'Machine and Vehicles' ORDER BY fa.id ASC`,

    Tools: `
      SELECT fa.id, fa.category, fa.farmId, f.farmName, mtfa.asset, mtfa.assetType
      FROM fixedasset fa
      JOIN machtoolsfixedasset mtfa ON fa.id = mtfa.fixedAssetId
      LEFT JOIN farms f ON fa.farmId = f.id
      WHERE fa.userId = ? AND fa.category = 'Tools' ORDER BY fa.id ASC`,
  };

  const sql = categoryQueries[category];
  if (!sql) return Promise.reject(new Error("INVALID_CATEGORY"));
  return query(sql, [userId]);
};

exports.getAssetDetailById = (userId, assetId, category) => {
  const categoryQueries = {
    Land: `
      SELECT fa.id AS faId, fa.category, lfa.district, lfa.extentha, lfa.extentac, lfa.extentp, lfa.ownership, lfa.landFenced, lfa.perennialCrop, lfa.id
      FROM fixedasset fa JOIN landfixedasset lfa ON fa.id = lfa.fixedAssetId
      WHERE fa.userId = ? AND fa.id = ?`,

    "Building and Infrastructures": `
      SELECT fa.id AS faId, fa.category, bfa.type, bfa.floorArea, bfa.ownership, bfa.generalCondition, bfa.district, bfa.id
      FROM fixedasset fa JOIN buildingfixedasset bfa ON fa.id = bfa.fixedAssetId
      WHERE fa.userId = ? AND fa.id = ?`,

    "Machine and Vehicles": `
      SELECT fa.id AS faId, fa.category, mtfa.asset, mtfa.assetType, mtfa.mentionOther, mtfa.brand, mtfa.numberOfUnits, mtfa.unitPrice, mtfa.totalPrice, mtfa.warranty, mtfa.id
      FROM fixedasset fa JOIN machtoolsfixedasset mtfa ON fa.id = mtfa.fixedAssetId
      WHERE fa.userId = ? AND fa.id = ?`,

    Tools: `
      SELECT fa.id AS faId, fa.category, mtfa.asset, mtfa.assetType, mtfa.mentionOther, mtfa.brand, mtfa.numberOfUnits, mtfa.unitPrice, mtfa.totalPrice, mtfa.warranty, mtfa.id
      FROM fixedasset fa JOIN machtoolsfixedasset mtfa ON fa.id = mtfa.fixedAssetId
      WHERE fa.userId = ? AND fa.id = ?`,
  };

  const sql = categoryQueries[category];
  if (!sql) return Promise.reject(new Error("INVALID_CATEGORY"));
  return query(sql, [userId, assetId]);
};

exports.getOwnershipDetails = (category, ownershipType, assetId) => {
  const ownershipQueries = {
    "Building and Infrastructures": {
      "Own Building (with title ownership)": `SELECT oof.issuedDate, oof.estimateValue FROM ownershipownerfixedasset oof WHERE oof.buildingAssetId = ?`,
      "Leased Building": `SELECT olf.startDate, olf.durationYears, olf.leastAmountAnnually, olf.durationMonths FROM ownershipleastfixedasset olf WHERE olf.buildingAssetId = ?`,
      "Permitted Building": `SELECT opf.issuedDate, opf.permitFeeAnnually FROM ownershippermitfixedasset opf WHERE opf.buildingAssetId = ?`,
      "Shared / No Ownership": `SELECT osf.paymentAnnually FROM ownershipsharedfixedasset osf WHERE osf.buildingAssetId = ?`,
    },
    Land: {
      Own: `SELECT oof.issuedDate, oof.estimateValue FROM ownershipownerfixedasset oof WHERE oof.landAssetId = ?`,
      Lease: `SELECT olf.startDate, olf.durationYears, olf.leastAmountAnnually, olf.durationMonths FROM ownershipleastfixedasset olf WHERE olf.landAssetId = ?`,
      Permitted: `SELECT opf.issuedDate, opf.permitFeeAnnually FROM ownershippermitfixedasset opf WHERE opf.landAssetId = ?`,
      Shared: `SELECT osf.paymentAnnually FROM ownershipsharedfixedasset osf WHERE osf.landAssetId = ?`,
    },
    "Machine and Vehicles": {
      default: `SELECT mtw.purchaseDate, mtw.expireDate, mtw.warrantystatus FROM machtoolsfixedassetwarranty mtw WHERE mtw.machToolsId = ?`,
    },
    Tools: {
      default: `SELECT mtw.purchaseDate, mtw.expireDate, mtw.warrantystatus FROM machtoolsfixedassetwarranty mtw WHERE mtw.machToolsId = ?`,
    },
  };

  const categoryMap = ownershipQueries[category];
  if (!categoryMap) return Promise.reject(new Error("INVALID_CATEGORY"));

  const sql = categoryMap[ownershipType] || categoryMap["default"];
  if (!sql) return Promise.resolve([]);
  return query(sql, [assetId]);
};

exports.deleteFixedAssetWithOwnership = async (userId, assetId, category) => {
  const connection = await getConnection();
  await beginTransaction(connection);

  try {
    const ownershipCleanup = {
      Land: [
        [
          `DELETE FROM ownershipownerfixedasset WHERE landAssetId = ?`,
          [assetId],
        ],
        [
          `DELETE FROM ownershipleastfixedasset WHERE landAssetId = ?`,
          [assetId],
        ],
        [
          `DELETE FROM ownershippermitfixedasset WHERE landAssetId = ?`,
          [assetId],
        ],
        [
          `DELETE FROM ownershipsharedfixedasset WHERE landAssetId = ?`,
          [assetId],
        ],
      ],
      "Building and Infrastructures": [
        [
          `DELETE FROM ownershipownerfixedasset WHERE buildingAssetId = ?`,
          [assetId],
        ],
        [
          `DELETE FROM ownershipleastfixedasset WHERE buildingAssetId = ?`,
          [assetId],
        ],
        [
          `DELETE FROM ownershippermitfixedasset WHERE buildingAssetId = ?`,
          [assetId],
        ],
        [
          `DELETE FROM ownershipsharedfixedasset WHERE buildingAssetId = ?`,
          [assetId],
        ],
      ],
      "Machine and Vehicles": [
        [
          `DELETE FROM machtoolsfixedassetwarranty WHERE machToolsId = ?`,
          [assetId],
        ],
      ],
      Tools: [
        [
          `DELETE FROM machtoolsfixedassetwarranty WHERE machToolsId = ?`,
          [assetId],
        ],
      ],
    };

    const deleteAssetQueries = {
      Land: `DELETE lfa, fa FROM landfixedasset lfa JOIN fixedasset fa ON fa.id = lfa.fixedAssetId WHERE fa.userId = ? AND fa.id = ?`,
      "Building and Infrastructures": `DELETE bfa, fa FROM buildingfixedasset bfa JOIN fixedasset fa ON fa.id = bfa.fixedAssetId WHERE fa.userId = ? AND fa.id = ?`,
      "Machine and Vehicles": `DELETE mtfa, fa FROM machtoolsfixedasset mtfa JOIN fixedasset fa ON fa.id = mtfa.fixedAssetId WHERE fa.userId = ? AND fa.id = ?`,
      Tools: `DELETE mtfa, fa FROM machtoolsfixedasset mtfa JOIN fixedasset fa ON fa.id = mtfa.fixedAssetId WHERE fa.userId = ? AND fa.id = ?`,
    };

    if (!ownershipCleanup[category]) throw new Error("INVALID_CATEGORY");

    for (const [sql, params] of ownershipCleanup[category]) {
      await queryWithConnection(connection, sql, params);
    }

    await queryWithConnection(connection, deleteAssetQueries[category], [
      userId,
      assetId,
    ]);

    await commitTransaction(connection);
    connection.release();
  } catch (err) {
    await new Promise((res) => connection.rollback(res));
    connection.release();
    throw err;
  }
};
