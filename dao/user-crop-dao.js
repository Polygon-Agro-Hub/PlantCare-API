const db = require("../startup/database");

const query = (sql, values) =>
    new Promise((resolve, reject) =>
        db.plantcare.query(sql, values, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        }),
    );

exports.insertOngoingCultivation = (userId) => {
    return query(`INSERT INTO ongoingcultivations (userId) VALUES (?)`, [userId]);
};

exports.insertCultivationCrop = (ongoingCultivationId, cropCalendar) => {
    return query(
        `INSERT INTO ongoingcultivationscrops (ongoingCultivationId, cropCalendar) VALUES (?, ?)`,
        [ongoingCultivationId, cropCalendar],
    );
};

exports.getCropsByUserId = (userId) => {
    return query(
        `SELECT c.id, c.cropCalendar, cc.cropName
     FROM ongoingcultivations oc
     JOIN ongoingcultivationscrops c ON oc.id = c.ongoingCultivationId
     JOIN cropcalender cc ON c.cropCalendar = cc.id
     WHERE oc.userId = ?`,
        [userId],
    );
};

exports.deleteCropById = (cropId, userId) => {
    return query(
        `DELETE c, oc
     FROM ongoingcultivationscrops c
     JOIN ongoingcultivations oc ON c.ongoingCultivationId = oc.id
     WHERE c.id = ? AND oc.userId = ?`,
        [cropId, userId],
    );
};
