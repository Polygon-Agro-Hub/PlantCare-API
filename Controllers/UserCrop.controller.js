const db = require('../startup/database');

const createCrop = (req, res) => {
  const { cropCalendar } = req.body;
  const userId = req.userId;

  const sql = `
    INSERT INTO ongoingcultivations (userId) VALUES (?)
  `;
  db.plantcare.query(sql, [userId], (err, result) => {
    if (err) {
      return res.status(500).send('Error creating ongoing cultivation: ' + err);
    }

    const ongoingCultivationId = result.insertId;

    const sql2 = `
      INSERT INTO ongoingcultivationscrops (ongoingCultivationId, cropCalendar) VALUES (?, ?)
    `;
    db.plantcare.query(sql2, [ongoingCultivationId, cropCalendar], (err, result) => {
      if (err) {
        return res.status(500).send('Error creating ongoing cultivation crop: ' + err);
      }
      res.status(201).send('Crop created successfully.');
    });
  });
};

// View crops for the logged-in user
const viewCrops = (req, res) => {
  const userId = req.userId;

  const sql = `
    SELECT c.id, c.cropCalendar, cc.cropName
    FROM ongoingcultivations oc
    JOIN ongoingcultivationscrops c ON oc.id = c.ongoingCultivationId
    JOIN cropcalender cc ON c.cropCalendar = cc.id
    WHERE oc.userId = ?
  `;
  db.plantcare.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).send('Error fetching crops: ' + err);
    }
    res.status(200).json(results);
  });
};

const deleteCrop = (req, res) => {
  const { cropId } = req.params;
  const userId = req.userId;

  const sql = `
    DELETE c, oc
    FROM ongoingcultivationscrops c
    JOIN ongoingcultivations oc ON c.ongoingCultivationId = oc.id
    WHERE c.id = ? AND oc.userId = ?
  `;
  db.plantcare.query(sql, [cropId, userId], (err, result) => {
    if (err) {
      return res.status(500).send('Error deleting crop: ' + err);
    }
    if (result.affectedRows === 0) {
      return res.status(404).send('Crop not found or not authorized to delete');
    }
    res.status(200).send('Crop deleted successfully.');
  });
};

module.exports = {
  createCrop,
  viewCrops,
  deleteCrop
};
