const db = require("../startup/database");

exports.getFarmByIdWithStaff = async (farmId, userId) => {
    return new Promise((resolve, reject) => {
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

            const farmCounts =
                farmResults && farmResults.length > 0
                    ? farmResults[0]
                    : { staffCount: 0, appUserCount: 0 };

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

                const result = {
                    staff: staffResults || [],
                    staffCount: farmCounts.staffCount,
                    appUserCount: farmCounts.appUserCount,
                };

                resolve(result);
            });
        });
    });
};

exports.CreateStaffMember = async (farmData) => {
    let connection;
    try {
        connection = await new Promise((resolve, reject) => {
            db.plantcare.getConnection((err, conn) => {
                if (err) return reject(err);
                resolve(conn);
            });
        });

        await new Promise((resolve, reject) => {
            connection.beginTransaction((err) => {
                if (err) return reject(err);
                resolve(true);
            });
        });

        const checkFarmSql = `SELECT id, appUserCount FROM farms WHERE id = ? AND userId = ?`;
        const [farmCheck] = await connection
            .promise()
            .query(checkFarmSql, [farmData.farmId, farmData.userId]);

        if (farmCheck.length === 0) {
            throw new Error("Farm not found or user does not have permission");
        }

        const checkStaffSql = `
            SELECT id FROM farmstaff 
            WHERE farmId = ? AND phoneNumber = ? AND phoneCode = ?
        `;
        const [existingStaff] = await connection
            .promise()
            .query(checkStaffSql, [
                farmData.farmId,
                farmData.phoneNumber,
                farmData.countryCode,
            ]);

        if (existingStaff.length > 0) {
            throw new Error(
                "Staff member with this phone number already exists in this farm",
            );
        }

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
            farmData.countryCode,
            farmData.phoneNumber,
            farmData.role,
            farmData.nic,
        ];

        const [insertResult] = await connection
            .promise()
            .query(insertStaffSql, staffValues);
        const staffId = insertResult.insertId;

        const updateFarmSql = `
            UPDATE farms 
            SET appUserCount = appUserCount + 1 
            WHERE id = ?
        `;
        await connection.promise().query(updateFarmSql, [farmData.farmId]);

        const getStaffSql = `
            SELECT id, ownerId, farmId, firstName, lastName, phoneCode, phoneNumber, role, createdAt
            FROM farmstaff 
            WHERE id = ?
        `;
        const [staffData] = await connection
            .promise()
            .query(getStaffSql, [staffId]);

        await new Promise((resolve, reject) => {
            connection.commit((err) => {
                if (err) return reject(err);
                resolve(true);
            });
        });

        return {
            success: true,
            staffId: staffId,
            data: staffData[0],
            message: "Staff member created successfully",
        };
    } catch (error) {
        if (connection) {
            await new Promise((resolve) => {
                connection.rollback(() => resolve(true));
            });
        }
        console.error("Database error:", error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};
