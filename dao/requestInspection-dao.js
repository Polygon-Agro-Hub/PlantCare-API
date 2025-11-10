const db = require("../startup/database");

exports.getOfficerservices = async () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT * FROM officerservices 
            ORDER BY englishName ASC, sinhalaName ASC, tamilName ASC, srvFee ASC 
            LIMIT 1000
        `;

        db.plantcare.query(query, [], (error, results) => {
            if (error) {
                console.error("Error fetching officerservices:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};


exports.getAllFarmByUserId = async (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT * FROM farms 
            WHERE userId = ?
        `;

        db.plantcare.query(query, [userId], (error, results) => {
            if (error) {
                console.error("Error fetching farms:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};


exports.getFramCrop = async (farmId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                f.*,
                cc.id as cropCalendarId,
                cv.id as cropVarietyId,
              
                cg.id as cropGroupId,
                cg.cropNameEnglish,
                cg.cropNameSinhala,
                cg.cropNameTamil,
                occ.ongoingCultivationId,
                occ.cropCalendar as cropCalendarId,
                occ.farmId
            FROM farms f
            LEFT JOIN ongoingcultivationscrops occ ON f.id = occ.farmId
            LEFT JOIN cropcalender cc ON occ.cropCalendar = cc.id
            LEFT JOIN cropvariety cv ON cc.cropVarietyId = cv.id
            LEFT JOIN cropgroup cg ON cv.cropGroupId = cg.id
            WHERE f.id = ?
            ORDER BY occ.ongoingCultivationId ASC, occ.cropCalendar ASC, occ.farmId
        `;

        db.plantcare.query(query, [farmId], (error, results) => {
            if (error) {
                console.error("Error fetching farms with crops:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

const generateJobId = async (connection) => {
    return new Promise((resolve, reject) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const prefix = `SR${year}${month}${date}`;

        const query = `
            SELECT jobId FROM govilinkjobs 
            WHERE jobId LIKE ? 
            ORDER BY jobId DESC 
            LIMIT 1
        `;

        connection.query(query, [`${prefix}%`], (error, results) => {
            if (error) {
                reject(error);
                return;
            }

            let sequence = 1;
            if (results && results.length > 0) {
                const lastJobId = results[0].jobId;
                const lastSequence = parseInt(lastJobId.substring(prefix.length));
                if (!isNaN(lastSequence)) {
                    sequence = lastSequence + 1;
                }
            }

            const newJobId = `${prefix}${String(sequence).padStart(3, '0')}`;
            resolve(newJobId);
        });
    });
};

// Generate transaction ID for payment tracking
const generateTransactionId = async (connection) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT transactionId 
            FROM govijobpayment 
            ORDER BY id DESC 
            LIMIT 1
        `;

        connection.query(query, (error, results) => {
            if (error) {
                console.error("Error fetching last transaction ID:", error);
                return reject(error);
            }

            let newTransactionId;

            // Check if no results or transactionId is null/empty
            if (results.length === 0 || !results[0].transactionId) {
                newTransactionId = 'GTID0000001';
                console.log("No previous transaction ID found, starting with:", newTransactionId);
            } else {
                const lastTransactionId = results[0].transactionId;
                console.log("Last transaction ID:", lastTransactionId);

                const match = lastTransactionId.match(/(\d+)$/);

                if (match) {
                    const lastNumber = parseInt(match[1]);
                    const newNumber = lastNumber + 1;
                    const paddedNumber = newNumber.toString().padStart(7, '0');
                    newTransactionId = `GTID${paddedNumber}`;
                } else {
                    // If format doesn't match, start fresh
                    newTransactionId = 'GTID0000001';
                    console.log("Invalid transaction ID format, starting fresh with:", newTransactionId);
                }
            }

            console.log("Generated new transaction ID:", newTransactionId);
            resolve(newTransactionId);
        });
    });
};

// Get connection from pool
const getConnection = () => {
    return new Promise((resolve, reject) => {
        db.plantcare.getConnection((error, connection) => {
            if (error) {
                reject(error);
            } else {
                resolve(connection);
            }
        });
    });
};

// Start database transaction
const beginTransaction = (connection) => {
    return new Promise((resolve, reject) => {
        connection.beginTransaction((error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
};

// Commit transaction
const commitTransaction = (connection) => {
    return new Promise((resolve, reject) => {
        connection.commit((error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
};

// Rollback transaction
const rollbackTransaction = (connection) => {
    return new Promise((resolve, reject) => {
        connection.rollback((error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
};

// Insert into govilinkjobs table with crop count
const insertJob = (connection, jobId, userId, item, cropCount) => {
    return new Promise((resolve, reject) => {
        // isAllCrops now stores the crop count from frontend
        const query = `
            INSERT INTO govilinkjobs
            (jobId, farmerId, serviceId, farmId, sheduleDate, isAllCrops,status, createdAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?,NOW())
        `;

        connection.query(
            query,
            [jobId, userId, item.serviceId, item.farmId, item.scheduleDate, cropCount, "Request Placed"],
            (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        insertId: results.insertId,
                        jobId: jobId
                    });
                }
            }
        );
    });
};

// Insert crops into jobrequestcrops table
const insertCrops = (connection, insertedId, crops) => {
    return new Promise((resolve, reject) => {
        if (!crops || crops.length === 0) {
            resolve([]);
            return;
        }

        const values = [];
        const placeholders = [];

        crops.forEach(crop => {
            placeholders.push('(?, ?, NOW())');
            values.push(insertedId, crop.cropGroupId || crop.id);
        });

        const query = `
            INSERT INTO jobrequestcrops 
            (jobId, cropId, createdAt) 
            VALUES ${placeholders.join(', ')}
        `;

        connection.query(query, values, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

// Insert payment with transaction ID
const insertPayment = (connection, insertedId, amount, transactionId) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO govijobpayment 
            (jobId, amount, transactionId, createdAt) 
            VALUES (?, ?, ?, NOW())
        `;

        connection.query(query, [insertedId, amount, transactionId], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

// Update farm details
const updateFarmDetails = (connection, farmId, plotNo, streetName, city) => {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE farms 
            SET plotNo = ?, street = ?, city = ?
            WHERE id = ?
        `;

        connection.query(
            query,
            [plotNo, streetName, city, farmId],
            (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            }
        );
    });
};

// Update the main submitRequestInspection function
exports.submitRequestInspection = async (userId, requestItems) => {
    let connection = null;
    let transactionStarted = false;

    try {
        // Get connection from pool
        connection = await getConnection();
        console.log("Database connection acquired");

        // Start database transaction
        await beginTransaction(connection);
        transactionStarted = true;
        console.log("Transaction started");

        const results = [];

        for (const item of requestItems) {
            // Generate unique job ID
            const jobId = await generateJobId(connection);
            console.log(`Generated Job ID: ${jobId}`);

            // Generate transaction ID for payment
            const transactionId = await generateTransactionId(connection);
            console.log(`Generated Transaction ID: ${transactionId}`);

            // Get crop count from frontend
            const cropCount = item.crops ? item.crops.length : 0;

            // 1. Update farm details if modified
            if (item.plotNo || item.streetName || item.city) {
                console.log(`Updating farm details for farm ID: ${item.farmId}`);
                await updateFarmDetails(
                    connection,
                    item.farmId,
                    item.plotNo,
                    item.streetName,
                    item.city
                );
                console.log(`Farm details updated for farm ID: ${item.farmId}`);
            }

            // 2. Insert into govilinkjobs table with crop count
            const jobResult = await insertJob(connection, jobId, userId, item, cropCount);
            const insertedId = jobResult.insertId;
            console.log(`Inserted job: ${jobId} with ID: ${insertedId}, Crop Count: ${cropCount}`);

            // 3. Insert crops into jobrequestcrops table
            await insertCrops(connection, insertedId, item.crops);
            console.log(`Inserted ${cropCount} crops for job ID: ${insertedId}`);

            // 4. Insert payment with transaction ID
            await insertPayment(connection, insertedId, item.amount, transactionId);
            console.log(`Inserted payment for job ID: ${insertedId}, Amount: ${item.amount}, Transaction ID: ${transactionId}`);

            results.push({
                id: insertedId,
                jobId: jobId,
                transactionId: transactionId,
                serviceId: item.serviceId,
                farmId: item.farmId,
                scheduleDate: item.scheduleDate,
                amount: item.amount,
                cropCount: cropCount,
                plotNo: item.plotNo,
                streetName: item.streetName,
                city: item.city,
                status: 'success'
            });
        }

        // Commit transaction if all successful
        await commitTransaction(connection);
        transactionStarted = false;
        console.log("Transaction committed successfully");

        return results;

    } catch (error) {
        console.error("Error in submitRequestInspection:", error);

        // Rollback transaction on error
        if (transactionStarted && connection) {
            try {
                await rollbackTransaction(connection);
                console.log("Transaction rolled back due to error");
            } catch (rollbackError) {
                console.error("Error during rollback:", rollbackError);
            }
        }

        throw error;

    } finally {
        // Always release connection back to pool
        if (connection) {
            connection.release();
            console.log("Database connection released");
        }
    }
};


exports.getRequest = async (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                gj.id,
                gj.farmerId,
                gj.serviceId,
                gj.farmId,
                gj.jobId, 
                gj.sheduleDate,
                gj.isAllCrops,
                gj.createdAt,
                gj.status,
                gj.doneDate,
                os.id as serviceId,
                os.englishName,
                os.sinhalaName,
                os.tamilName,
                os.srvFee
            FROM plant_care.govilinkjobs gj
            INNER JOIN plant_care.officerservices os ON gj.serviceId = os.id
            WHERE gj.farmerId = ?
          
        `;

        db.plantcare.query(query, [userId], (error, results) => {
            if (error) {
                console.error("Error fetching officer services:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};