const jwt = require("jsonwebtoken");
const db = require("../startup/database");
const asyncHandler = require("express-async-handler");

exports.getCropByCategory = (categorie) => {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM cropgroup WHERE category=?";
        db.plantcare.query(sql, [categorie], (err, results) => {
            if (err) {
                console.error("Error executing query:", err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

exports.getCropByDistrict = (categorie, district) => {
    return new Promise((resolve, reject) => {
        const districtCleaned = district.trim();

        const sql = `
            SELECT DISTINCT cg.*
            FROM cropgroup cg
            INNER JOIN cropvariety cv ON cg.id = cv.cropGroupId
            INNER JOIN cropcalender cc ON cv.id = cc.cropVarietyId
            WHERE cg.category = ? AND cc.suitableAreas LIKE ?
        `;

        db.plantcare.query(sql, [categorie, `%${districtCleaned}%`], (err, results) => {
            if (err) {
                console.error("Error executing query:", err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};


exports.getCropByDistrict = (categorie, district) => {
    return new Promise((resolve, reject) => {
        const districtCleaned = district.trim();

        const sql = `
            SELECT DISTINCT cg.*
            FROM cropgroup cg
            INNER JOIN cropvariety cv ON cg.id = cv.cropGroupId
            INNER JOIN cropcalender cc ON cv.id = cc.cropVarietyId
            WHERE cg.category = ? AND cc.suitableAreas LIKE ?
        `;

        db.plantcare.query(sql, [categorie, `%${districtCleaned}%`], (err, results) => {
            if (err) {
                console.error("Error executing query:", err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

exports.getCropVariety = (cropId) => {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM cropvariety WHERE cropGroupId = ?";
        db.plantcare.query(sql, [cropId], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

exports.getCropCalenderDetails = (id, method, naofcul) => {
    return new Promise((resolve, reject) => {

        const sql = `SELECT * FROM cropcalender WHERE cropVarietyId = ? AND method = ? AND natOfCul = ?`;

        db.plantcare.query(sql, [id, method, naofcul], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};


exports.getCropCalendarFeed = (userId, cropId) => {
    return new Promise((resolve, reject) => {
        const sql = `
        SELECT * 
        FROM ongoingcultivations oc, ongoingcultivationscrops ocr, cropcalendardays cd 
        WHERE oc.id = ocr.ongoingCultivationId 
        AND ocr.cropCalendar = cd.cropId 
        AND oc.userId = ? 
        AND cd.cropId = ?`;

        db.plantcare.query(sql, [userId, cropId], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};




exports.getOngoingCultivationsByUserId = (ownerId, farmId, callback) => {
    const sql = `
    SELECT * 
    FROM ongoingcultivations c 
    JOIN ongoingcultivationscrops oc ON c.id = oc.ongoingCultivationId
    JOIN cropcalender cc ON oc.cropCalendar = cc.id
    JOIN cropvariety cr ON cc.cropVarietyId = cr.id 
    WHERE c.userId = ? AND oc.farmId = ?
    ORDER BY oc.cultivationIndex
  `;
    db.plantcare.query(sql, [ownerId, farmId], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return callback(err, null);
        }
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

exports.checkCropCount = (cultivationId) => {
    const sql = "SELECT COUNT(id) as count FROM ongoingcultivationscrops WHERE ongoingCultivationId = ?";
    return query(sql, [cultivationId]);
};

exports.checkEnrollCrop = (cultivationId) => {
    const sql = "SELECT cropCalendar, id FROM ongoingcultivationscrops WHERE ongoingCultivationId = ?";
    return query(sql, [cultivationId]);
};

exports.enrollOngoingCultivationCrop = (cultivationId, cropId, extentha, extentac, extentp, startDate, cultivationIndex) => {
    const sql = "INSERT INTO ongoingcultivationscrops(ongoingCultivationId, cropCalendar,  extentha, extentac, extentp , startedAt, cultivationIndex) VALUES (?, ?,?,?,?,?,?)";
    return query(sql, [cultivationId, cropId, extentha, extentac, extentp, startDate, cultivationIndex]);
};



exports.getEnrollOngoingCultivationCrop = (cropId, UserId) => {
    const sql = `
    SELECT ocs.id  
    FROM ongoingcultivationscrops ocs
    JOIN ongoingcultivations oc ON oc.id = ocs.ongoingCultivationId
    WHERE ocs.cropCalendar = ? AND oc.userId = ?
  `;
    return new Promise((resolve, reject) => {
        db.plantcare.query(sql, [cropId, UserId], (err, results) => {
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





exports.enrollSlaveCrop = (userId, cropId, startDate, onCulscropID) => {
    console.log("enrollSlaveCrop", userId, cropId, startDate, onCulscropID);
    return new Promise((resolve, reject) => {
        const fetchSql = `
      SELECT * FROM cropcalendardays
      WHERE cropId = ?
      ORDER BY taskIndex ASC
    `;

        db.plantcare.query(fetchSql, [cropId], (err, rows) => {
            if (err) return reject(err);

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

            db.plantcare.query(insertSql, [values], (insertErr, result) => {
                if (insertErr) {
                    reject(insertErr);
                } else {
                    console.log("Inserted tasks:", result);
                    resolve(result);
                }
            });
        });
    });
};



exports.getSlaveCropCalendarDaysByUserAndCrop = (userId, cropCalendarId, farmId) => {
    return new Promise((resolve, reject) => {

        const getOnCulscropIdSql = `
            SELECT id as onCulscropID 
            FROM ongoingcultivationscrops 
            WHERE cropCalendar = ? AND farmId = ?
            LIMIT 1
        `;

        db.plantcare.query(getOnCulscropIdSql, [cropCalendarId, farmId], (err, onCulscropResults) => {
            if (err) {
                reject(err);
                return;
            }

            if (onCulscropResults.length === 0) {
                resolve([]);
                return;
            }

            const onCulscropID = onCulscropResults[0].onCulscropID;


            const getSlaveCropDaysSql = `
                SELECT * 
                FROM slavecropcalendardays 
                WHERE userId = ? AND onCulscropID = ?
                ORDER BY taskIndex ASC
            `;

            db.plantcare.query(getSlaveCropDaysSql, [userId, onCulscropID], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    });
};



exports.getSlaveCropCalendarPrgress = (userId, cropCalendarId, farmId) => {
    return new Promise((resolve, reject) => {
        const sql = `
        SELECT sc.status, ocs.farmId
        FROM slavecropcalendardays sc
        LEFT JOIN ongoingcultivationscrops ocs ON ocs.id = sc.onCulscropID
        WHERE sc.userId = ? 
        AND sc.cropCalendarId = ?
        AND ocs.cropCalendar = ?
        AND ocs.farmId = ?
        `;
        db.plantcare.query(sql, [userId, cropCalendarId, cropCalendarId, farmId], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

exports.getTaskById = (id) => {
    return new Promise((resolve, reject) => {
        const sql = "SELECT taskIndex, status, createdAt, cropCalendarId, days, startingDate, userId FROM slavecropcalendardays WHERE id = ?";
        db.plantcare.query(sql, [id], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

exports.getPreviousTasks = (taskIndex, cropCalendarId, userId) => {
    return new Promise((resolve, reject) => {
        const sql = `
          SELECT id, taskIndex, createdAt, status , days, startingDate
          FROM slavecropcalendardays 
          WHERE taskIndex < ? AND cropCalendarId = ? AND userId = ? 
          ORDER BY taskIndex ASC`;
        db.plantcare.query(sql, [taskIndex, cropCalendarId, userId], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

// exports.updateTaskStatus = (id, status) => {
//     return new Promise((resolve, reject) => {
//         const sql = "UPDATE slavecropcalendardays SET status = ?, createdAt = CURRENT_TIMESTAMP WHERE id = ?";
//         db.plantcare.query(sql, [status, id], (err, results) => {
//             if (err) {
//                 reject(err);
//             } else {
//                 resolve(results);
//             }
//         });
//     });
// };

exports.updateTaskStatus = (id, status, requestUserId, requestUserOwnerId) => {
    return new Promise((resolve, reject) => {
        let sql, params;

        if (requestUserId === requestUserOwnerId) {
            // Owner is updating - don't change userId or completedStaffId, just update status and timestamp
            sql = "UPDATE slavecropcalendardays SET status = ?, createdAt = CURRENT_TIMESTAMP WHERE id = ?";
            params = [status, id];
        } else {
            // Staff member is updating - keep original userId but set completedStaffId to track who completed it
            sql = "UPDATE slavecropcalendardays SET status = ?, completedStaffId = ?, createdAt = CURRENT_TIMESTAMP WHERE id = ?";
            params = [status, requestUserId, id];
        }

        db.plantcare.query(sql, params, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

exports.gettaskImagesByID = (slaveId) => {
    const query = "SELECT image FROM taskimages WHERE slaveId = ?";
    return new Promise((resolve, reject) => {
        db.plantcare.execute(query, [slaveId], (err, result) => {
            if (err) {
                console.error("Error executing query:", err);
                return reject(err);
            }
            resolve(result);
        });
    });
}

exports.deleteImagesBySlaveId = (slaveId) => {
    const query = "DELETE FROM taskimages WHERE slaveId = ?";
    return new Promise((resolve, reject) => {
        db.plantcare.execute(query, [slaveId], (err, result) => {
            if (err) {
                console.error("Error executing query:", err);
                return reject(err);
            }
            resolve(result);
        });
    });
};




exports.addGeoLocation = (longitude, latitude, onCulscropID) => {
    const sql = "UPDATE ongoingcultivationscrops SET longitude = ?, latitude = ? WHERE id = ?";
    return new Promise((resolve, reject) => {
        db.plantcare.query(sql, [longitude, latitude, onCulscropID], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}


exports.checkTaskExists = (taskId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT COUNT(*) AS count
            FROM slavecropcalendardays
            WHERE id = ?;
        `;

        db.plantcare.execute(query, [taskId], (err, results) => {
            if (err) {
                reject(new Error("Error checking task existence: " + err.message));
            } else {
                resolve(results[0].count > 0);
            }
        });
    });
};

exports.getUploadedImagesCount = (userId, cropId) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT COUNT(*) as count
            FROM taskimages ti
            JOIN slavecropcalendardays scc ON ti.slaveId = scc.id
            WHERE scc.userId = ? AND scc.id= ?
        `;
        db.plantcare.query(sql, [userId, cropId], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });

    });
}



exports.getTaskImage = (slaveId) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT 
                ti.id,
                ti.slaveId,
                ti.staffId,
                ti.image,
                ti.createdAt,
                CASE 
                    WHEN ti.staffId IS NULL THEN 'You'
                    ELSE CONCAT(fs.firstName, ' ', fs.lastName)
                END AS uploadedBy
            FROM taskimages ti
            LEFT JOIN farmstaff fs ON ti.staffId = fs.id
            WHERE ti.slaveId = ?
            ORDER BY ti.createdAt DESC
        `;

        db.plantcare.query(sql, [slaveId], (err, results) => {
            if (err) {
                console.error("Database error in getTaskImage:", err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};