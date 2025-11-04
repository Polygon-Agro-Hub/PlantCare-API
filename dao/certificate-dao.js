const db = require("../startup/database");


exports.getFarmsCertificate = async () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                id,
                srtcomapnyId,
                srtName,
                srtNumber,
                applicable,
                accreditation,
                serviceAreas,
                price,
                timeLine,
                commission,
                tearms,
                scope,
                logo,
                noOfVisit,
                modifyBy,
                modifyDate,
                createdAt
            FROM certificates
            WHERE applicable = 'For Farm'
            ORDER BY id ASC
        `;

        db.plantcare.query(query, (error, results) => {
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

            // Now insert into certificationpaymentfarm table
            const farmLinkQuery = `
                INSERT INTO certificationpaymentfarm 
                (paymentId, farmId, createdAt)
                VALUES (?, ?, NOW())
            `;

            const farmLinkValues = [
                paymentId,
                paymentData.farmId
            ];

            console.log("Linking payment to farm:", farmLinkValues);

            db.plantcare.query(farmLinkQuery, farmLinkValues, (error, farmLinkResults) => {
                if (error) {
                    console.error("Error linking payment to farm:", error);
                    console.error("Query:", farmLinkQuery);
                    console.error("Values:", farmLinkValues);

                    // Try to delete the payment record if farm link fails
                    const deleteQuery = `DELETE FROM certificationpayment WHERE id = ?`;
                    db.plantcare.query(deleteQuery, [paymentId], (deleteError) => {
                        if (deleteError) {
                            console.error("Error rolling back payment:", deleteError);
                        }
                    });

                    return reject(error);
                }

                console.log("Payment linked to farm successfully");
                resolve({
                    paymentId: paymentId,
                    farmLinkId: farmLinkResults.insertId
                });
            });
        });
    });
};


//crop

exports.getCropsCertificate = async () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                id,
                srtcomapnyId,
                srtName,
                srtNumber,
                applicable,
                accreditation,
                serviceAreas,
                price,
                timeLine,
                commission,
                tearms,
                scope,
                logo,
                noOfVisit,
                modifyBy,
                modifyDate,
                createdAt
            FROM certificates
            WHERE applicable = 'For Selected Crops'
            ORDER BY id ASC
        `;

        db.plantcare.query(query, (error, results) => {
            if (error) {
                console.error("Error fetching crop certificates:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

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

            // Now insert into certificationpaymentfarm table
            const farmLinkQuery = `
                INSERT INTO certificationpaymentcrop 
                (paymentId, cropId, createdAt)
                VALUES (?, ?, NOW())
            `;

            const farmLinkValues = [
                paymentId,
                paymentData.cropId
            ];

            console.log("Linking payment to farm:", farmLinkValues);

            db.plantcare.query(farmLinkQuery, farmLinkValues, (error, farmLinkResults) => {
                if (error) {
                    console.error("Error linking payment to farm:", error);
                    console.error("Query:", farmLinkQuery);
                    console.error("Values:", farmLinkValues);

                    // Try to delete the payment record if farm link fails
                    const deleteQuery = `DELETE FROM certificationpayment WHERE id = ?`;
                    db.plantcare.query(deleteQuery, [paymentId], (deleteError) => {
                        if (deleteError) {
                            console.error("Error rolling back payment:", deleteError);
                        }
                    });

                    return reject(error);
                }

                console.log("Payment linked to farm successfully");
                resolve({
                    paymentId: paymentId,
                    farmLinkId: farmLinkResults.insertId
                });
            });
        });
    });
};




