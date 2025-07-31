const db = require('../startup/database');

exports.getRequiredImages = (cropId) => {
    return new Promise((resolve, reject) => {
        const query = `
      SELECT reqImages
      FROM slavecropcalendardays
      WHERE id = ?
      LIMIT 1;
    `;

        db.plantcare.execute(query, [cropId], (err, results) => {
            if (err) {
                reject(new Error('Error fetching required images: ' + err.message));
            } else {
                if (results.length > 0) {
                    resolve(results[0].reqImages);
                } else {
                    resolve(null);
                }
            }
        });
    });
};

exports.insertTaskImage = (slaveId, image, staffId) => {
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO taskimages (slaveId, staffId, image) VALUES (?, ?, ?)';
        db.plantcare.query(query, [slaveId, staffId, image], (err, result) => {
            if (err) {
                reject(new Error('Error inserting image into taskimages: ' + err.message));
            } else {
                resolve(result);
            }
        });
    });
};

