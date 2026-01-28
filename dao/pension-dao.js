const db = require('../startup/database');

// Check Pension Request
exports.checkPensionRequestByUserId = (userId) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT 
                pr.id, 
                pr.reqStatus, 
                pr.defaultPension,
                pr.createdAt as requestCreatedAt,
                pr.isFirstTime,
                u.created_at as userCreatedAt
            FROM pensionrequest pr
            INNER JOIN users u ON pr.userId = u.id
            WHERE pr.userId = ? 
            LIMIT 1
        `;
        
        db.plantcare.query(sql, [userId], (err, results) => {
            if (err) {
                console.error("Error executing query:", err);
                reject(err);
            } else {
                if (results.length === 0) {
                    resolve(null);
                } else {
                    resolve(results[0]);
                }
            }
        });
    });
};

// Submit Pension Request
exports.submitPensionRequestDAO = (pensionData) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO pensionrequest (
                userId, fullName, nic, nicFront, nicBack, dob,
                sucFullName, sucType, sucNic, sucNicFront, sucNicBack, 
                birthCrtFront, birthCrtBack, sucdob,
                reqStatus, isFirstTime
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'To Review', 0)
        `;
        
        db.plantcare.query(query, [
            pensionData.userId,
            pensionData.fullName,
            pensionData.nic,
            pensionData.nicFront,
            pensionData.nicBack,
            pensionData.dob,
            pensionData.sucFullName,
            pensionData.sucType,
            pensionData.sucNic || null,
            pensionData.sucNicFront || null,
            pensionData.sucNicBack || null,
            pensionData.birthCrtFront || null,
            pensionData.birthCrtBack || null,
            pensionData.sucdob
        ], (err, result) => {
            if (err) {
                console.error("Error creating pension request:", err);
                reject(err);
            } else {
                resolve(result.insertId);
            }
        });
    });
};

exports.updateFirstTimeStatus = (userId) => {
    return new Promise((resolve, reject) => {
        const sql = "UPDATE pensionrequest SET isFirstTime = 1 WHERE userId = ? AND reqStatus = 'Approved'";
        db.plantcare.query(sql, [userId], (err, results) => {
            if (err) {
                console.error("Error executing query:", err);
                reject(err);
            } else {
                if (results.affectedRows === 0) {
                    resolve(null);
                } else {
                    resolve({
                        userId: userId,
                        isFirstTime: 1,
                        updatedRows: results.affectedRows
                    });
                }
            }
        });
    });
};