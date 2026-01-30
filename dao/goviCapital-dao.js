const db = require("../startup/database");



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
                ir.isFistTime,
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


exports.getApprovedStatusDetails = async (invId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                ir.id AS requestId,
                ir.jobId,
                ir.officerId,
                air.id AS approvedRequestId,
                air.reqId AS approvedReqId,
                air.totValue AS totalValue,
                air.defineShares,
                air.minShare,
                air.maxShare,
                air.defineBy,
                air.createdAt AS approvedCreatedAt
            FROM investmentrequest ir
            LEFT JOIN approvedinvestmentrequest air ON ir.id = air.reqId
            WHERE ir.id = ?
        `;

        const investmentQuery = `
            SELECT 
                id AS investmentId,
                investerId,
                reqId,
                refCode,
                investerName,
                nic,
                shares,
                totInvt,
                expextreturnInvt,
                internalRate,
                invtStatus,
                createdAt AS investmentCreatedAt
            FROM investment
            WHERE reqId = ? AND invtStatus = 'Approved'
        `;

        db.investments.query(query, [invId], (error, requestResults) => {
            if (error) {
                console.error("Error fetching Investment request details:", error);
                reject(error);
            } else {
                db.investments.query(investmentQuery, [invId], (invError, investmentResults) => {
                    if (invError) {
                        console.error("Error fetching Investment details:", invError);
                        reject(invError);
                    } else {
                        const response = {
                            ...requestResults[0],
                            investments: investmentResults || []
                        };
                        resolve(response);
                    }
                });
            }
        });
    });
};


exports.updateReviewStatus = async (invId) => {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE investmentrequest 
            SET isFistTime = 1
            WHERE id = ?
        `;
        db.investments.query(query, [invId], (error, results) => {
            if (error) {
                console.error("Error updating review status:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};


