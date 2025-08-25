// const db = require("../startup/database");

// exports.createFarmWithStaff = (farmData) => {
//     return new Promise((resolve, reject) => {
//         let connection;

//         db.plantcare.getConnection((err, conn) => {
//             if (err) {
//                 return reject(new Error(`Database connection error: ${err.message}`));
//             }
//             connection = conn;

//             connection.beginTransaction(async (beginErr) => {
//                 if (beginErr) {
//                     connection.release();
//                     return reject(new Error(`Transaction start error: ${beginErr.message}`));
//                 }

//                 try {
//                     // Insert farm
//                     const insertFarmSql = `
//                         INSERT INTO farms 
//                         (userId, farmName, farmIndex, extentha, extentac, extentp, district, plotNo, street, city, staffCount, appUserCount)
//                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//                     `;

//                     const farmValues = [
//                         farmData.userId,
//                         farmData.farmName,
//                         farmData.farmIndex,
//                         farmData.extentha,
//                         farmData.extentac,
//                         farmData.extentp,
//                         farmData.district,
//                         farmData.plotNo,
//                         farmData.street,
//                         farmData.city,
//                         farmData.staffCount,
//                         farmData.appUserCount
//                     ];

//                     const [farmResult] = await connection.promise().query(insertFarmSql, farmValues);
//                     const farmId = farmResult.insertId;
//                     const staffIds = [];

//                     // Insert staff if provided
//                     if (farmData.staff && Array.isArray(farmData.staff) && farmData.staff.length > 0) {
//                         const insertStaffSql = `
//                             INSERT INTO farmstaff 
//                             (ownerId, farmId, firstName, lastName, phoneCode, phoneNumber, role, image)
//                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//                         `;

//                         for (const staff of farmData.staff) {
//                             const staffValues = [
//                                 farmData.userId,
//                                 farmId,
//                                 staff.firstName,
//                                 staff.lastName,
//                                 staff.phoneCode,
//                                 staff.phoneNumber,
//                                 staff.role,
//                                 staff.image || null
//                             ];

//                             const [staffResult] = await connection.promise().query(insertStaffSql, staffValues);
//                             staffIds.push(staffResult.insertId);
//                         }
//                     }

//                     connection.commit((commitErr) => {
//                         if (commitErr) {
//                             return connection.rollback(() => {
//                                 connection.release();
//                                 reject(new Error(`Commit error: ${commitErr.message}`));
//                             });
//                         }

//                         connection.release();
//                         resolve({
//                             success: true,
//                             farmId,
//                             staffIds,
//                             message: 'Farm and staff created successfully'
//                         });
//                     });
//                 } catch (error) {
//                     connection.rollback(() => {
//                         connection.release();
//                         reject(new Error(`Database operation error: ${error.message}`));
//                     });
//                 }
//             });
//         });
//     });
// };

// const db = require("../startup/database");

// exports.createFarmWithStaff = async (farmData) => {
//     let connection;

//     try {
//         // Get connection from pool
//         connection = await new Promise((resolve, reject) => {
//             db.plantcare.getConnection((err, conn) => {
//                 if (err) return reject(err);
//                 resolve(conn);
//             });
//         });

//         // Start transaction
//         await new Promise((resolve, reject) => {
//             connection.beginTransaction(err => {
//                 if (err) return reject(err);
//                 resolve(true);
//             });
//         });

//         // Format phone numbers and validate
//         if (farmData.staff && Array.isArray(farmData.staff)) {
//             farmData.staff = farmData.staff.map(staff => {
//                 // Ensure phone number has +94 prefix
//                 let phoneNumber = staff.phoneNumber;
//                 if (!phoneNumber.startsWith('+94')) {
//                     if (phoneNumber.startsWith('0')) {
//                         phoneNumber = '+94' + phoneNumber.substring(1);
//                     } else {
//                         phoneNumber = '+94' + phoneNumber;
//                     }
//                 }
//                 return {
//                     ...staff,
//                     phoneNumber: phoneNumber.replace(/\D/g, '') // Remove non-digit characters
//                 };
//             });
//         }

//         // Insert farm
//         const insertFarmSql = `
//             INSERT INTO farms 
//             (userId, farmName, farmIndex, extentha, extentac, extentp, district, plotNo, street, city, staffCount, appUserCount,imageId)
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
//         `;

//         const farmValues = [
//             farmData.userId,
//             farmData.farmName,
//             farmData.farmIndex,
//             farmData.extentha,
//             farmData.extentac,
//             farmData.extentp,
//             farmData.district,
//             farmData.plotNo,
//             farmData.street,
//             farmData.city,
//             farmData.staffCount,
//             farmData.appUserCount,
//             farmData.farmImage
//         ];

//         const [farmResult] = await connection.promise().query(insertFarmSql, farmValues);
//         const farmId = farmResult.insertId;
//         const staffIds = [];

//         // Insert staff if provided
//         if (farmData.staff && farmData.staff.length > 0) {
//             const insertStaffSql = `
//                 INSERT INTO farmstaff 
//                 (ownerId, farmId, firstName, lastName, phoneCode, phoneNumber, role, image)
//                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//             `;

//             for (const staff of farmData.staff) {
//                 const [staffResult] = await connection.promise().query(insertStaffSql, [
//                     farmData.userId,
//                     farmId,
//                     staff.firstName,
//                     staff.lastName,
//                     '+94', // Hardcoded as we've formatted the number
//                     staff.phoneNumber.replace('+94', ''), // Store without country code
//                     staff.role,
//                     staff.image || null
//                 ]);
//                 staffIds.push(staffResult.insertId);
//             }
//         }

//         // Commit transaction
//         await new Promise((resolve, reject) => {
//             connection.commit(err => {
//                 if (err) return reject(err);
//                 resolve(true);
//             });
//         });

//         return {
//             success: true,
//             farmId,
//             staffIds,
//             message: 'Farm and staff created successfully'
//         };

//     } catch (error) {
//         // Rollback transaction if connection exists
//         if (connection) {
//             await new Promise(resolve => {
//                 connection.rollback(() => resolve(true));
//             });
//         }
//         console.error('Database error:', error);
//         throw error;

//     } finally {
//         // Release connection back to pool
//         if (connection) {
//             connection.release();
//         }
//     }
// };


const db = require("../startup/database");

// exports.createFarmWithStaff = async (farmData) => {
//     let connection;

//     try {
//         // Get connection from pool
//         connection = await new Promise((resolve, reject) => {
//             db.plantcare.getConnection((err, conn) => {
//                 if (err) return reject(err);
//                 resolve(conn);
//             });
//         });

//         // Start transaction
//         await new Promise((resolve, reject) => {
//             connection.beginTransaction(err => {
//                 if (err) return reject(err);
//                 resolve(true);
//             });
//         });

//         // Get the current farm count for this user to generate farmIndex
//         const getFarmCountSql = `SELECT COUNT(*) as farmCount FROM farms WHERE userId = ?`;
//         const [countResult] = await connection.promise().query(getFarmCountSql, [farmData.userId]);
//         const currentFarmCount = countResult[0].farmCount;
//         const nextFarmIndex = currentFarmCount + 1;

//         // Format phone numbers and validate
//         if (farmData.staff && Array.isArray(farmData.staff)) {
//             farmData.staff = farmData.staff.map(staff => {
//                 // Ensure phone number has +94 prefix
//                 let phoneNumber = staff.phoneNumber;
//                 if (!phoneNumber.startsWith('+94')) {
//                     if (phoneNumber.startsWith('0')) {
//                         phoneNumber = '+94' + phoneNumber.substring(1);
//                     } else {
//                         phoneNumber = '+94' + phoneNumber;
//                     }
//                 }
//                 return {
//                     ...staff,
//                     phoneNumber: phoneNumber.replace(/\D/g, '') // Remove non-digit characters
//                 };
//             });
//         }

//         // Insert farm with auto-generated farmIndex
//         const insertFarmSql = `
//             INSERT INTO farms 
//             (userId, farmName, farmIndex, extentha, extentac, extentp, district, plotNo, street, city, staffCount, appUserCount, imageId)
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//         `;

//         const farmValues = [
//             farmData.userId,
//             farmData.farmName,
//             nextFarmIndex, // Auto-generated farmIndex
//             farmData.extentha,
//             farmData.extentac,
//             farmData.extentp,
//             farmData.district,
//             farmData.plotNo,
//             farmData.street,
//             farmData.city,
//             farmData.staffCount,
//             farmData.appUserCount,
//             farmData.farmImage
//         ];

//         const [farmResult] = await connection.promise().query(insertFarmSql, farmValues);
//         const farmId = farmResult.insertId;
//         const staffIds = [];

//         // Insert staff if provided
//         if (farmData.staff && farmData.staff.length > 0) {
//             const insertStaffSql = `
//                 INSERT INTO farmstaff 
//                 (ownerId, farmId, firstName, lastName, phoneCode, phoneNumber, role, image)
//                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//             `;

//             for (const staff of farmData.staff) {
//                 const [staffResult] = await connection.promise().query(insertStaffSql, [
//                     farmData.userId,
//                     farmId,
//                     staff.firstName,
//                     staff.lastName,
//                     '+94', // Hardcoded as we've formatted the number
//                     staff.phoneNumber.replace('+94', ''), // Store without country code
//                     staff.role,
//                     staff.image || null
//                 ]);
//                 staffIds.push(staffResult.insertId);
//             }
//         }

//         // Commit transaction
//         await new Promise((resolve, reject) => {
//             connection.commit(err => {
//                 if (err) return reject(err);
//                 resolve(true);
//             });
//         });

//         return {
//             success: true,
//             farmId,
//             farmIndex: nextFarmIndex, // Return the generated farmIndex
//             staffIds,
//             message: 'Farm and staff created successfully'
//         };

//     } catch (error) {
//         // Rollback transaction if connection exists
//         if (connection) {
//             await new Promise(resolve => {
//                 connection.rollback(() => resolve(true));
//             });
//         }
//         console.error('Database error:', error);
//         throw error;

//     } finally {
//         // Release connection back to pool
//         if (connection) {
//             connection.release();
//         }
//     }
// };


exports.createFarmWithStaff = async (farmData) => {
    let connection;

    try {
        // Get connection from pool
        connection = await new Promise((resolve, reject) => {
            db.plantcare.getConnection((err, conn) => {
                if (err) return reject(err);
                resolve(conn);
            });
        });

        // Start transaction
        await new Promise((resolve, reject) => {
            connection.beginTransaction(err => {
                if (err) return reject(err);
                resolve(true);
            });
        });

        // Get the current farm count for this user to generate farmIndex
        const getFarmCountSql = `SELECT COUNT(*) as farmCount FROM farms WHERE userId = ?`;
        const [countResult] = await connection.promise().query(getFarmCountSql, [farmData.userId]);
        const currentFarmCount = countResult[0].farmCount;
        const nextFarmIndex = currentFarmCount + 1;

        // Validate and clean staff data
        if (farmData.staff && Array.isArray(farmData.staff)) {
            farmData.staff = farmData.staff.map(staff => {
                // Clean phone number (remove any non-digit characters except +)
                let phoneCode = staff.phoneCode || '+94';
                let phoneNumber = staff.phoneNumber;

                // Ensure phoneCode starts with +
                if (!phoneCode.startsWith('+')) {
                    phoneCode = '+' + phoneCode;
                }

                // Clean phoneNumber (remove any non-digit characters)
                phoneNumber = phoneNumber.replace(/\D/g, '');

                return {
                    ...staff,
                    phoneCode: phoneCode,
                    phoneNumber: phoneNumber,
                    nic: staff.nic || null // Ensure NIC is properly handled
                };
            });
        }

        // Insert farm with auto-generated farmIndex
        const insertFarmSql = `
            INSERT INTO farms 
            (userId, farmName, farmIndex, extentha, extentac, extentp, district, plotNo, street, city, staffCount, appUserCount, imageId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const farmValues = [
            farmData.userId,
            farmData.farmName,
            nextFarmIndex, // Auto-generated farmIndex
            farmData.extentha,
            farmData.extentac,
            farmData.extentp,
            farmData.district,
            farmData.plotNo,
            farmData.street,
            farmData.city,
            farmData.staffCount,
            farmData.appUserCount,
            farmData.farmImage
        ];

        const [farmResult] = await connection.promise().query(insertFarmSql, farmValues);
        const farmId = farmResult.insertId;
        const staffIds = [];

        // Insert staff if provided
        if (farmData.staff && farmData.staff.length > 0) {
            const insertStaffSql = `
                INSERT INTO farmstaff 
                (ownerId, farmId, firstName, lastName, phoneCode, phoneNumber, role, nic, image)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            for (const staff of farmData.staff) {
                console.log('Inserting staff member:', staff); // Debug log

                const staffValues = [
                    farmData.userId,      // ownerId
                    farmId,               // farmId
                    staff.firstName,      // firstName
                    staff.lastName,       // lastName
                    staff.phoneCode,      // phoneCode
                    staff.phoneNumber,    // phoneNumber
                    staff.role,           // role
                    staff.nic || null,    // nic - THIS WAS THE MISSING PARAMETER
                    staff.image || null   // image
                ];

                console.log('Staff values being inserted:', staffValues); // Debug log

                const [staffResult] = await connection.promise().query(insertStaffSql, staffValues);
                staffIds.push(staffResult.insertId);
            }
        }

        // Commit transaction
        await new Promise((resolve, reject) => {
            connection.commit(err => {
                if (err) return reject(err);
                resolve(true);
            });
        });

        return {
            success: true,
            farmId,
            farmIndex: nextFarmIndex, // Return the generated farmIndex
            staffIds,
            message: 'Farm and staff created successfully'
        };

    } catch (error) {
        // Rollback transaction if connection exists
        if (connection) {
            await new Promise(resolve => {
                connection.rollback(() => resolve(true));
            });
        }
        console.error('Database error:', error);
        throw error;

    } finally {
        // Release connection back to pool
        if (connection) {
            connection.release();
        }
    }
};

// exports.getAllFarmByUserId = async (userId) => {
//     return new Promise((resolve, reject) => {
//         const query = `
//         SELECT id,userId, farmName, farmIndex, extentha, extentac, extentp, district, plotNo, street, city, staffCount, appUserCount, imageId
//         FROM farms
//         WHERE userId = ?
//         ORDER BY createdAt DESC
//       `;
//         db.plantcare.query(query, [userId], (error, results) => {
//             if (error) {
//                 console.error("Error fetching farms:", error);
//                 reject(error);
//             } else {
//                 resolve(results);
//             }
//         });
//     });
// };

exports.getAllFarmByUserId = async (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                f.id,
                f.userId, 
                f.farmName, 
                f.farmIndex, 
                f.extentha, 
                f.extentac, 
                f.extentp, 
                f.district, 
                f.plotNo, 
                f.street, 
                f.city, 
                f.staffCount, 
                f.appUserCount, 
                f.imageId,
                f.isBlock,
                COALESCE(COUNT(occ.farmId), 0) as farmCropCount
            FROM farms f
            LEFT JOIN ongoingcultivationscrops occ ON f.id = occ.farmId
            WHERE f.userId = ?
            GROUP BY f.id, f.userId, f.farmName, f.farmIndex, f.extentha, f.extentac, f.extentp, 
                     f.district, f.plotNo, f.street, f.city, f.staffCount, f.appUserCount, f.imageId, f.isBlock
            ORDER BY f.id DESC
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

exports.getFarmByIdWithStaff = async (farmId, userId) => {
    return new Promise((resolve, reject) => {
        // First get farm data
        const farmQuery = `
            SELECT id, userId, farmName, farmIndex, extentha, extentac, extentp, 
                   district, plotNo, street, city, staffCount, appUserCount, imageId
            FROM farms
            WHERE id = ? AND userId = ?
        `;

        db.plantcare.query(farmQuery, [farmId, userId], (error, farmResults) => {
            if (error) {
                console.error("Error fetching farm:", error);
                reject(error);
                return;
            }

            if (farmResults.length === 0) {
                resolve(null);
                return;
            }

            const farm = farmResults[0];

            // Get staff data for this farm
            const staffQuery = `
                SELECT id, ownerId, farmId, firstName, lastName, phoneCode, 
                       phoneNumber, role, LEFT(image, 256) as image, createdAt
                FROM farmstaff
                WHERE farmId = ?
                ORDER BY role ASC, firstName ASC, lastName ASC
            `;

            db.plantcare.query(staffQuery, [farmId], (staffError, staffResults) => {
                if (staffError) {
                    console.error("Error fetching staff:", staffError);
                    reject(staffError);
                    return;
                }

                // Combine farm and staff data
                const result = {
                    farm: farm,
                    staff: staffResults || []
                };

                resolve(result);
            });
        });
    });
};




exports.getMemberShip = async (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, firstName, lastName, membership
            FROM users
            WHERE id = ?
            LIMIT 1
        `;

        db.plantcare.query(query, [userId], (error, results) => {
            if (error) {
                console.error("Error fetching user membership:", error);
                reject(error);
            } else {
                // Since we're looking for a single user, return the first result or null
                resolve(results.length > 0 ? results[0] : null);
            }
        });
    });
};


exports.createPaymentAndUpdateMembership = async (paymentData) => {
    let connection;

    try {
        // Get connection from pool
        connection = await new Promise((resolve, reject) => {
            db.plantcare.getConnection((err, conn) => {
                if (err) return reject(err);
                resolve(conn);
            });
        });

        // Start transaction
        await new Promise((resolve, reject) => {
            connection.beginTransaction(err => {
                if (err) return reject(err);
                resolve(true);
            });
        });

        // Insert payment record
        const insertPaymentSql = `
            INSERT INTO membershippayment 
            (userId, payment, plan, expireDate, activeStatus)
            VALUES (?, ?, ?, ?, 1)
        `;

        const paymentValues = [
            paymentData.userId,
            paymentData.payment,
            paymentData.plan,
            paymentData.expireDate
        ];

        const [paymentResult] = await connection.promise().query(insertPaymentSql, paymentValues);
        const paymentId = paymentResult.insertId;

        // Update user membership to 'Pro'
        const updateUserSql = `
            UPDATE users 
            SET membership = 'Pro'
            WHERE id = ?
        `;

        const [userResult] = await connection.promise().query(updateUserSql, [paymentData.userId]);

        // Commit transaction
        await new Promise((resolve, reject) => {
            connection.commit(err => {
                if (err) return reject(err);
                resolve(true);
            });
        });

        return {
            success: true,
            paymentId,
            userUpdated: userResult.affectedRows > 0,
            message: 'Payment processed and membership updated successfully'
        };

    } catch (error) {
        // Rollback transaction if connection exists
        if (connection) {
            await new Promise(resolve => {
                connection.rollback(() => resolve(true));
            });
        }
        console.error('Database error:', error);
        throw error;

    } finally {
        // Release connection back to pool
        if (connection) {
            connection.release();
        }
    }
};



////cultivation

// exports.getOngoingCultivationsByUserIdAndFarmId = (userId, farmId, callback) => {
//     const sql = `
//         SELECT * 
//         FROM ongoingcultivations c 
//         JOIN ongoingcultivationscrops oc ON c.id = oc.ongoingCultivationId
//         JOIN cropcalender cc ON oc.cropCalendar = cc.id
//         JOIN cropvariety cr ON cc.cropVarietyId = cr.id 
//         WHERE c.userId = ? AND oc.farmId = ?
//         ORDER BY oc.ongoingCultivationId ASC, oc.cropCalendar ASC, oc.farmId ASC
//     `;

//     db.plantcare.query(sql, [userId, farmId], (err, results) => {
//         if (err) {
//             console.error("Database error:", err);
//             return callback(err, null);
//         }
//         callback(null, results);
//     });
// };

exports.getOngoingCultivationsByUserIdAndFarmId = (userId, farmId, callback) => {
    const sql = `
        SELECT 
            c.id,
            c.userId,
            oc.startedAt,
            oc.farmId,
            oc.cropCalendar,
            oc.isBlock,
            cr.id as cropId,
            cr.varietyNameEnglish,
            cr.varietyNameSinhala,
            cr.varietyNameTamil,
            cr.image,
            DATE_FORMAT(oc.startedAt, '%Y-%m-%d') as staredAt
        FROM ongoingcultivations c 
        JOIN ongoingcultivationscrops oc ON c.id = oc.ongoingCultivationId
        JOIN cropcalender cc ON oc.cropCalendar = cc.id
        JOIN cropvariety cr ON cc.cropVarietyId = cr.id 
        WHERE c.userId = ? AND oc.farmId = ?
        ORDER BY oc.startedAt DESC, oc.cropCalendar ASC
    `;

    console.log('DEBUG: Executing query with userId:', userId, 'farmId:', farmId);

    db.plantcare.query(sql, [userId, farmId], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return callback(err, null);
        }

        console.log('DEBUG: Query results count:', results.length);
        console.log('DEBUG: Sample result farmIds:', results.slice(0, 3).map(r => r.farmId));

        callback(null, results);
    });
};

const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.plantcare.query(sql, params, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
};


exports.checkOngoingCultivation = (userId) => {
    const sql = "SELECT id FROM ongoingcultivations WHERE userId = ?";
    return query(sql, [userId]);
};

exports.createOngoingCultivation = (userId) => {
    const sql = "INSERT INTO ongoingcultivations(userId) VALUES (?)";
    return query(sql, [userId]);
};

// Updated: Check crop count for specific farm
exports.checkCropCountByFarm = (cultivationId, farmId) => {
    const sql = "SELECT COUNT(id) as count FROM ongoingcultivationscrops WHERE ongoingCultivationId = ? AND farmId = ?";
    return query(sql, [cultivationId, farmId]);
};

// Updated: Check enrolled crops for specific farm
exports.checkEnrollCropByFarm = (cultivationId, farmId) => {
    const sql = "SELECT cropCalendar, id FROM ongoingcultivationscrops WHERE ongoingCultivationId = ? AND farmId = ?";
    return query(sql, [cultivationId, farmId]);
};

exports.enrollOngoingCultivationCrop = (cultivationId, cropId, extentha, extentac, extentp, startDate, cultivationIndex, farmId) => {
    const sql = "INSERT INTO ongoingcultivationscrops(ongoingCultivationId, cropCalendar, farmId, extentha, extentac, extentp, startedAt, cultivationIndex) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    return query(sql, [cultivationId, cropId, farmId, extentha, extentac, extentp, startDate, cultivationIndex]);
};

// Updated: Get enrolled crop with farmId
exports.getEnrollOngoingCultivationCrop = (cropId, userId, farmId) => {
    const sql = `
    SELECT ocs.id  
    FROM ongoingcultivationscrops ocs
    JOIN ongoingcultivations oc ON oc.id = ocs.ongoingCultivationId
    WHERE ocs.cropCalendar = ? AND oc.userId = ? AND ocs.farmId = ?
    ORDER BY ocs.id DESC
    LIMIT 1
  `;
    return new Promise((resolve, reject) => {
        db.plantcare.query(sql, [cropId, userId, farmId], (err, results) => {
            if (err) {
                console.error("Database error in ongoingcultivationscrops:", err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

exports.getEnrollOngoingCultivationCropByid = (id) => {
    console.log(id)
    const sql = `
    SELECT * 
    FROM ongoingcultivationscrops 
    WHERE id = ?
  `;
    return new Promise((resolve, reject) => {
        db.plantcare.query(sql, [id], (err, results) => {
            if (err) {
                console.error("Database error in ongoingcultivationscrops:", err);
                reject(err);
            } else {
                resolve(results);
                console.log(results)
            }
        });
    });
};

exports.updateOngoingCultivationCrop = (onCulscropID, extentha, extentac, extentp) => {
    return new Promise((resolve, reject) => {
        const sql = "UPDATE ongoingcultivationscrops SET extentha = ?, extentac=?, extentp=? WHERE id = ?";
        db.plantcare.query(sql, [extentha, extentac, extentp, onCulscropID], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

exports.getSlaveCropCalendarDays = (onCulscropID) => {
    return new Promise((resolve, reject) => {
        const sql = "SELECT id, days FROM slavecropcalendardays WHERE onCulscropID = ?";
        db.plantcare.query(sql, [onCulscropID], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

exports.updateSlaveCropCalendarDay = (id, formattedDate) => {
    return new Promise((resolve, reject) => {
        const sql = "UPDATE slavecropcalendardays SET startingDate = ? WHERE id = ?";
        db.plantcare.query(sql, [formattedDate, id], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

exports.enrollSlaveCrop = (userId, cropId, startDate, onCulscropID, farmId) => {
    console.log("enrollSlaveCrop", userId, cropId, startDate, onCulscropID, farmId);
    return new Promise((resolve, reject) => {
        const fetchSql = `
            SELECT * FROM cropcalendardays
            WHERE cropId = ?
            ORDER BY taskIndex ASC
        `;

        db.plantcare.query(fetchSql, [cropId], (err, rows) => {
            if (err) {
                console.error("Error fetching crop calendar days:", err);
                return reject(err);
            }

            const tasks = rows;
            const insertSql = `
                INSERT INTO slavecropcalendardays (
                    userId, cropCalendarId, taskIndex, startingDate, days,
                    taskTypeEnglish, taskTypeSinhala, taskTypeTamil,
                    taskCategoryEnglish, taskCategorySinhala, taskCategoryTamil,
                    taskEnglish, taskSinhala, taskTamil,
                    taskDescriptionEnglish, taskDescriptionSinhala, taskDescriptionTamil,
                    status, imageLink, videoLinkEnglish, videoLinkSinhala, videoLinkTamil,
                    reqImages, onCulscropID, autoCompleted
                ) VALUES ?
            `;

            const start = new Date(startDate);
            const values = [];
            let currentDate = new Date(start);

            tasks.forEach((task, index) => {
                if (index === 0) {
                    currentDate = new Date(start.getTime() + task.days * 86400000);
                } else {
                    currentDate = new Date(currentDate.getTime() + task.days * 86400000);
                }
                const formattedDate = currentDate.toISOString().split("T")[0];
                const today = new Date().toISOString().split("T")[0];
                const status = formattedDate < today ? "completed" : "pending";
                const autoCompleted = formattedDate < today ? "1" : "0";

                values.push([
                    userId,
                    task.cropId,
                    task.taskIndex,
                    formattedDate,
                    task.days,
                    task.taskTypeEnglish,
                    task.taskTypeSinhala,
                    task.taskTypeTamil,
                    task.taskCategoryEnglish,
                    task.taskCategorySinhala,
                    task.taskCategoryTamil,
                    task.taskEnglish,
                    task.taskSinhala,
                    task.taskTamil,
                    task.taskDescriptionEnglish,
                    task.taskDescriptionSinhala,
                    task.taskDescriptionTamil,
                    status,
                    task.imageLink,
                    task.videoLinkEnglish,
                    task.videoLinkSinhala,
                    task.videoLinkTamil,
                    task.reqImages,
                    onCulscropID,
                    autoCompleted
                ]);
            });

            if (values.length === 0) {
                return resolve({ insertId: null, affectedRows: 0 });
            }

            db.plantcare.query(insertSql, [values], (insertErr, result) => {
                if (insertErr) {
                    console.error("Error inserting slave crop calendar days:", insertErr);
                    reject(insertErr);
                } else {
                    console.log("Inserted tasks:", result);
                    resolve(result);
                }
            });
        });
    });
};




exports.phoneNumberChecker = (phoneNumber) => {
    return new Promise((resolve, reject) => {
        const formattedPhoneNumber = `+${String(phoneNumber).replace(/^\+/, "")}`;
        console.log("DAO - formatted phone number:", formattedPhoneNumber);

        // Check both users table and farmstaff table
        const checkQuery = `
            SELECT phoneNumber FROM users WHERE phoneNumber = ?
            UNION
            SELECT CONCAT(phoneCode, phoneNumber) as phoneNumber FROM farmstaff WHERE CONCAT(phoneCode, phoneNumber) = ?
        `;

        db.plantcare.query(checkQuery, [formattedPhoneNumber, formattedPhoneNumber], (err, results) => {
            if (err) {
                console.error("Database error:", err);
                reject(err);
            } else {
                console.log("DAO - query results:", results);
                resolve(results);
            }
        });
    });
};




exports.getCropCountByFarmId = (userId, farmId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT COUNT(*) as cropCount
            FROM plant_care.ongoingcultivationscrops occ
            INNER JOIN plant_care.ongoingcultivations oc ON occ.ongoingCultivationId = oc.id
            WHERE oc.userId = ? AND occ.farmId = ?
        `;
        db.plantcare.query(query, [userId, farmId], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results[0].cropCount);
            }
        });
    });
};




exports.updateFarm = async (farmData) => {
    let connection;

    try {
        // Get connection from pool
        connection = await new Promise((resolve, reject) => {
            db.plantcare.getConnection((err, conn) => {
                if (err) return reject(err);
                resolve(conn);
            });
        });

        // Start transaction
        await new Promise((resolve, reject) => {
            connection.beginTransaction(err => {
                if (err) return reject(err);
                resolve(true);
            });
        });

        // Update farm - Change 'farmId' to your actual primary key column name
        // Common alternatives: 'id', 'farm_id', 'FarmId'
        const updateFarmSql = `
            UPDATE farms 
            SET 
                farmName = ?, 
                farmIndex = ?, 
                extentha = ?, 
                extentac = ?, 
                extentp = ?, 
                district = ?, 
                plotNo = ?, 
                street = ?, 
                city = ?, 
                staffCount = ?, 
                imageId = ?
            WHERE id = ? AND userId = ?
        `;
        // ↑ Changed 'farmId' to 'id' - replace with your actual column name

        const farmValues = [
            farmData.farmName,
            farmData.farmIndex,
            farmData.extentha,
            farmData.extentac,
            farmData.extentp,
            farmData.district,
            farmData.plotNo,
            farmData.street,
            farmData.city,
            farmData.staffCount,
            farmData.farmImage,
            farmData.farmId, // This should match whatever you're passing from the endpoint
            farmData.userId
        ];

        const [updateResult] = await connection.promise().query(updateFarmSql, farmValues);

        // Check if any rows were affected
        if (updateResult.affectedRows === 0) {
            throw new Error('No farm was updated. Please check if the farm exists and you have permission to update it.');
        }

        // Commit transaction
        await new Promise((resolve, reject) => {
            connection.commit(err => {
                if (err) return reject(err);
                resolve(true);
            });
        });

        return {
            success: true,
            farmId: farmData.farmId,
            affectedRows: updateResult.affectedRows,
            message: 'Farm updated successfully'
        };

    } catch (error) {
        // Rollback transaction if connection exists
        if (connection) {
            await new Promise(resolve => {
                connection.rollback(() => resolve(true));
            });
        }
        console.error('Database error:', error);
        throw error;

    } finally {
        // Release connection back to pool
        if (connection) {
            connection.release();
        }
    }
};

/////////////

// exports.CreateStaffMember = async (farmData) => {
//     let connection;
//     try {
//         // Get connection from pool
//         connection = await new Promise((resolve, reject) => {
//             db.plantcare.getConnection((err, conn) => {
//                 if (err) return reject(err);
//                 resolve(conn);
//             });
//         });

//         // Start transaction
//         await new Promise((resolve, reject) => {
//             connection.beginTransaction(err => {
//                 if (err) return reject(err);
//                 resolve(true);
//             });
//         });

//         // Check if farm exists and user has permission
//         const checkFarmSql = `SELECT id FROM farms WHERE id = ? AND userId = ?`;
//         const [farmCheck] = await connection.promise().query(checkFarmSql, [farmData.farmId, farmData.userId]);

//         if (farmCheck.length === 0) {
//             throw new Error('Farm not found or user does not have permission');
//         }

//         // Check if staff member already exists (optional - based on your business logic)
//         const checkStaffSql = `
//             SELECT id FROM farmstaff 
//             WHERE farmId = ? AND phoneNumber = ? AND phoneCode = ?
//         `;
//         const [existingStaff] = await connection.promise().query(checkStaffSql, [
//             farmData.farmId,
//             farmData.phoneNumber,
//             farmData.countryCode
//         ]);

//         if (existingStaff.length > 0) {
//             throw new Error('Staff member with this phone number already exists in this farm');
//         }

//         // Insert staff member
//         const insertStaffSql = `
//             INSERT INTO farmstaff 
//             (ownerId, farmId, firstName, lastName, phoneCode, phoneNumber, role)
//             VALUES (?, ?, ?, ?, ?, ?, ?)
//         `;

//         const staffValues = [
//             farmData.userId,
//             farmData.farmId,
//             farmData.firstName,
//             farmData.lastName,
//             farmData.countryCode, // Note: using countryCode for phoneCode
//             farmData.phoneNumber,
//             farmData.role
//         ];

//         const [insertResult] = await connection.promise().query(insertStaffSql, staffValues);
//         const staffId = insertResult.insertId;

//         // Get the created staff member data
//         const getStaffSql = `
//             SELECT id, ownerId, farmId, firstName, lastName, phoneCode, phoneNumber, role, createdAt
//             FROM farmstaff 
//             WHERE id = ?
//         `;
//         const [staffData] = await connection.promise().query(getStaffSql, [staffId]);

//         // Commit transaction
//         await new Promise((resolve, reject) => {
//             connection.commit(err => {
//                 if (err) return reject(err);
//                 resolve(true);
//             });
//         });

//         return {
//             success: true,
//             staffId: staffId,
//             data: staffData[0],
//             message: 'Staff member created successfully'
//         };

//     } catch (error) {
//         // Rollback transaction if connection exists
//         if (connection) {
//             await new Promise(resolve => {
//                 connection.rollback(() => resolve(true));
//             });
//         }
//         console.error('Database error:', error);
//         throw error;
//     } finally {
//         // Release connection back to pool
//         if (connection) {
//             connection.release();
//         }
//     }
// };


exports.CreateStaffMember = async (farmData) => {
    let connection;
    try {
        // Get connection from pool
        connection = await new Promise((resolve, reject) => {
            db.plantcare.getConnection((err, conn) => {
                if (err) return reject(err);
                resolve(conn);
            });
        });

        // Start transaction
        await new Promise((resolve, reject) => {
            connection.beginTransaction(err => {
                if (err) return reject(err);
                resolve(true);
            });
        });

        // Check if farm exists and user has permission
        const checkFarmSql = `SELECT id, appUserCount FROM farms WHERE id = ? AND userId = ?`;
        const [farmCheck] = await connection.promise().query(checkFarmSql, [farmData.farmId, farmData.userId]);

        if (farmCheck.length === 0) {
            throw new Error('Farm not found or user does not have permission');
        }

        // Check if staff member already exists (optional - based on your business logic)
        const checkStaffSql = `
            SELECT id FROM farmstaff 
            WHERE farmId = ? AND phoneNumber = ? AND phoneCode = ?
        `;
        const [existingStaff] = await connection.promise().query(checkStaffSql, [
            farmData.farmId,
            farmData.phoneNumber,
            farmData.countryCode
        ]);

        if (existingStaff.length > 0) {
            throw new Error('Staff member with this phone number already exists in this farm');
        }

        // Insert staff member
        const insertStaffSql = `
            INSERT INTO farmstaff 
            (ownerId, farmId, firstName, lastName, phoneCode, phoneNumber, role)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const staffValues = [
            farmData.userId,
            farmData.farmId,
            farmData.firstName,
            farmData.lastName,
            farmData.countryCode, // Note: using countryCode for phoneCode
            farmData.phoneNumber,
            farmData.role
        ];

        const [insertResult] = await connection.promise().query(insertStaffSql, staffValues);
        const staffId = insertResult.insertId;

        // Update appUserCount in farms table (+1)
        const updateFarmSql = `
            UPDATE farms 
            SET appUserCount = appUserCount + 1 
            WHERE id = ?
        `;
        await connection.promise().query(updateFarmSql, [farmData.farmId]);

        // Get the created staff member data
        const getStaffSql = `
            SELECT id, ownerId, farmId, firstName, lastName, phoneCode, phoneNumber, role, createdAt
            FROM farmstaff 
            WHERE id = ?
        `;
        const [staffData] = await connection.promise().query(getStaffSql, [staffId]);

        // Commit transaction
        await new Promise((resolve, reject) => {
            connection.commit(err => {
                if (err) return reject(err);
                resolve(true);
            });
        });

        return {
            success: true,
            staffId: staffId,
            data: staffData[0],
            message: 'Staff member created successfully'
        };

    } catch (error) {
        // Rollback transaction if connection exists
        if (connection) {
            await new Promise(resolve => {
                connection.rollback(() => resolve(true));
            });
        }
        console.error('Database error:', error);
        throw error;
    } finally {
        // Release connection back to pool
        if (connection) {
            connection.release();
        }
    }
};

exports.getStaffMember = async (staffMemberId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, ownerId, farmId, firstName, lastName, phoneCode, phoneNumber, role, image, createdAt
            FROM farmstaff
            WHERE id = ?
            ORDER BY createdAt DESC
        `;

        db.plantcare.query(query, [staffMemberId], (error, results) => {
            if (error) {
                console.error("Error fetching staff member:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};



exports.updateStaffMember = async (staffMemberId, staffData) => {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE farmstaff 
            SET firstName = ?, lastName = ?, phoneNumber = ?, phoneCode = ?, role = ?
            WHERE id = ?
        `;

        db.plantcare.query(query, [
            staffData.firstName,
            staffData.lastName,
            staffData.phoneNumber,
            staffData.phoneCode,
            staffData.role,
            staffMemberId
        ], (error, results) => {
            if (error) {
                console.error("Error updating staff member:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

//////////////renew

// exports.getrenew = async (userId) => {
//     return new Promise((resolve, reject) => {
//         const query = `
//             SELECT id, userId, expireDate, activeStatus, plan, payment
//             FROM membershippayment
//             WHERE userId = ? AND activeStatus = 1
//             ORDER BY expireDate DESC
//             LIMIT 1
//         `;

//         db.plantcare.query(query, [userId], (error, results) => {
//             if (error) {
//                 console.error("Error fetching user membership:", error);
//                 reject(error);
//             } else {
//                 resolve(results.length > 0 ? results[0] : null);
//             }
//         });
//     });
// };

// exports.getrenew = async (userId) => {
//     return new Promise((resolve, reject) => {
//         const query = `
//             SELECT id, userId, farmName, isBlock, district, city, 
//                    staffCount, appUserCount, imageId
//             FROM farms
//             WHERE userId = ?
//             ORDER BY id DESC
//             LIMIT 1
//         `;
//         db.plantcare.query(query, [userId], (error, results) => {
//             if (error) {
//                 console.error("Error fetching user farm:", error);
//                 reject(error);
//             } else {
//                 resolve(results.length > 0 ? results[0] : null);
//             }
//         });
//     });
// };
exports.getrenew = async (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                f.id, 
                f.userId, 
                f.farmName, 
                f.isBlock, 
                f.district, 
                f.city, 
                f.staffCount, 
                f.appUserCount, 
                f.imageId,
                mp.id AS membershipId,
                mp.createdAt,
                mp.expireDate,
                mp.activeStatus,
                DATEDIFF(mp.expireDate, NOW()) AS daysRemaining
            FROM farms f
            JOIN membershippayment mp ON f.userId = mp.userId
            WHERE f.userId = ?
            ORDER BY mp.id DESC
            LIMIT 1
        `;
        db.plantcare.query(query, [userId], (error, results) => {
            if (error) {
                console.error("Error fetching user farm:", error);
                reject(error);
            } else {
                resolve(results.length > 0 ? results[0] : null);
            }
        });
    });
};



// exports.deleteFarm = (farmId) => {
//     return new Promise((resolve, reject) => {
//         // First check if farm exists
//         const checkSql = "SELECT id FROM farms WHERE id = ?";
//         db.plantcare.query(checkSql, [farmId], (err, checkResult) => {
//             if (err) {
//                 reject(err);
//                 return;
//             }

//             if (checkResult.length === 0) {
//                 resolve(false); // Farm doesn't exist
//                 return;
//             }

//             // Farm exists, proceed with deletion
//             const deleteSql = "DELETE FROM farms WHERE id = ?";
//             db.plantcare.query(deleteSql, [farmId], (err, result) => {
//                 if (err) {
//                     reject(err);
//                 } else {
//                     resolve(result.affectedRows > 0);
//                 }
//             });
//         });
//     });
// };

// exports.deleteFarm = (farmId) => {
//     return new Promise((resolve, reject) => {
//         // First check if farm exists and get its details
//         const checkSql = "SELECT id, userId, farmIndex FROM farms WHERE id = ?";
//         db.plantcare.query(checkSql, [farmId], (err, checkResult) => {
//             if (err) {
//                 reject(err);
//                 return;
//             }

//             if (checkResult.length === 0) {
//                 resolve(false); // Farm doesn't exist
//                 return;
//             }

//             const farmToDelete = checkResult[0];
//             const { userId, farmIndex } = farmToDelete;

//             // Delete the farm first
//             const deleteSql = "DELETE FROM farms WHERE id = ?";
//             db.plantcare.query(deleteSql, [farmId], (err, deleteResult) => {
//                 if (err) {
//                     reject(err);
//                     return;
//                 }

//                 if (deleteResult.affectedRows === 0) {
//                     resolve(false);
//                     return;
//                 }

//                 // Now update farmIndex for remaining farms of the same user
//                 // Decrease farmIndex by 1 for all farms with farmIndex greater than deleted farm's index
//                 const updateIndexSql = `
//                     UPDATE farms 
//                     SET farmIndex = farmIndex - 1 
//                     WHERE userId = ? AND farmIndex > ?
//                 `;

//                 db.plantcare.query(updateIndexSql, [userId, farmIndex], (err, updateResult) => {
//                     if (err) {
//                         console.error("Error updating farm indexes:", err);
//                         // Even if index update fails, the farm was deleted successfully
//                         // We'll still return true but log the error
//                         resolve(true);
//                         return;
//                     }

//                     console.log(`Farm deleted successfully. ${updateResult.affectedRows} farm indexes were reordered.`);
//                     resolve(true);
//                 });
//             });
//         });
//     });
// };

exports.deleteFarm = (farmId) => {
    return new Promise((resolve, reject) => {
        // First check if farm exists and get its details
        const checkSql = "SELECT id, userId, farmIndex FROM farms WHERE id = ?";
        db.plantcare.query(checkSql, [farmId], (err, checkResult) => {
            if (err) {
                reject(err);
                return;
            }
            if (checkResult.length === 0) {
                resolve(false); // Farm doesn't exist
                return;
            }
            const farmToDelete = checkResult[0];
            const { userId, farmIndex } = farmToDelete;

            // Delete related currentasset records first
            const deleteCurrentAssetsSql = "DELETE FROM currentasset WHERE farmId = ?";
            db.plantcare.query(deleteCurrentAssetsSql, [farmId], (err, currentAssetDeleteResult) => {
                if (err) {
                    console.error("Error deleting currentasset records:", err);
                    reject(err);
                    return;
                }

                console.log(`Deleted ${currentAssetDeleteResult.affectedRows} currentasset records for farm ${farmId}`);

                // Delete related fixedasset records
                const deleteFixedAssetsSql = "DELETE FROM fixedasset WHERE farmId = ?";
                db.plantcare.query(deleteFixedAssetsSql, [farmId], (err, fixedAssetDeleteResult) => {
                    if (err) {
                        console.error("Error deleting fixedasset records:", err);
                        reject(err);
                        return;
                    }

                    console.log(`Deleted ${fixedAssetDeleteResult.affectedRows} fixedasset records for farm ${farmId}`);

                    // Delete the farm
                    const deleteSql = "DELETE FROM farms WHERE id = ?";
                    db.plantcare.query(deleteSql, [farmId], (err, deleteResult) => {
                        if (err) {
                            console.error("Error deleting farm:", err);
                            reject(err);
                            return;
                        }
                        if (deleteResult.affectedRows === 0) {
                            resolve(false);
                            return;
                        }

                        // Now update farmIndex for remaining farms of the same user
                        // Decrease farmIndex by 1 for all farms with farmIndex greater than deleted farm's index
                        const updateIndexSql = `
                            UPDATE farms 
                            SET farmIndex = farmIndex - 1 
                            WHERE userId = ? AND farmIndex > ?
                        `;
                        db.plantcare.query(updateIndexSql, [userId, farmIndex], (err, updateResult) => {
                            if (err) {
                                console.error("Error updating farm indexes:", err);
                                // Even if index update fails, the farm was deleted successfully
                                // We'll still return true but log the error
                                resolve(true);
                                return;
                            }

                            console.log(`Farm deleted successfully. ${updateResult.affectedRows} farm indexes were reordered.`);
                            console.log(`${currentAssetDeleteResult.affectedRows} currentasset records were deleted.`);
                            console.log(`${fixedAssetDeleteResult.affectedRows} fixedasset records were deleted.`);
                            resolve(true);
                        });
                    });
                });
            });
        });
    });
};

exports.getSelectFarm = async (ownerId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, userId, farmName
            FROM farms
            WHERE userId = ?
            ORDER BY farmName ASC
        `;

        db.plantcare.query(query, [ownerId], (error, results) => {
            if (error) {
                console.error("Error fetching farms:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};



////currect asset

exports.createNewAsset = async (assetData) => {
    return new Promise((resolve, reject) => {
        // Determine if we should include staffId in the query
        const includeStaffId = assetData.staffId && assetData.staffId !== assetData.userId;

        // Build dynamic query based on whether to include staffId
        let query, values;

        if (includeStaffId) {
            query = `
                INSERT INTO currentasset (
                    userId, staffId, farmId, category, asset, brand, batchNum, 
                    unitVolume, unit, numOfUnit, unitPrice, total, 
                    purchaseDate, expireDate, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            values = [
                assetData.userId,
                assetData.staffId,
                assetData.farmId,
                assetData.category,
                assetData.asset,
                assetData.brand,
                assetData.batchNum,
                assetData.unitVolume,
                assetData.unit,
                assetData.numOfUnit,
                assetData.unitPrice,
                assetData.total,
                assetData.purchaseDate,
                assetData.expireDate,
                assetData.status
            ];
        } else {
            query = `
                INSERT INTO currentasset (
                    userId, farmId, category, asset, brand, batchNum, 
                    unitVolume, unit, numOfUnit, unitPrice, total, 
                    purchaseDate, expireDate, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            values = [
                assetData.userId,
                assetData.farmId,
                assetData.category,
                assetData.asset,
                assetData.brand,
                assetData.batchNum,
                assetData.unitVolume,
                assetData.unit,
                assetData.numOfUnit,
                assetData.unitPrice,
                assetData.total,
                assetData.purchaseDate,
                assetData.expireDate,
                assetData.status
            ];
        }

        console.log('Executing query:', query);
        console.log('With values:', values);

        db.plantcare.query(query, values, (error, results) => {
            if (error) {
                console.error("Error creating new asset:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};
exports.addAssetRecord = async (recordData) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO currentassetrecord (currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice)
            VALUES (?, ?, ?, ?)
        `;

        const values = [
            recordData.currentAssetId,
            recordData.numOfPlusUnit,
            recordData.numOfMinUnit,
            recordData.totalPrice
        ];

        db.plantcare.query(query, values, (error, results) => {
            if (error) {
                console.error("Error adding asset record:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};




exports.getAssetsByCategory = (userId, category, farmId) => {
    return new Promise((resolve, reject) => {
        let query;
        let values;

        if (Array.isArray(category)) {
            const placeholders = category.map(() => "?").join(",");
            query = `SELECT * FROM currentasset WHERE userId = ? AND farmId = ? AND category IN (${placeholders})`;
            values = [userId, farmId, ...category];
        } else {
            query = "SELECT * FROM currentasset WHERE userId = ? AND farmId = ? AND category = ?";
            values = [userId, farmId, category];
        }

        db.plantcare.query(query, values, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
};



exports.getAllCurrentAssets = (userId, farmId) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT category, SUM(total) AS totalSum 
            FROM currentasset 
            WHERE userId = ? AND farmId = ?
            GROUP BY category
            HAVING totalSum > 0
        `;
        db.plantcare.query(sql, [userId, farmId], (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
};


exports.getFixedAssetsByCategory = (userId, category, farmId) => {
    return new Promise((resolve, reject) => {
        let sqlQuery = '';
        let queryParams = [userId, farmId]; // Add farmId to parameters

        if (category === 'Land') {
            sqlQuery = `SELECT fa.id, fa.category, lfa.district FROM fixedasset fa
                JOIN landfixedasset lfa ON fa.id = lfa.fixedAssetId
                WHERE fa.userId = ? AND fa.farmId = ? AND fa.category = 'Land'`;
        } else if (category === 'Building and Infrastructures') {
            sqlQuery = `SELECT fa.id, fa.category, bfa.type , bfa.district FROM fixedasset fa
                JOIN buildingfixedasset bfa ON fa.id = bfa.fixedAssetId
                WHERE fa.userId = ? AND fa.farmId = ? AND fa.category = 'Building and Infrastructures'`;
        } else if (category === 'Machine and Vehicles') {
            sqlQuery = `SELECT fa.id, fa.category, mtfa.asset, mtfa.assetType FROM fixedasset fa
                JOIN machtoolsfixedasset mtfa ON fa.id = mtfa.fixedAssetId
                WHERE fa.userId = ? AND fa.farmId = ? AND fa.category = 'Machine and Vehicles'`;
        } else if (category === 'Tools') {
            sqlQuery = `SELECT fa.id, fa.category, mtfa.asset, mtfa.assetType FROM fixedasset fa
                JOIN machtoolsfixedasset mtfa ON fa.id = mtfa.fixedAssetId
                WHERE fa.userId = ? AND fa.farmId = ? AND fa.category = 'Tools'`;
        } else {
            return reject(new Error('Invalid category provided.'));
        }

        db.plantcare.query(sqlQuery, queryParams, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
};


exports.getFarmName = async (userId, farmId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                id, 
                farmName,
                district,
                city,
                plotNo,
                street
            FROM farms 
            WHERE userId = ? AND id = ? AND isBlock = 0
        `;

        db.plantcare.query(query, [userId, farmId], (error, results) => {
            if (error) {
                console.error("Error fetching farm:", error);
                reject(error);
            } else {
                console.log("Query results:", results);
                resolve(results);
            }
        });
    });
};