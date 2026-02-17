const db = require("../startup/database");

exports.getFarmByIdWithStaff = async (farmId, userId) => {
    return new Promise((resolve, reject) => {
        // First, get staffCount and appUserCount from farms table
        const farmQuery = `
            SELECT staffCount, appUserCount
            FROM farms
            WHERE id = ?
        `;

        db.plantcare.query(farmQuery, [farmId], (farmError, farmResults) => {
            if (farmError) {
                console.error("Error fetching farm counts:", farmError);
                reject(farmError);
                return;
            }

            const farmCounts = farmResults && farmResults.length > 0
                ? farmResults[0]
                : { staffCount: 0, appUserCount: 0 };

            // Then get staff details
            const staffQuery = `
                SELECT id, ownerId, farmId, firstName, lastName, phoneCode, 
                       phoneNumber, role, image, createdAt
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

                // Combine farm counts and staff data
                const result = {
                    staff: staffResults || [],
                    staffCount: farmCounts.staffCount,
                    appUserCount: farmCounts.appUserCount
                };

                resolve(result);
            });
        });
    });
};


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
            (ownerId, farmId, firstName, lastName, phoneCode, phoneNumber, role, nic)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const staffValues = [
            farmData.userId,
            farmData.farmId,
            farmData.firstName,
            farmData.lastName,
            farmData.countryCode, // Note: using countryCode for phoneCode
            farmData.phoneNumber,
            farmData.role,
            farmData.nic
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

