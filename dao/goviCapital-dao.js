const db = require("../startup/database");


// exports.getCrops = async (farmId) => {
//     return new Promise((resolve, reject) => {
//         const query = `
//             SELECT 
//                 f.*,
//                 cc.id as cropCalendarId,
//                 cv.id as cropVarietyId,

//                 cg.id as cropGroupId,
//                 cg.cropNameEnglish,
//                 cg.cropNameSinhala,
//                 cg.cropNameTamil,
//                 occ.ongoingCultivationId,
//                 occ.cropCalendar as cropCalendarId,
//                 oc.userId
//             FROM farms f
//             LEFT JOIN ongoingcultivations oc ON   oc.userId
//             LEFT JOIN ongoingcultivationscrops occ ON oc.id = occ.ongoingCultivationId
//             LEFT JOIN cropcalender cc ON occ.cropCalendar = cc.id
//             LEFT JOIN cropvariety cv ON cc.cropVarietyId = cv.id
//             LEFT JOIN cropgroup cg ON cv.cropGroupId = cg.id
//             WHERE oc.userId = ?
//             ORDER BY occ.ongoingCultivationId ASC, occ.cropCalendar ASC, occ.farmId
//         `;

//         db.plantcare.query(query, [farmId], (error, results) => {
//             if (error) {
//                 console.error("Error fetching farms with crops:", error);
//                 reject(error);
//             } else {
//                 resolve(results);
//             }
//         });
//     });
// };

exports.getCrops = async () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                id as cropGroupId,
                cropNameEnglish,
                cropNameSinhala,
                cropNameTamil
            FROM cropgroup
        `;

        db.plantcare.query(query, (error, results) => {
            if (error) {
                console.error("Error fetching crops:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};


exports.getFarmerDetails = async (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT id,firstName,lastName,phoneNumber,NICnumber,membership,activeStatus, houseNo,streetName,  city,district
        FROM users 
        WHERE id = ?

      `;
        db.plantcare.query(query, [userId], (error, results) => {
            if (error) {
                console.error("Error fetching farmer:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

// exports.createInvestmentRequest = async (requestData) => {
//     return new Promise((resolve, reject) => {
//         const query = `
//             INSERT INTO investmentrequest
//             (cropId, farmerId, extentha, extentac, extentp, investment, expectedYield, startDate, nicFront, nicBack)
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//         `;

//         const values = [
//             requestData.cropId,
//             requestData.farmerId,
//             requestData.extentha,
//             requestData.extentac,
//             requestData.extentp,
//             requestData.investment,
//             requestData.expectedYield,
//             requestData.startDate,
//             requestData.nicFront,
//             requestData.nicBack
//         ];

//         db.investments.query(query, values, (error, results) => {
//             if (error) {
//                 console.error("Error creating investment request:", error);
//                 reject(error);
//             } else {
//                 resolve(results);
//             }
//         });
//     });
// };

exports.createInvestmentRequest = async (requestData) => {
    return new Promise((resolve, reject) => {
        // Get a connection from the pool
        db.investments.getConnection((err, connection) => {
            if (err) {
                console.error("Error getting connection:", err);
                reject(err);
                return;
            }

            // Start a transaction
            connection.beginTransaction((transErr) => {
                if (transErr) {
                    console.error("Error starting transaction:", transErr);
                    connection.release();
                    reject(transErr);
                    return;
                }

                // Get the last jobId that starts with 'GC' with row locking
                const getLastJobIdQuery = `
                    SELECT jobId 
                    FROM investmentrequest 
                    WHERE jobId LIKE 'GC%' 
                    ORDER BY CAST(SUBSTRING(jobId, 3) AS UNSIGNED) DESC 
                    LIMIT 1
                    FOR UPDATE
                `;

                connection.query(getLastJobIdQuery, (error, results) => {
                    if (error) {
                        console.error("Error fetching last jobId:", error);
                        return connection.rollback(() => {
                            connection.release();
                            reject(error);
                        });
                    }

                    let nextJobId;

                    if (results.length === 0 || !results[0].jobId) {
                        nextJobId = 'GC000001';
                    } else {
                        const lastJobId = results[0].jobId;
                        const numericPart = parseInt(lastJobId.replace('GC', ''), 10);
                        const nextNumber = numericPart + 1;
                        nextJobId = 'GC' + nextNumber.toString().padStart(6, '0');
                    }

                    console.log("Generated jobId:", nextJobId);

                    // Insert the new investment request
                    const insertQuery = `
                        INSERT INTO investmentrequest
                        (cropId, farmerId, jobId, extentha, extentac, extentp, investment, expectedYield, startDate, nicFront, nicBack)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    const values = [
                        requestData.cropId,
                        requestData.farmerId,
                        nextJobId,
                        requestData.extentha,
                        requestData.extentac,
                        requestData.extentp,
                        requestData.investment,
                        requestData.expectedYield,
                        requestData.startDate,
                        requestData.nicFront,
                        requestData.nicBack
                    ];

                    connection.query(insertQuery, values, (insertError, insertResults) => {
                        if (insertError) {
                            console.error("Error creating investment request:", insertError);
                            return connection.rollback(() => {
                                connection.release();
                                reject(insertError);
                            });
                        }

                        // Commit the transaction
                        connection.commit((commitError) => {
                            if (commitError) {
                                console.error("Error committing transaction:", commitError);
                                return connection.rollback(() => {
                                    connection.release();
                                    reject(commitError);
                                });
                            }

                            // Release connection back to pool
                            connection.release();

                            // Return success with generated jobId
                            resolve({
                                ...insertResults,
                                jobId: nextJobId,
                                insertId: insertResults.insertId
                            });
                        });
                    });
                });
            });
        });
    });
};

// exports.getInvestmentRequests = async (userId) => {
//     return new Promise((resolve, reject) => {
//         const query = `
//         SELECT  id,  cropId,  farmerId,  officerId,  jobId,extentha, extentac,  extentp,  investment,  expectedYield,  startDate, nicFront,nicBack,assignDate,  publishDate,assignedBy,publishBy, reqStatus,publishStatus,createdAt
//         FROM investmentrequest
//         WHERE farmerId = ?

//       `;
//         db.investments.query(query, [userId], (error, results) => {
//             if (error) {
//                 console.error("Error fetching Investment Requests:", error);
//                 reject(error);
//             } else {
//                 resolve(results);
//             }
//         });
//     });
// };

exports.getInvestmentRequests = async (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT  
                ir.id,
                ir.cropId,
                ir.farmerId,
                ir.officerId,
                ir.jobId,
                ir.extentha,
                ir.extentac,
                ir.extentp,
                ir.investment,
                ir.expectedYield,
                ir.startDate,
                ir.nicFront,
                ir.nicBack,
                ir.assignDate,
                ir.publishDate,
                ir.assignedBy,
                ir.publishBy,
                ir.reqStatus,
                ir.publishStatus,
                ir.createdAt,
                cg.cropNameEnglish,
                cg.cropNameSinhala,
                cg.cropNameTamil
            FROM investmentrequest ir
            LEFT JOIN plant_care.cropgroup cg ON ir.cropId = cg.id
            WHERE ir.farmerId = ?
            ORDER BY ir.createdAt DESC
        `;

        db.investments.query(query, [userId], (error, results) => {
            if (error) {
                console.error("Error fetching Investment Requests:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};