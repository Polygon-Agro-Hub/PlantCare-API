const db = require('../startup/database');

exports.getAllCurrentAssets = async (req, res) => {
    console.log("hitt")
    try {
        const userId = req.user.id;

        const sql = `
        SELECT category, SUM(total) AS totalSum 
        FROM currentasset 
        WHERE userId = ? 
        GROUP BY category
        HAVING totalSum > 0
      `;

        const [results] = await db.plantcare.promise().query(sql, [userId]);

        if (results.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No assets found for the user',
            });
        }

        return res.status(200).json({
            status: 'success',
            currentAssetsByCategory: results,
        });
    } catch (err) {
        return res.status(500).json({
            status: 'error',
            message: `Database error: ${err.message}`,
        });
    }
};




exports.handleAddFixedAsset = (req, res) => {

    const userId = req.user.id;
    const {
        category,
        asset,
        farmId,
        brand,
        batchNum,
        volume,
        unit,
        numberOfUnits,
        unitPrice,
        totalPrice,
        purchaseDate,
        expireDate,
        warranty,
        status
    } = req.body;

    const volumeInt = parseInt(volume, 10);
    if (isNaN(volumeInt)) {
        return res.status(400).json({ status: 'error', message: 'Volume must be a valid number.' });
    }

    const formattedPurchaseDate = new Date(purchaseDate).toISOString().slice(0, 19).replace('T', ' ');
    const formattedExpireDate = new Date(expireDate).toISOString().slice(0, 19).replace('T', ' ');

    const checkSql = `SELECT * FROM currentasset WHERE userId = ? AND category = ? AND asset = ? AND brand = ? AND batchNum = ?`;

    db.plantcare.query(checkSql, [userId, category, asset, brand, batchNum], (err, results) => {

        if (err) {
            console.error('Error checking asset:', err);
            return res.status(500).json({ status: 'error', message: 'Error checking asset: ' + err.message });
        }

        if (results.length > 0) {
            const existingAsset = results[0];

            const updatedNumOfUnits = parseFloat(existingAsset.numOfUnit) + parseFloat(numberOfUnits);
            const updatedTotalPrice = (parseFloat(existingAsset.total) + parseFloat(totalPrice)).toFixed(2);

            const updateSql = `
                UPDATE currentasset
                SET numOfUnit = ?, total = ?, unitVolume = ?, unitPrice = ?, purchaseDate = ?, expireDate = ?, status = ?
                WHERE id = ?
            `;
            const updateValues = [
                updatedNumOfUnits.toFixed(2),
                updatedTotalPrice,
                volumeInt,
                unitPrice,
                formattedPurchaseDate,
                formattedExpireDate,
                status,
                existingAsset.id
            ];

            db.plantcare.query(updateSql, updateValues, (updateErr, updateResult) => {
                if (updateErr) {
                    console.error('Error updating asset:', updateErr);
                    return res.status(500).json({
                        status: 'error',
                        message: 'Error updating asset: ' + updateErr.message,
                    });
                }

                if (updateResult.affectedRows === 0) {
                    console.log('No rows were updated');
                    return res.status(500).json({
                        status: 'error',
                        message: 'No asset was updated. Please check if the asset exists.',
                    });
                }

                const recordSql = `
                    INSERT INTO currentassetrecord (currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice)
                    VALUES (?, ?, 0, ?)
                `;
                const recordValues = [existingAsset.id, numberOfUnits, totalPrice];

                db.plantcare.query(recordSql, recordValues, (recordErr) => {
                    if (recordErr) {
                        console.error('Error adding asset record:', recordErr);
                        return res.status(500).json({
                            status: 'error',
                            message: 'Error adding asset record: ' + recordErr.message,
                        });
                    }

                    res.status(200).json({
                        status: 'success',
                        message: 'Asset updated successfully',
                    });
                });
            });

        } else {

            const insertSql = `
                INSERT INTO currentasset (userId,farmId, category, asset, brand, batchNum, unitVolume, unit, numOfUnit, unitPrice, total, purchaseDate, expireDate, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
            `;
            const insertValues = [
                userId, farmId, category, asset, brand, batchNum, volumeInt, unit,
                numberOfUnits, unitPrice, totalPrice, formattedPurchaseDate, formattedExpireDate, status
            ];

            db.plantcare.query(insertSql, insertValues, (insertErr, insertResult) => {
                if (insertErr) {
                    console.error('Error inserting new asset:', insertErr);
                    return res.status(500).json({
                        status: 'error',
                        message: 'Error inserting new asset: ' + insertErr.message,
                    });
                }

                const newRecordSql = `
                    INSERT INTO currentassetrecord (currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice)
                    VALUES (?, ?, 0, ?)
                `;
                const newRecordValues = [insertResult.insertId, numberOfUnits, totalPrice];

                db.plantcare.query(newRecordSql, newRecordValues, (newRecordErr) => {
                    if (newRecordErr) {
                        console.error('Error adding new asset record:', newRecordErr);
                        return res.status(500).json({
                            status: 'error',
                            message: 'Error adding new asset record: ' + newRecordErr.message,
                        });
                    }

                    res.status(201).json({
                        status: 'success',
                        message: 'New asset created successfully',
                    });
                });
            });
        }
    });
};


// exports.deleteAsset = (req, res) => {
//     const { category, assetId } = req.params;
//     const { numberOfUnits, totalPrice } = req.body;
//     const userId = req.user.id;

//     db.plantcare.execute('SELECT * FROM currentasset WHERE userId = ? AND category = ? AND id = ?', [userId, category, assetId], (err, results) => {
//         if (err) {
//             console.error('Error retrieving asset:', err);
//             return res.status(500).json({ message: 'Server error.' });
//         }

//         if (!results.length) {
//             return res.status(404).json({ message: 'Asset not found.' });
//         }

//         const currentAsset = results[0];
//         const newNumOfUnit = currentAsset.numOfUnit - numberOfUnits;
//         const newTotal = currentAsset.total - totalPrice;

//         if (newNumOfUnit < 0 || newTotal < 0) {
//             return res.status(400).json({ message: 'Invalid operation: insufficient units.' });
//         }

//         if (newNumOfUnit === 0 && newTotal === 0) {
//             db.plantcare.execute('DELETE FROM currentasset WHERE userId = ? AND category = ? AND id = ?', [userId, category, assetId], (deleteErr) => {
//                 if (deleteErr) {
//                     console.error('Error deleting asset:', deleteErr);
//                     return res.status(500).json({ message: 'Server error.' });
//                 }

//                 db.plantcare.execute('INSERT INTO currentassetrecord (currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice) VALUES (?, 0, ?, ?)', [currentAsset.id, numberOfUnits, totalPrice], (recordErr) => {
//                     if (recordErr) {
//                         console.error('Error adding asset record:', recordErr);
//                         return res.status(500).json({ message: 'Server error.' });
//                     }

//                     res.status(200).json({ message: 'Asset removed successfully.' });
//                 });
//             });
//         } else {
//             db.plantcare.execute('UPDATE currentasset SET numOfUnit = ?, total = ? WHERE userId = ? AND category = ? AND id = ?', [newNumOfUnit, newTotal, userId, category, assetId], (updateErr) => {
//                 if (updateErr) {
//                     console.error('Error updating asset:', updateErr);
//                     return res.status(500).json({ message: 'Server error.' });
//                 }

//                 db.plantcare.execute('INSERT INTO currentassetrecord (currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice) VALUES (?, 0, ?, ?)', [currentAsset.id, numberOfUnits, totalPrice], (recordErr) => {
//                     if (recordErr) {
//                         console.error('Error adding asset record:', recordErr);
//                         return res.status(500).json({ message: 'Server error.' });
//                     }

//                     res.status(200).json({ message: 'Asset updated successfully.' });
//                 });
//             });
//         }
//     });
// };



exports.deleteAsset = (req, res) => {
    const { category, assetId } = req.params;
    const { numberOfUnits, totalPrice } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!numberOfUnits || numberOfUnits <= 0) {
        return res.status(400).json({ message: 'Invalid number of units.' });
    }

    if (!totalPrice || totalPrice <= 0) {
        return res.status(400).json({ message: 'Invalid total price.' });
    }

    db.plantcare.execute('SELECT * FROM currentasset WHERE userId = ? AND category = ? AND id = ?', [userId, category, assetId], (err, results) => {
        if (err) {
            console.error('Error retrieving asset:', err);
            return res.status(500).json({ message: 'Server error.' });
        }

        if (!results.length) {
            return res.status(404).json({ message: 'Asset not found.' });
        }

        const currentAsset = results[0];
        const newNumOfUnit = currentAsset.numOfUnit - numberOfUnits;
        const newTotal = currentAsset.total - totalPrice;

        // Validation checks
        if (numberOfUnits > currentAsset.numOfUnit) {
            return res.status(400).json({ message: 'Cannot remove more units than available.' });
        }

        if (totalPrice > currentAsset.total) {
            return res.status(400).json({ message: 'Cannot remove more value than available.' });
        }

        if (newNumOfUnit < 0 || newTotal < 0) {
            return res.status(400).json({ message: 'Invalid operation: insufficient units or value.' });
        }

        // FIRST: Insert the record while the asset still exists
        db.plantcare.execute(
            'INSERT INTO currentassetrecord (currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice) VALUES (?, 0, ?, ?)',
            [currentAsset.id, numberOfUnits, totalPrice],
            (recordErr) => {
                if (recordErr) {
                    console.error('Error adding asset record:', recordErr);
                    return res.status(500).json({ message: 'Failed to record transaction.' });
                }

                // THEN: Delete or update the asset
                if (newNumOfUnit === 0 && newTotal === 0) {
                    // Delete the entire asset
                    db.plantcare.execute(
                        'DELETE FROM currentasset WHERE userId = ? AND category = ? AND id = ?',
                        [userId, category, assetId],
                        (deleteErr) => {
                            if (deleteErr) {
                                console.error('Error deleting asset:', deleteErr);
                                return res.status(500).json({ message: 'Failed to delete asset.' });
                            }

                            res.status(200).json({ message: 'Asset removed successfully.' });
                        }
                    );
                } else {
                    // Update the asset with new values
                    db.plantcare.execute(
                        'UPDATE currentasset SET numOfUnit = ?, total = ? WHERE userId = ? AND category = ? AND id = ?',
                        [newNumOfUnit, newTotal, userId, category, assetId],
                        (updateErr) => {
                            if (updateErr) {
                                console.error('Error updating asset:', updateErr);
                                return res.status(500).json({ message: 'Failed to update asset.' });
                            }

                            res.status(200).json({ message: 'Asset updated successfully.' });
                        }
                    );
                }
            }
        );
    });
};


exports.getAssetsByCategory = (req, res) => {
    const userId = req.user.id;
    const category = req.query.category;

    if (!category) {
        return res.status(400).json({ message: 'Category is required.' });
    }

    let query;
    let values;

    if (Array.isArray(category)) {
        const placeholders = category.map(() => '?').join(',');
        query = `SELECT * FROM currentasset WHERE userId = ? AND category IN (${placeholders})`;
        values = [userId, ...category];
    } else {
        query = 'SELECT * FROM currentasset WHERE userId = ? AND category = ?';
        values = [userId, category];
    }

    db.plantcare.query(query, values, (error, results) => {
        if (error) {
            console.error('Error fetching assets by category:', error);
            return res.status(500).json({ message: 'Server error, please try again later.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'No assets found for this category.' });
        }

        res.status(200).json({ assets: results });
    });
};