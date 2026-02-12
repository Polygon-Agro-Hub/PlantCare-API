const db = require("../startup/database");


exports.createComplain = (farmerId, language, complain, category, status, referenceNumber) => {
    return new Promise((resolve, reject) => {
        const checkCategorySql = "SELECT id FROM agro_world_admin.complaincategory WHERE id = ?";

        db.collectionofficer.query(checkCategorySql, [category], (err, rows) => {
            if (err) {
                return reject(new Error("Database error while checking complain category: " + err.message));
            }

            if (rows.length === 0) {
                return reject(new Error("Invalid complain category: The category does not exist"));
            }


            const insertSql = `
                INSERT INTO farmercomplains 
                (farmerId, language, complain, complainCategory, status, refNo, adminStatus) 
                VALUES (?, ?, ?, ?, ?, ?, 'Assigned')
            `;

            db.collectionofficer.query(insertSql,
                [farmerId, language, complain, category, status, referenceNumber],
                (err, result) => {
                    if (err) {
                        return reject(new Error("Database error while inserting complain: " + err.message));
                    }
                    resolve(result.insertId);
                }
            );
        });
    });
};


exports.countComplaintsByDate = async (date) => {
    const formattedDate = date.toISOString().split('T')[0]; // Convert date to YYYY-MM-DD


    return new Promise((resolve, reject) => {
        const query = `SELECT COUNT(*) AS count FROM farmercomplains WHERE DATE(createdAt) = ?`;
        db.collectionofficer.query(query, [formattedDate], (error, results) => {
            if (error) {
                console.error("Error fetching complaints:", error);
                reject(error);
            } else {
                resolve(results[0].count);
            }
        });
    });
};


exports.getAllComplaintsByUserId = async (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT id, language, complain, status, createdAt, complainCategory , reply, refNo , replyTime
        FROM farmercomplains 
        WHERE farmerId = ?
        ORDER BY createdAt DESC
      `;
        db.collectionofficer.query(query, [userId], (error, results) => {
            if (error) {
                console.error("Error fetching complaints:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

exports.getComplainCategories = async () => {
    return new Promise((resolve, reject) => {
        const query = `
                            SELECT cc.id, cc.roleId, cc.appId, cc.categoryEnglish, cc.categorySinhala, cc.categoryTamil, ssa.appName
                FROM complaincategory cc
                JOIN systemapplications ssa ON cc.appId = ssa.id
                WHERE ssa.appName = 'PlantCare'
      `;
        db.admin.query(query, (error, results) => {
            if (error) {
                console.error("Error fetching complaints:", error);
                reject(error);
            } else {
                resolve(results);
                
            }
        });
    });
};
