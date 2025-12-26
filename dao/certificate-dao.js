const db = require("../startup/database");


exports.getFarmsCertificate = async (farmId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT DISTINCT
                c.id,
                c.srtcomapnyId,
                c.srtName,
                c.srtNumber,
                c.applicable,
                c.accreditation,
                c.serviceAreas,
                c.price,
                c.timeLine,
                c.commission,
                c.tearms,
                c.scope,
                c.logo,
                c.noOfVisit,
                c.modifyBy,
                c.modifyDate,
                c.createdAt
            FROM certificates c
            INNER JOIN (
                -- Get farm district
                SELECT district 
                FROM farms 
                WHERE id = ?
                LIMIT 1
            ) f ON FIND_IN_SET(f.district, c.serviceAreas) > 0
            WHERE c.applicable = 'For Farm'
            AND EXISTS (
                -- Check if certificate has at least one questionnaire
                SELECT 1 
                FROM questionnaire q 
                WHERE q.certificateid = c.id
                LIMIT 1
            )
            ORDER BY c.id ASC
        `;

        db.plantcare.query(query, [farmId], (error, results) => {
            if (error) {
                console.error("Error fetching farm certificates:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

// Certificate Payment DAO - Fixed Version

exports.generateTransactionId = async () => {
    return new Promise((resolve, reject) => {
        // Query to get the last transaction ID
        const query = `
            SELECT transactionId 
            FROM certificationpayment 
            ORDER BY id DESC 
            LIMIT 1
        `;

        db.plantcare.query(query, (error, results) => {
            if (error) {
                console.error("Error fetching last transaction ID:", error);
                return reject(error);
            }

            let newTransactionId;

            if (results.length === 0) {
                // No previous transactions, start with CTID0000001
                newTransactionId = 'CTID0000001';
            } else {
                const lastTransactionId = results[0].transactionId;
                console.log("Last transaction ID:", lastTransactionId);

                // Extract the numeric part from the transaction ID
                // Assuming format is like CTID0000001, CTID0000002, etc.
                const match = lastTransactionId.match(/(\d+)$/);

                if (match) {
                    const lastNumber = parseInt(match[1]);
                    const newNumber = lastNumber + 1;

                    // Pad with zeros to maintain consistent length (7 digits)
                    const paddedNumber = newNumber.toString().padStart(7, '0');
                    newTransactionId = `CTID${paddedNumber}`;
                } else {
                    // If format doesn't match, start fresh
                    newTransactionId = 'CTID0000001';
                }
            }

            console.log("Generated new transaction ID:", newTransactionId);
            resolve(newTransactionId);
        });
    });
};

// exports.createCertificatePayment = async (paymentData) => {
//     return new Promise((resolve, reject) => {
//         // First insert into certificationpayment table
//         const paymentQuery = `
//             INSERT INTO certificationpayment 
//             (certificateId, userId, payType, transactionId, amount, expireDate, createdAt)
//             VALUES (?, ?, ?, ?, ?, ?, NOW())
//         `;

//         const paymentValues = [
//             paymentData.certificateId,
//             paymentData.userId,
//             paymentData.payType,
//             paymentData.transactionId,
//             paymentData.amount,
//             paymentData.expireDate
//         ];

//         console.log("Inserting certificate payment:", paymentValues);

//         db.plantcare.query(paymentQuery, paymentValues, (error, paymentResults) => {
//             if (error) {
//                 console.error("Error creating certificate payment:", error);
//                 console.error("Query:", paymentQuery);
//                 console.error("Values:", paymentValues);
//                 return reject(error);
//             }

//             const paymentId = paymentResults.insertId;
//             console.log("Certificate payment created with ID:", paymentId);

//             // Now insert into certificationpaymentfarm table
//             const farmLinkQuery = `
//                 INSERT INTO certificationpaymentfarm 
//                 (paymentId, farmId, createdAt)
//                 VALUES (?, ?, NOW())
//             `;

//             const farmLinkValues = [
//                 paymentId,
//                 paymentData.farmId
//             ];

//             console.log("Linking payment to farm:", farmLinkValues);

//             db.plantcare.query(farmLinkQuery, farmLinkValues, (error, farmLinkResults) => {
//                 if (error) {
//                     console.error("Error linking payment to farm:", error);
//                     console.error("Query:", farmLinkQuery);
//                     console.error("Values:", farmLinkValues);

//                     // Try to delete the payment record if farm link fails
//                     const deleteQuery = `DELETE FROM certificationpayment WHERE id = ?`;
//                     db.plantcare.query(deleteQuery, [paymentId], (deleteError) => {
//                         if (deleteError) {
//                             console.error("Error rolling back payment:", deleteError);
//                         }
//                     });

//                     return reject(error);
//                 }

//                 console.log("Payment linked to farm successfully");
//                 resolve({
//                     paymentId: paymentId,
//                     farmLinkId: farmLinkResults.insertId
//                 });
//             });
//         });
//     });
// };

exports.createCertificatePayment = async (paymentData) => {
    return new Promise((resolve, reject) => {
        // First insert into certificationpayment table
        const paymentQuery = `
            INSERT INTO certificationpayment 
            (certificateId, userId, payType, transactionId, amount, expireDate, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;

        const paymentValues = [
            paymentData.certificateId,
            paymentData.userId,
            paymentData.payType,
            paymentData.transactionId,
            paymentData.amount,
            paymentData.expireDate
        ];

        console.log("Inserting certificate payment:", paymentValues);

        db.plantcare.query(paymentQuery, paymentValues, (error, paymentResults) => {
            if (error) {
                console.error("Error creating certificate payment:", error);
                console.error("Query:", paymentQuery);
                console.error("Values:", paymentValues);
                return reject(error);
            }

            const paymentId = paymentResults.insertId;
            console.log("Certificate payment created with ID:", paymentId);

            // Insert into certificationpaymentfarm table
            const farmLinkQuery = `
                INSERT INTO certificationpaymentfarm 
                (paymentId, farmId, createdAt)
                VALUES (?, ?, NOW())
            `;

            const farmLinkValues = [paymentId, paymentData.farmId];

            console.log("Linking payment to farm:", farmLinkValues);

            db.plantcare.query(farmLinkQuery, farmLinkValues, (error, farmLinkResults) => {
                if (error) {
                    console.error("Error linking payment to farm:", error);
                    rollbackPayment(paymentId);
                    return reject(error);
                }

                console.log("Payment linked to farm successfully");

                // Insert into slavequestionnaire table
                const slaveQuestionnaireQuery = `
                    INSERT INTO slavequestionnaire 
                    (crtPaymentId, createdAt)
                    VALUES (?, NOW())
                `;

                db.plantcare.query(slaveQuestionnaireQuery, [paymentId], (error, slaveResults) => {
                    if (error) {
                        console.error("Error creating slave questionnaire:", error);
                        rollbackPayment(paymentId);
                        return reject(error);
                    }

                    const slaveId = slaveResults.insertId;
                    console.log("Slave questionnaire created with ID:", slaveId);

                    // Copy questionnaire items from questionnaire table to slavequestionnaireitems
                    const copyItemsQuery = `
                        INSERT INTO slavequestionnaireitems 
                        (slaveId, type, qNo, qEnglish, qSinhala, qTamil)
                        SELECT ?, type, qNo, qEnglish, qSinhala, qTamil
                        FROM questionnaire
                        WHERE certificateId = ?
                        ORDER BY qNo
                    `;

                    db.plantcare.query(copyItemsQuery, [slaveId, paymentData.certificateId], (error, itemsResults) => {
                        if (error) {
                            console.error("Error copying questionnaire items:", error);
                            rollbackPayment(paymentId);
                            return reject(error);
                        }

                        console.log(`Copied ${itemsResults.affectedRows} questionnaire items to slave table`);

                        resolve({
                            paymentId: paymentId,
                            farmLinkId: farmLinkResults.insertId,
                            slaveQuestionnaireId: slaveId,
                            itemsCopied: itemsResults.affectedRows
                        });
                    });
                });
            });
        });

        // Helper function to rollback payment on error
        function rollbackPayment(paymentId) {
            const deleteQuery = `DELETE FROM certificationpayment WHERE id = ?`;
            db.plantcare.query(deleteQuery, [paymentId], (deleteError) => {
                if (deleteError) {
                    console.error("Error rolling back payment:", deleteError);
                }
            });
        }
    });
};

//crop

// exports.getCropsCertificate = async (farmId) => {
//     return new Promise((resolve, reject) => {
//         const query = `
//             SELECT DISTINCT
//                 c.id,
//                 c.srtcomapnyId,
//                 c.srtName,
//                 c.srtNumber,
//                 c.applicable,
//                 c.accreditation,
//                 c.serviceAreas,
//                 c.price,
//                 c.timeLine,
//                 c.commission,
//                 c.tearms,
//                 c.scope,
//                 c.logo,
//                 c.noOfVisit,
//                 c.modifyBy,
//                 c.modifyDate,
//                 c.createdAt
//             FROM certificates c
//             INNER JOIN (
//                 -- Get farm district
//                 SELECT district 
//                 FROM farms 
//                 WHERE id = ?
//                 LIMIT 1
//             ) f ON FIND_IN_SET(f.district, c.serviceAreas) > 0
//             WHERE c.applicable = 'For Selected Crops'
//             AND EXISTS (
//                 -- Check if certificate has at least one questionnaire
//                 SELECT 1 
//                 FROM questionnaire q 
//                 WHERE q.certificateid = c.id
//                 LIMIT 1
//             )
//             ORDER BY c.id ASC
//         `;

//         db.plantcare.query(query, [farmId], (error, results) => {
//             if (error) {
//                 console.error("Error fetching crop certificates:", error);
//                 reject(error);
//             } else {
//                 resolve(results);
//             }
//         });
//     });
// };
exports.getCropsCertificate = async (farmId, cropId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT DISTINCT
                c.id,
                c.srtcomapnyId,
                c.srtName,
                c.srtNumber,
                c.applicable,
                c.accreditation,
                c.serviceAreas,
                c.price,
                c.timeLine,
                c.commission,
                c.tearms,
                c.scope,
                c.logo,
                c.noOfVisit,
                c.modifyBy,
                c.modifyDate,
                c.createdAt
            FROM certificates c
            INNER JOIN (
                -- Get farm district
                SELECT district 
                FROM farms 
                WHERE id = ?
                LIMIT 1
            ) f ON FIND_IN_SET(f.district, c.serviceAreas) > 0
            INNER JOIN certificatecrops cc ON cc.certificateId = c.id
            INNER JOIN (
                -- Get cropGroupId from the ongoing cultivation crop
                SELECT cv.cropGroupId
                FROM ongoingcultivationscrops occ
                INNER JOIN cropcalender ccal ON ccal.id = occ.cropCalendar
                INNER JOIN cropvariety cv ON cv.id = ccal.cropVarietyId
                WHERE occ.id = ?
                LIMIT 1
            ) crop_info ON crop_info.cropGroupId = cc.cropId
            WHERE c.applicable = 'For Selected Crops'
            AND EXISTS (
                -- Check if certificate has at least one questionnaire
                SELECT 1 
                FROM questionnaire q 
                WHERE q.certificateid = c.id
                LIMIT 1
            )
            ORDER BY c.id ASC
        `;

        db.plantcare.query(query, [farmId, cropId], (error, results) => {
            if (error) {
                console.error("Error fetching crop certificates:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

// exports.createCropCertificatePayment = async (paymentData) => {
//     return new Promise((resolve, reject) => {
//         // First insert into certificationpayment table
//         const paymentQuery = `
//             INSERT INTO certificationpayment 
//             (certificateId, userId, payType, transactionId, amount, expireDate, createdAt)
//             VALUES (?, ?, ?, ?, ?, ?, NOW())
//         `;

//         const paymentValues = [
//             paymentData.certificateId,
//             paymentData.userId,
//             paymentData.payType,
//             paymentData.transactionId,
//             paymentData.amount,
//             paymentData.expireDate
//         ];

//         console.log("Inserting certificate payment:", paymentValues);

//         db.plantcare.query(paymentQuery, paymentValues, (error, paymentResults) => {
//             if (error) {
//                 console.error("Error creating certificate payment:", error);
//                 console.error("Query:", paymentQuery);
//                 console.error("Values:", paymentValues);
//                 return reject(error);
//             }

//             const paymentId = paymentResults.insertId;
//             console.log("Certificate payment created with ID:", paymentId);

//             // Now insert into certificationpaymentfarm table
//             const farmLinkQuery = `
//                 INSERT INTO certificationpaymentcrop 
//                 (paymentId, cropId, createdAt)
//                 VALUES (?, ?, NOW())
//             `;

//             const farmLinkValues = [
//                 paymentId,
//                 paymentData.cropId
//             ];

//             console.log("Linking payment to farm:", farmLinkValues);

//             db.plantcare.query(farmLinkQuery, farmLinkValues, (error, farmLinkResults) => {
//                 if (error) {
//                     console.error("Error linking payment to farm:", error);
//                     console.error("Query:", farmLinkQuery);
//                     console.error("Values:", farmLinkValues);

//                     // Try to delete the payment record if farm link fails
//                     const deleteQuery = `DELETE FROM certificationpayment WHERE id = ?`;
//                     db.plantcare.query(deleteQuery, [paymentId], (deleteError) => {
//                         if (deleteError) {
//                             console.error("Error rolling back payment:", deleteError);
//                         }
//                     });

//                     return reject(error);
//                 }

//                 console.log("Payment linked to farm successfully");
//                 resolve({
//                     paymentId: paymentId,
//                     farmLinkId: farmLinkResults.insertId
//                 });
//             });
//         });
//     });
// };

exports.createCropCertificatePayment = async (paymentData) => {
    return new Promise((resolve, reject) => {
        // First insert into certificationpayment table
        const paymentQuery = `
            INSERT INTO certificationpayment 
            (certificateId, userId, payType, transactionId, amount, expireDate, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;

        const paymentValues = [
            paymentData.certificateId,
            paymentData.userId,
            paymentData.payType,
            paymentData.transactionId,
            paymentData.amount,
            paymentData.expireDate
        ];

        console.log("Inserting certificate payment:", paymentValues);

        db.plantcare.query(paymentQuery, paymentValues, (error, paymentResults) => {
            if (error) {
                console.error("Error creating certificate payment:", error);
                console.error("Query:", paymentQuery);
                console.error("Values:", paymentValues);
                return reject(error);
            }

            const paymentId = paymentResults.insertId;
            console.log("Certificate payment created with ID:", paymentId);

            // Insert into certificationpaymentcrop table
            const cropLinkQuery = `
                INSERT INTO certificationpaymentcrop 
                (paymentId, cropId, createdAt)
                VALUES (?, ?, NOW())
            `;

            const cropLinkValues = [paymentId, paymentData.cropId];

            console.log("Linking payment to crop:", cropLinkValues);

            db.plantcare.query(cropLinkQuery, cropLinkValues, (error, cropLinkResults) => {
                if (error) {
                    console.error("Error linking payment to crop:", error);
                    rollbackPayment(paymentId);
                    return reject(error);
                }

                console.log("Payment linked to crop successfully");

                // Insert into slavequestionnaire table
                const slaveQuestionnaireQuery = `
                    INSERT INTO slavequestionnaire 
                    (crtPaymentId, createdAt)
                    VALUES (?, NOW())
                `;

                db.plantcare.query(slaveQuestionnaireQuery, [paymentId], (error, slaveResults) => {
                    if (error) {
                        console.error("Error creating slave questionnaire:", error);
                        rollbackPayment(paymentId);
                        return reject(error);
                    }

                    const slaveId = slaveResults.insertId;
                    console.log("Slave questionnaire created with ID:", slaveId);

                    // Copy questionnaire items from questionnaire table to slavequestionnaireitems
                    const copyItemsQuery = `
                        INSERT INTO slavequestionnaireitems 
                        (slaveId, type, qNo, qEnglish, qSinhala, qTamil)
                        SELECT ?, type, qNo, qEnglish, qSinhala, qTamil
                        FROM questionnaire
                        WHERE certificateId = ?
                        ORDER BY qNo
                    `;

                    db.plantcare.query(copyItemsQuery, [slaveId, paymentData.certificateId], (error, itemsResults) => {
                        if (error) {
                            console.error("Error copying questionnaire items:", error);
                            rollbackPayment(paymentId);
                            return reject(error);
                        }

                        console.log(`Copied ${itemsResults.affectedRows} questionnaire items to slave table`);

                        resolve({
                            paymentId: paymentId,
                            cropLinkId: cropLinkResults.insertId,
                            slaveQuestionnaireId: slaveId,
                            itemsCopied: itemsResults.affectedRows
                        });
                    });
                });
            });
        });

        // Helper function to rollback payment on error
        function rollbackPayment(paymentId) {
            const deleteQuery = `DELETE FROM certificationpayment WHERE id = ?`;
            db.plantcare.query(deleteQuery, [paymentId], (deleteError) => {
                if (deleteError) {
                    console.error("Error rolling back payment:", deleteError);
                }
            });
        }
    });
};


exports.getCropHvaeCertificate = async (cropId, userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                cp.id as paymentId,
                cp.certificateId,
                cp.userId,
                cp.payType,
                cpc.cropId,
                cpc.createdAt
            FROM plant_care.certificationpayment cp
            INNER JOIN plant_care.certificationpaymentcrop cpc 
                ON cp.id = cpc.paymentId
            WHERE cp.userId = ? 
                AND cp.payType = 'Crop'
                AND cpc.cropId = ?
            LIMIT 1
        `;

        db.plantcare.query(query, [userId, cropId], (error, results) => {
            if (error) {
                console.error("Error fetching crop certificates:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};



exports.getCropCertificateByid = async (cropId, userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                cpc.cropId,
                cpc.paymentId,
                cp.certificateId,
                cp.transactionId,
                cp.amount,
                cp.expireDate,
                cp.createdAt as paymentCreatedAt,
                cert.srtcomapnyId,
                cert.srtName,
                cert.srtNameSinhala,
                cert.srtNameTamil,
                cert.srtNumber,
                cert.applicable,
                cert.accreditation,
                cert.serviceAreas,
                cert.price,
                cert.timeLine,
                cert.commission,
                cert.tearms,
                cert.scope,
                cert.logo,
                cert.noOfVisit,
                cert.modifyBy,
                cert.modifyDate,
                cert.createdAt as certificateCreatedAt,
                sq.id as slaveQuestionnaireId,
                sq.clusterFarmId,
                sq.createdAt as slaveQuestionnaireCreatedAt
            FROM certificationpaymentcrop cpc
            INNER JOIN certificationpayment cp ON cpc.paymentId = cp.id
            INNER JOIN certificates cert ON cp.certificateId = cert.id
            LEFT JOIN slavequestionnaire sq ON sq.crtPaymentId = cp.id
            WHERE cpc.cropId = ? AND cp.userId = ?
            ORDER BY cp.createdAt DESC
        `;

        db.plantcare.query(query, [cropId, userId], (error, results) => {
            if (error) {
                console.error("Error fetching crop certificates:", error);
                return reject(error);
            }

            if (!results || results.length === 0) {
                return resolve([]);
            }

            // Get questionnaire items for each slave questionnaire
            const certificatesWithItems = [];
            let processedCount = 0;

            results.forEach((certificate, index) => {
                if (!certificate.slaveQuestionnaireId) {
                    // No questionnaire for this certificate
                    certificatesWithItems.push({
                        ...certificate,
                        questionnaireItems: []
                    });
                    processedCount++;

                    if (processedCount === results.length) {
                        resolve(certificatesWithItems);
                    }
                    return;
                }

                // Fetch questionnaire items
                const itemsQuery = `
                    SELECT 
                        id,
                        slaveId,
                        type,
                        qNo,
                        qEnglish,
                        qSinhala,
                        qTamil,
                        tickResult,
                        officerTickResult,
                        uploadImage,
                        officerUploadImage,
                        doneDate
                    FROM slavequestionnaireitems
                    WHERE slaveId = ?
                    ORDER BY qNo ASC
                `;

                db.plantcare.query(itemsQuery, [certificate.slaveQuestionnaireId], (itemError, items) => {
                    if (itemError) {
                        console.error("Error fetching questionnaire items:", itemError);
                        certificatesWithItems.push({
                            ...certificate,
                            questionnaireItems: []
                        });
                    } else {
                        certificatesWithItems.push({
                            ...certificate,
                            questionnaireItems: items || []
                        });
                    }

                    processedCount++;

                    if (processedCount === results.length) {
                        resolve(certificatesWithItems);
                    }
                });
            });
        });
    });
};



// exports.updateQuestionItemByid = async (itemId, updateData) => {
//     return new Promise((resolve, reject) => {
//         let query;
//         let params;

//         // Check if it's a tick-off update or image upload update
//         if (updateData.type === 'tickOff') {
//             query = `
//                 UPDATE slavequestionnaireitems 
//                 SET tickResult = ?, doneDate = NOW()
//                 WHERE id = ?
//             `;
//             params = [1, itemId];
//         } else if (updateData.type === 'photoProof') {
//             query = `
//                 UPDATE slavequestionnaireitems 
//                 SET uploadImage = ?, doneDate = NOW()
//                 WHERE id = ?
//             `;
//             params = [updateData.imageUrl, itemId];
//         } else {
//             return reject(new Error('Invalid update type'));
//         }

//         db.plantcare.query(query, params, (err, result) => {
//             if (err) {
//                 reject(new Error('Error updating questionnaire item: ' + err.message));
//             } else {
//                 if (result.affectedRows === 0) {
//                     reject(new Error('No questionnaire item found with the given ID'));
//                 } else {
//                     resolve({
//                         success: true,
//                         message: 'Questionnaire item updated successfully',
//                         affectedRows: result.affectedRows
//                     });
//                 }
//             }
//         });
//     });
// };

exports.updateQuestionItemByid = async (itemId, updateData) => {
    return new Promise((resolve, reject) => {
        let query;
        let params;

        // Get current timestamp and add 5 hours 30 minutes for Sri Lanka timezone
        const currentDate = new Date();
        const sriLankaTime = new Date(currentDate.getTime() + (5.5 * 60 * 60 * 1000));
        const currentTimestamp = sriLankaTime.toISOString().slice(0, 19).replace('T', ' ');

        // Check if it's a tick-off update or image upload update
        if (updateData.type === 'tickOff') {
            query = `
                UPDATE slavequestionnaireitems 
                SET tickResult = ?, doneDate = ?
                WHERE id = ?
            `;
            params = [1, currentTimestamp, itemId];
        } else if (updateData.type === 'photoProof') {
            query = `
                UPDATE slavequestionnaireitems 
                SET uploadImage = ?, doneDate = ?
                WHERE id = ?
            `;
            params = [updateData.imageUrl, currentTimestamp, itemId];
        } else {
            return reject(new Error('Invalid update type'));
        }

        db.plantcare.query(query, params, (err, result) => {
            if (err) {
                reject(new Error('Error updating questionnaire item: ' + err.message));
            } else {
                if (result.affectedRows === 0) {
                    reject(new Error('No questionnaire item found with the given ID'));
                } else {
                    resolve({
                        success: true,
                        message: 'Questionnaire item updated successfully',
                        affectedRows: result.affectedRows
                    });
                }
            }
        });
    });
};

// Get questionnaire item by ID to check type
exports.getQuestionItemById = async (itemId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, slaveId, type, qNo, qEnglish, qSinhala, qTamil, 
                   tickResult, officerTickResult, uploadImage, officerUploadImage, doneDate
            FROM slavequestionnaireitems
            WHERE id = ?
        `;

        db.plantcare.query(query, [itemId], (err, results) => {
            if (err) {
                reject(new Error('Error fetching questionnaire item: ' + err.message));
            } else {
                resolve(results[0]);
            }
        });
    });
};


exports.getFarmName = async (farmId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT farmName 
            FROM plant_care.farms 
            WHERE id = ?
            ORDER BY farmName ASC
        `;

        db.plantcare.query(query, [farmId], (error, results) => {
            if (error) {
                console.error("Error fetching farm name:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};



exports.getFarmcertificateCrop = async (farmId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                cc.cropId,
                cc.certificateId,
                cpf.farmId,
                cpf.paymentId
            FROM certificationpaymentfarm cpf
            INNER JOIN certificationpayment cp 
                ON cpf.paymentId = cp.id
            INNER JOIN certificatecrops cc 
                ON cp.certificateId = cc.certificateId
            WHERE cpf.farmId = ?
            ORDER BY cc.certificateId, cc.cropId;
        `;

        db.plantcare.query(query, [farmId], (error, results) => {
            if (error) {
                console.error("Error fetching farm certificate crops:", error);
                reject(error);
            } else {
                console.log("Query results:", results); // Add this debug log
                resolve(results);
            }
        });
    });
};



exports.getFarmCertificate = async (farmId, userId) => {
    return new Promise((resolve, reject) => {
        // First check if farm is in a cluster
        const clusterCheckQuery = `
            SELECT farmId 
            FROM plant_care.farmclusterfarmers 
            WHERE farmId = ?
            LIMIT 1
        `;

        db.plantcare.query(clusterCheckQuery, [farmId], (clusterError, clusterResults) => {
            if (clusterError) {
                console.error("Error checking farm cluster:", clusterError);
                reject(clusterError);
                return;
            }

            // If farm is in a cluster, return it as having certificate
            if (clusterResults && clusterResults.length > 0) {
                console.log("Farm is in a cluster - has certificate");
                resolve([{
                    farmId: farmId,
                    certificateSource: 'cluster',
                    hasClusterCertificate: true
                }]);
                return;
            }

            // If not in cluster, check regular certificate payment
            const certificateQuery = `
                SELECT 
                    cp.id as paymentId,
                    cp.certificateId,
                    cp.userId,
                    cp.payType,
                    cp.transactionId,
                    cp.amount,
                    cp.expireDate,
                    cpc.farmId,
                    cpc.createdAt
                FROM plant_care.certificationpayment cp
                INNER JOIN plant_care.certificationpaymentfarm cpc 
                    ON cp.id = cpc.paymentId
                WHERE cp.userId = ? 
                    AND cp.payType = 'Farm'
                    AND cpc.farmId = ?
                ORDER BY cpc.createdAt DESC
                LIMIT 1
            `;

            db.plantcare.query(certificateQuery, [userId, farmId], (certError, certResults) => {
                if (certError) {
                    console.error("Error fetching farm certificates:", certError);
                    reject(certError);
                } else {
                    resolve(certResults);
                }
            });
        });
    });
};

// exports.getFarmCertificate = async (farmId, userId) => {
//     return new Promise((resolve, reject) => {
//         const query = `
//             SELECT 
//                 cp.id as paymentId,
//                 cp.certificateId,
//                 cp.userId,
//                 cp.payType,
//                 cp.transactionId,
//                 cp.amount,
//                 cp.expireDate,
//                 cpc.farmId,
//                 cpc.createdAt
//             FROM plant_care.certificationpayment cp
//             INNER JOIN plant_care.certificationpaymentfarm cpc 
//                 ON cp.id = cpc.paymentId
//             WHERE cp.userId = ? 
//                 AND cp.payType = 'Farm'
//                 AND cpc.farmId = ?
//             ORDER BY cpc.createdAt DESC
//             LIMIT 1
//         `;

//         db.plantcare.query(query, [userId, farmId], (error, results) => {
//             if (error) {
//                 console.error("Error fetching farm certificates:", error);
//                 reject(error);
//             } else {
//                 resolve(results);
//             }
//         });
//     });
// };



// In your certificateDao.js
// exports.createFarmQuestionnaire = async (farmId, userId) => {
//     return new Promise((resolve, reject) => {
//         // Add retry logic for deadlocks
//         const maxRetries = 3;
//         let retryCount = 0;

//         const executeWithRetry = () => {
//             // Step 1: Get paymentId
//             const getPaymentIdQuery = `
//                 SELECT paymentId
//                 FROM certificationpaymentfarm
//                 WHERE farmId = ?
//                 ORDER BY createdAt DESC
//                 LIMIT 1
//             `;

//             db.plantcare.query(getPaymentIdQuery, [farmId], (error, paymentResults) => {
//                 if (error) {
//                     // Check if it's a deadlock error
//                     if (error.code === 'ER_LOCK_DEADLOCK' && retryCount < maxRetries) {
//                         retryCount++;
//                         console.log(`Deadlock detected, retrying (${retryCount}/${maxRetries})...`);
//                         setTimeout(executeWithRetry, 100 * retryCount); // Exponential backoff
//                         return;
//                     }
//                     console.error("Error fetching paymentId:", error);
//                     return reject(error);
//                 }

//                 if (!paymentResults || paymentResults.length === 0) {
//                     return reject(new Error("No payment found for this farm"));
//                 }

//                 const paymentId = paymentResults[0].paymentId;

//                 // Check if questionnaire already exists
//                 const checkExistingQuery = `
//                     SELECT id FROM slavequestionnaire
//                     WHERE crtPaymentId = ?
//                     LIMIT 1
//                 `;

//                 db.plantcare.query(checkExistingQuery, [paymentId], (error, existingResults) => {
//                     if (error) {
//                         console.error("Error checking existing questionnaire:", error);
//                         return reject(error);
//                     }

//                     // If questionnaire already exists, return success
//                     if (existingResults && existingResults.length > 0) {
//                         console.log("Questionnaire already exists for paymentId:", paymentId);
//                         return resolve({
//                             success: true,
//                             message: "Questionnaire already exists",
//                             slaveQuestionnaireId: existingResults[0].id,
//                             farmId: farmId
//                         });
//                     }

//                     // Continue with original logic...
//                     const getCertificateIdQuery = `
//                         SELECT id, certificateId
//                         FROM certificationpayment
//                         WHERE id = ?
//                     `;

//                     db.plantcare.query(getCertificateIdQuery, [paymentId], (error, certResults) => {
//                         if (error) {
//                             console.error("Error fetching certificateId:", error);
//                             return reject(error);
//                         }

//                         if (!certResults || certResults.length === 0) {
//                             return reject(new Error("No certificate found for this payment"));
//                         }

//                         const certificateId = certResults[0].certificateId;

//                         // Rest of your insert logic...
//                         const slaveQuestionnaireQuery = `
//                             INSERT INTO slavequestionnaire
//                             (crtPaymentId, createdAt)
//                             VALUES (?, NOW())
//                         `;

//                         db.plantcare.query(slaveQuestionnaireQuery, [paymentId], (error, slaveResults) => {
//                             if (error) {
//                                 // Handle duplicate entry error gracefully
//                                 if (error.code === 'ER_DUP_ENTRY') {
//                                     console.log("Duplicate questionnaire entry, fetching existing...");
//                                     db.plantcare.query(checkExistingQuery, [paymentId], (err, results) => {
//                                         if (!err && results && results.length > 0) {
//                                             return resolve({
//                                                 success: true,
//                                                 message: "Questionnaire already exists",
//                                                 slaveQuestionnaireId: results[0].id,
//                                                 farmId: farmId
//                                             });
//                                         }
//                                     });
//                                     return;
//                                 }
//                                 console.error("Error creating slave questionnaire:", error);
//                                 return reject(error);
//                             }

//                             const slaveId = slaveResults.insertId;

//                             // Copy items...
//                             const copyItemsQuery = `
//                                 INSERT INTO slavequestionnaireitems
//                                 (slaveId, type, qNo, qEnglish, qSinhala, qTamil)
//                                 SELECT ?, type, qNo, qEnglish, qSinhala, qTamil
//                                 FROM questionnaire
//                                 WHERE certificateId = ?
//                                 ORDER BY qNo
//                             `;

//                             db.plantcare.query(copyItemsQuery, [slaveId, certificateId], (error, itemsResults) => {
//                                 if (error) {
//                                     console.error("Error copying questionnaire items:", error);
//                                     rollbackSlaveQuestionnaire(slaveId);
//                                     return reject(error);
//                                 }

//                                 resolve({
//                                     success: true,
//                                     paymentId: paymentId,
//                                     certificateId: certificateId,
//                                     slaveQuestionnaireId: slaveId,
//                                     itemsCopied: itemsResults.affectedRows,
//                                     farmId: farmId
//                                 });
//                             });
//                         });
//                     });
//                 });
//             });
//         };

//         // Start execution
//         executeWithRetry();

//         function rollbackSlaveQuestionnaire(slaveId) {
//             const deleteSlaveQuery = `DELETE FROM slavequestionnaire WHERE id = ?`;
//             db.plantcare.query(deleteSlaveQuery, [slaveId], (deleteError) => {
//                 if (deleteError) {
//                     console.error("Error rolling back slave questionnaire:", deleteError);
//                 } else {
//                     console.log("Rolled back slave questionnaire with ID:", slaveId);
//                 }
//             });
//         }
//     });
// };



// exports.getFarmCertificateTask = async (farmId, userId) => {
//     return new Promise((resolve, reject) => {
//         const query = `
//             SELECT 
//                 cpf.farmId,
//                 cpf.paymentId,
//                 cp.certificateId,
//                 cp.transactionId,
//                 cp.amount,
//                 cp.expireDate,
//                 cp.createdAt as paymentCreatedAt,
//                 cert.srtcomapnyId,
//                 cert.srtName,
//                 cert.srtNumber,
//                 cert.applicable,
//                 cert.accreditation,
//                 cert.serviceAreas,
//                 cert.price,
//                 cert.timeLine,
//                 cert.commission,
//                 cert.tearms,
//                 cert.scope,
//                 cert.logo,
//                 cert.noOfVisit,
//                 cert.modifyBy,
//                 cert.modifyDate,
//                 cert.createdAt as certificateCreatedAt,
//                 sq.id as slaveQuestionnaireId,
//                 sq.clusterFarmId,
//                 sq.createdAt as slaveQuestionnaireCreatedAt
//             FROM certificationpaymentfarm cpf
//             INNER JOIN certificationpayment cp ON cpf.paymentId = cp.id
//             INNER JOIN certificates cert ON cp.certificateId = cert.id
//             LEFT JOIN slavequestionnaire sq ON sq.crtPaymentId = cp.id
//             WHERE cpf.farmId = ? AND cp.userId = ?
//             ORDER BY cp.createdAt DESC
//         `;

//         db.plantcare.query(query, [farmId, userId], (error, results) => {
//             if (error) {
//                 console.error("Error fetching crop certificates:", error);
//                 return reject(error);
//             }

//             if (!results || results.length === 0) {
//                 return resolve([]);
//             }

//             // Get questionnaire items for each slave questionnaire
//             const certificatesWithItems = [];
//             let processedCount = 0;

//             results.forEach((certificate, index) => {
//                 if (!certificate.slaveQuestionnaireId) {
//                     // No questionnaire for this certificate
//                     certificatesWithItems.push({
//                         ...certificate,
//                         questionnaireItems: []
//                     });
//                     processedCount++;

//                     if (processedCount === results.length) {
//                         resolve(certificatesWithItems);
//                     }
//                     return;
//                 }

//                 // Fetch questionnaire items
//                 const itemsQuery = `
//                     SELECT 
//                         id,
//                         slaveId,
//                         type,
//                         qNo,
//                         qEnglish,
//                         qSinhala,
//                         qTamil,
//                         tickResult,
//                         officerTickResult,
//                         uploadImage,
//                         officerUploadImage,
//                         doneDate
//                     FROM slavequestionnaireitems
//                     WHERE slaveId = ?
//                     ORDER BY qNo ASC
//                 `;

//                 db.plantcare.query(itemsQuery, [certificate.slaveQuestionnaireId], (itemError, items) => {
//                     if (itemError) {
//                         console.error("Error fetching questionnaire items:", itemError);
//                         certificatesWithItems.push({
//                             ...certificate,
//                             questionnaireItems: []
//                         });
//                     } else {
//                         certificatesWithItems.push({
//                             ...certificate,
//                             questionnaireItems: items || []
//                         });
//                     }

//                     processedCount++;

//                     if (processedCount === results.length) {
//                         resolve(certificatesWithItems);
//                     }
//                 });
//             });
//         });
//     });
// };

exports.getFarmCertificateTask = async (farmId, userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                cpf.farmId,
                cpf.paymentId,
                cp.certificateId,
                cp.transactionId,
                cp.amount,
                cp.expireDate,
                cp.createdAt as paymentCreatedAt,
                cert.srtcomapnyId,
                cert.srtName,
                cert.srtNameSinhala,
                cert.srtNameTamil,
                cert.srtNumber,
                cert.applicable,
                cert.accreditation,
                cert.serviceAreas,
                cert.price,
                cert.timeLine,
                cert.commission,
                cert.tearms,
                cert.scope,
                cert.logo,
                cert.noOfVisit,
                cert.modifyBy,
                cert.modifyDate,
                cert.createdAt as certificateCreatedAt,
                sq.id as slaveQuestionnaireId,
                sq.clusterFarmId,
                sq.createdAt as slaveQuestionnaireCreatedAt,
                'farm' as certificateType
            FROM certificationpaymentfarm cpf
            INNER JOIN certificationpayment cp ON cpf.paymentId = cp.id
            INNER JOIN certificates cert ON cp.certificateId = cert.id
            LEFT JOIN slavequestionnaire sq ON sq.crtPaymentId = cp.id
            WHERE cpf.farmId = ? AND cp.userId = ?
            ORDER BY cp.createdAt DESC
        `;

        db.plantcare.query(query, [farmId, userId], (error, results) => {
            if (error) {
                console.error("Error fetching farm certificates:", error);
                return reject(error);
            }

            if (!results || results.length === 0) {
                return resolve([]);
            }

            processQuestionnaireItems(results, resolve, reject);
        });
    });
};

// New function to get cluster certificates
exports.getClusterCertificateTask = async (farmId, userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                fcf.farmId,
                fcf.clusterId,
                fc.clsName,
                fc.certificateId,
                cert.srtcomapnyId,
                cert.srtName,
                cert.srtNameSinhala,
                cert.srtNameTamil,
                cert.srtNumber,
                cert.applicable,
                cert.accreditation,
                cert.serviceAreas,
                cert.price,
                cert.timeLine,
                cert.commission,
                cert.tearms,
                cert.scope,
                cert.logo,
                cert.noOfVisit,
                cert.modifyBy,
                cert.modifyDate,
                certpay.clusterId,
                certpay.expireDate,
                certpay.createdAt,
                cert.createdAt as certificateCreatedAt,
                sq.id as slaveQuestionnaireId,
                sq.clusterFarmId,
                sq.crtPaymentId,
                sq.createdAt as slaveQuestionnaireCreatedAt,
                sq.isCluster,
                'cluster' as certificateType
            FROM farmclusterfarmers fcf
            INNER JOIN farmcluster fc ON fcf.clusterId = fc.id
            INNER JOIN certificates cert ON fc.certificateId = cert.id
            INNER JOIN certificationpayment certpay ON fc.id = certpay.clusterId
            LEFT JOIN slavequestionnaire sq ON sq.clusterFarmId = fcf.id AND sq.isCluster = 1
            WHERE fcf.farmId = ?
            ORDER BY fc.id ASC, sq.createdAt DESC
        `;

        db.plantcare.query(query, [farmId], (error, results) => {
            if (error) {
                console.error("Error fetching cluster certificates:", error);
                return reject(error);
            }

            if (!results || results.length === 0) {
                return resolve([]);
            }

            // Group results by cluster to handle multiple questionnaires per cluster
            const clusterMap = new Map();

            results.forEach(row => {
                const clusterKey = `${row.clusterId}_${row.certificateId}`;

                if (!clusterMap.has(clusterKey)) {
                    clusterMap.set(clusterKey, {
                        ...row,
                        questionnaires: []
                    });
                }

                // Add questionnaire if it exists and not already added
                if (row.slaveQuestionnaireId) {
                    const cluster = clusterMap.get(clusterKey);
                    const questionnaireExists = cluster.questionnaires.some(
                        q => q.slaveQuestionnaireId === row.slaveQuestionnaireId
                    );

                    if (!questionnaireExists) {
                        cluster.questionnaires.push({
                            slaveQuestionnaireId: row.slaveQuestionnaireId,
                            clusterFarmId: row.clusterFarmId,
                            crtPaymentId: row.crtPaymentId,
                            slaveQuestionnaireCreatedAt: row.slaveQuestionnaireCreatedAt,
                            isCluster: row.isCluster
                        });
                    }
                }
            });

            const uniqueCertificates = Array.from(clusterMap.values());

            // Process questionnaire items for all certificates
            processMultipleClusterQuestionnaires(uniqueCertificates, resolve, reject);
        });
    });
};


function processMultipleClusterQuestionnaires(certificates, resolve, reject) {
    const certificatesWithItems = [];
    let processedCount = 0;

    if (certificates.length === 0) {
        return resolve([]);
    }

    certificates.forEach((certificate) => {
        const questionnaires = certificate.questionnaires || [];

        // Remove questionnaires array from certificate object
        const { questionnaires: _, ...certWithoutQuestionnaires } = certificate;

        if (questionnaires.length === 0) {
            certificatesWithItems.push({
                ...certWithoutQuestionnaires,
                slaveQuestionnaireId: null,
                questionnaireItems: []
            });
            processedCount++;

            if (processedCount === certificates.length) {
                resolve(certificatesWithItems);
            }
            return;
        }

        // Process each questionnaire for this cluster
        let questionnaireProcessedCount = 0;

        questionnaires.forEach((questionnaire) => {
            const itemsQuery = `
                SELECT 
                    id,
                    slaveId,
                    type,
                    qNo,
                    qEnglish,
                    qSinhala,
                    qTamil,
                    tickResult,
                    officerTickResult,
                    uploadImage,
                    officerUploadImage,
                    doneDate
                FROM slavequestionnaireitems
                WHERE slaveId = ?
                ORDER BY qNo ASC
            `;

            db.plantcare.query(itemsQuery, [questionnaire.slaveQuestionnaireId], (itemError, items) => {
                if (itemError) {
                    console.error("Error fetching questionnaire items:", itemError);
                    certificatesWithItems.push({
                        ...certWithoutQuestionnaires,
                        slaveQuestionnaireId: questionnaire.slaveQuestionnaireId,
                        clusterFarmId: questionnaire.clusterFarmId,
                        crtPaymentId: questionnaire.crtPaymentId,
                        slaveQuestionnaireCreatedAt: questionnaire.slaveQuestionnaireCreatedAt,
                        isCluster: questionnaire.isCluster,
                        questionnaireItems: []
                    });
                } else {
                    certificatesWithItems.push({
                        ...certWithoutQuestionnaires,
                        slaveQuestionnaireId: questionnaire.slaveQuestionnaireId,
                        clusterFarmId: questionnaire.clusterFarmId,
                        crtPaymentId: questionnaire.crtPaymentId,
                        slaveQuestionnaireCreatedAt: questionnaire.slaveQuestionnaireCreatedAt,
                        isCluster: questionnaire.isCluster,
                        questionnaireItems: items || []
                    });
                }

                questionnaireProcessedCount++;

                if (questionnaireProcessedCount === questionnaires.length) {
                    processedCount++;

                    if (processedCount === certificates.length) {
                        resolve(certificatesWithItems);
                    }
                }
            });
        });
    });
}

// Keep the original processQuestionnaireItems for farm certificates
function processQuestionnaireItems(results, resolve, reject) {
    const certificatesWithItems = [];
    let processedCount = 0;

    results.forEach((certificate) => {
        if (!certificate.slaveQuestionnaireId) {
            certificatesWithItems.push({
                ...certificate,
                questionnaireItems: []
            });
            processedCount++;

            if (processedCount === results.length) {
                resolve(certificatesWithItems);
            }
            return;
        }

        const itemsQuery = `
            SELECT 
                id,
                slaveId,
                type,
                qNo,
                qEnglish,
                qSinhala,
                qTamil,
                tickResult,
                officerTickResult,
                uploadImage,
                officerUploadImage,
                doneDate
            FROM slavequestionnaireitems
            WHERE slaveId = ?
            ORDER BY qNo ASC
        `;

        db.plantcare.query(itemsQuery, [certificate.slaveQuestionnaireId], (itemError, items) => {
            if (itemError) {
                console.error("Error fetching questionnaire items:", itemError);
                certificatesWithItems.push({
                    ...certificate,
                    questionnaireItems: []
                });
            } else {
                certificatesWithItems.push({
                    ...certificate,
                    questionnaireItems: items || []
                });
            }

            processedCount++;

            if (processedCount === results.length) {
                resolve(certificatesWithItems);
            }
        });
    });
}


exports.removeQuestionItemCompletion = async (itemId, itemType) => {
    return new Promise((resolve, reject) => {
        let query;
        let params;

        if (itemType === 'Tick Off') {
            query = `
                UPDATE slavequestionnaireitems 
                SET tickResult = 0, doneDate = NULL
                WHERE id = ?
            `;
            params = [itemId];
        } else if (itemType === 'Photo Proof') {
            query = `
                UPDATE slavequestionnaireitems 
                SET uploadImage = NULL, doneDate = NULL
                WHERE id = ?
            `;
            params = [itemId];
        } else {
            return reject(new Error('Invalid item type'));
        }

        db.plantcare.query(query, params, (err, result) => {
            if (err) {
                reject(new Error('Error removing questionnaire item completion: ' + err.message));
            } else {
                if (result.affectedRows === 0) {
                    reject(new Error('No questionnaire item found with the given ID'));
                } else {
                    resolve({
                        success: true,
                        message: 'Questionnaire item completion removed successfully',
                        affectedRows: result.affectedRows
                    });
                }
            }
        });
    });
};


exports.getCropNames = async (cropId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                occ.id AS ongoingCropId,
                occ.cropCalendar AS cropCalendarId,
                cc.id AS cropCalenderId,
                cc.cropVarietyId,
                cv.id AS cropVarietyId,
                cv.varietyNameEnglish,
                cv.varietyNameSinhala,
                cv.varietyNameTamil,
                cv.cropGroupId
            FROM plant_care.ongoingcultivationscrops occ
            INNER JOIN plant_care.cropcalender cc 
                ON occ.cropCalendar = cc.id
            INNER JOIN plant_care.cropvariety cv 
                ON cc.cropVarietyId = cv.id
            WHERE occ.id = ?
            ORDER BY cv.varietyNameEnglish ASC
        `;

        db.plantcare.query(query, [cropId], (error, results) => {
            if (error) {
                console.error("Error fetching crop names:", error);
                reject(error);
            } else {
                console.log("Query results:", results);
                resolve(results);
            }
        });
    });
};



// dao.js - Update query to filter by farmId
exports.getAllFarmByUserId = async (userId, farmId) => {
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
                COALESCE(COUNT(DISTINCT occ.id), 0) as farmCropCount,
                CASE 
                    WHEN cpf.farmId IS NOT NULL OR fcf.farmId IS NOT NULL THEN 'Certificate'
                    ELSE 'NoCertificate'
                END as certificationStatus
            FROM farms f
            LEFT JOIN ongoingcultivationscrops occ ON f.id = occ.farmId
            LEFT JOIN certificationpaymentfarm cpf ON f.id = cpf.farmId
            LEFT JOIN farmclusterfarmers fcf ON f.id = fcf.farmId
            WHERE f.userId = ? AND f.id = ?  -- Added farmId filter
            GROUP BY f.id, f.userId, f.farmName, f.farmIndex, f.extentha, f.extentac, f.extentp, 
                     f.district, f.plotNo, f.street, f.city, f.staffCount, f.appUserCount, f.imageId, 
                     f.isBlock, cpf.farmId, fcf.farmId
            ORDER BY f.id DESC
        `;
        db.plantcare.query(query, [userId, farmId], (error, results) => { // Added farmId parameter
            if (error) {
                console.error("Error fetching farms:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};