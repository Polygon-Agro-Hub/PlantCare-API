const db = require("../startup/database");


exports.getTransactionHistoryByUserId = (userId, limit, offset) => {
 
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
          RFP.id AS registeredFarmerId,
          RFP.collectionOfficerId,
          RFP.invNo,
          U.id AS userId,
          U.firstName,
          U.lastName,
          U.phoneNumber,
          U.profileImage,
          CONCAT_WS(', ', U.houseNo, U.streetName, U.city, U.district) AS address,
          U.NICnumber,
          COALESCE(
              (SELECT 
                  SUM(gradeAprice * gradeAquan) + 
                  SUM(gradeBprice * gradeBquan) + 
                  SUM(gradeCprice * gradeCquan)
               FROM farmerpaymentscrops 
               WHERE registerFarmerId = RFP.id), 0
          ) AS totalAmount,
          COALESCE(
              (SELECT COUNT(id) 
               FROM farmerpaymentscrops 
               WHERE registerFarmerId = RFP.id), 0
          ) AS cropRecordCount,
          (SELECT accNumber FROM plant_care.userbankdetails WHERE userId = U.id LIMIT 1) AS accountNumber,
          (SELECT accHolderName FROM plant_care.userbankdetails WHERE userId = U.id LIMIT 1) AS accountHolderName,
          (SELECT bankName FROM plant_care.userbankdetails WHERE userId = U.id LIMIT 1) AS bankName,
          (SELECT branchName FROM plant_care.userbankdetails WHERE userId = U.id LIMIT 1) AS branchName,
          CO.empId,
          CO.centerId,
          CO.companyId,
          DATE(RFP.createdAt) AS transactionDate,
          RFP.createdAt
      FROM registeredfarmerpayments RFP
      INNER JOIN plant_care.users U ON RFP.userId = U.id
      INNER JOIN collectionofficer CO ON RFP.collectionOfficerId = CO.id
      WHERE U.id = ?
      ORDER BY RFP.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    db.collectionofficer.query(query, [userId, limit, offset], (error, results) => {
      if (error) {
        return reject(error);
      }
      
      resolve(results);
    });
  });
};
exports.getTransactionCountByUserId = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT COUNT(DISTINCT RFP.id) as count
      FROM registeredfarmerpayments RFP
      INNER JOIN plant_care.users U ON RFP.userId = U.id
      WHERE U.id = ?
    `;

    db.collectionofficer.query(query, [userId], (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results[0].count);
    });
  });
};

exports.getUserWithBankDetailsById = async (userId, centerId, companyId) => {
  const query = `
      SELECT
          u.id AS userId,
          u.firstName,
          u.lastName,
          u.phoneNumber,
          u.NICnumber,
          u.profileImage,
          u.farmerQr,
          b.accNumber,
          b.accHolderName,
          b.bankName,
          b.branchName,
          c.companyNameEnglish,
          cc.centerName,
          b.createdAt
      FROM users u
      LEFT JOIN userbankdetails b ON u.id = b.userId
      LEFT JOIN collection_officer.company c ON c.id = ?
      LEFT JOIN collection_officer.collectioncenter cc ON cc.id = ?
      WHERE u.id = ?;
  `;

  return new Promise((resolve, reject) => {
    db.plantcare.query(query, [companyId, centerId, userId], (err, result) => {
      if (err) return reject(err);
      resolve(result);
      
    });
  });
};



exports.GetFarmerReportDetailsDao = async (userId, createdAtDate, registeredFarmerId) => {
  const query = `
    SELECT
      fpc.id AS id,
      cg.cropNameEnglish AS cropName,
      cg.cropNameSinhala,
      cg.cropNameTamil,
      cv.varietyNameEnglish AS variety,
      cv.varietyNameSinhala,
      cv.varietyNameTamil,
      fpc.gradeAprice AS unitPriceA,
      fpc.gradeAquan AS weightA,
      fpc.gradeBprice AS unitPriceB,
      fpc.gradeBquan AS weightB,
      fpc.gradeCprice AS unitPriceC,
      fpc.gradeCquan AS weightC,
      DATE_FORMAT(fpc.createdAt, '%Y-%m-%d %H:%i:%s') AS createdAt,
      rfp.InvNo AS invoiceNumber
    FROM
      farmerpaymentscrops fpc
    INNER JOIN
      plant_care.cropvariety cv ON fpc.cropId = cv.id
    INNER JOIN
      plant_care.cropgroup cg ON cv.cropGroupId = cg.id
    INNER JOIN
      registeredfarmerpayments rfp ON fpc.registerFarmerId = rfp.id
    WHERE
      rfp.userId = ? 
      AND fpc.registerFarmerId = ?
    ORDER BY
      fpc.createdAt DESC
  `;

  return new Promise((resolve, reject) => {

    db.collectionofficer.query(query, [userId, registeredFarmerId, createdAtDate], (error, results) => {
      if (error) return reject(error);


      const transformedResults = results.flatMap(row => {
        const entries = [];

        if (row.weightA > 0) entries.push({
          id: row.id,
          cropName: row.cropName,
          cropNameSinhala: row.cropNameSinhala,
          cropNameTamil: row.cropNameTamil,
          varietyNameSinhala: row.varietyNameSinhala,
          varietyNameTamil: row.varietyNameTamil,
          variety: row.variety,
          grade: 'A',
          unitPrice: row.unitPriceA,
          quantity: row.weightA,
          subTotal: (row.unitPriceA * row.weightA).toFixed(2),
          invoiceNumber: row.invoiceNumber,
          createdAt: row.createdAt
        });

        if (row.weightB > 0) entries.push({
          id: row.id,
          cropName: row.cropName,
          cropNameSinhala: row.cropNameSinhala,
          cropNameTamil: row.cropNameTamil,
          varietyNameSinhala: row.varietyNameSinhala,
          varietyNameTamil: row.varietyNameTamil,
          variety: row.variety,
          grade: 'B',
          unitPrice: row.unitPriceB,
          quantity: row.weightB,
          subTotal: (row.unitPriceB * row.weightB).toFixed(2),
          invoiceNumber: row.invoiceNumber,
          createdAt: row.createdAt
        });

        if (row.weightC > 0) entries.push({
          id: row.id,
          cropName: row.cropName,
          cropNameSinhala: row.cropNameSinhala,
          cropNameTamil: row.cropNameTamil,
          varietyNameSinhala: row.varietyNameSinhala,
          varietyNameTamil: row.varietyNameTamil,
          variety: row.variety,
          grade: 'C',
          unitPrice: row.unitPriceC,
          quantity: row.weightC,
          subTotal: (row.unitPriceC * row.weightC).toFixed(2),
          invoiceNumber: row.invoiceNumber,
          createdAt: row.createdAt
        });

        return entries;
      });

      resolve(transformedResults);
    });
  });
};


function formatDateTime(dateTimeString) {
  const date = new Date(dateTimeString);
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}


