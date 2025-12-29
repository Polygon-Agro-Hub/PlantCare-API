const db = require("../startup/database");


exports.getCrops = async (farmId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                f.*,
                cc.id as cropCalendarId,
                cv.id as cropVarietyId,
              
                cg.id as cropGroupId,
                cg.cropNameEnglish,
                cg.cropNameSinhala,
                cg.cropNameTamil,
                occ.ongoingCultivationId,
                occ.cropCalendar as cropCalendarId,
                oc.userId
            FROM farms f
            LEFT JOIN ongoingcultivations oc ON   oc.userId
            LEFT JOIN ongoingcultivationscrops occ ON oc.id = occ.ongoingCultivationId
            LEFT JOIN cropcalender cc ON occ.cropCalendar = cc.id
            LEFT JOIN cropvariety cv ON cc.cropVarietyId = cv.id
            LEFT JOIN cropgroup cg ON cv.cropGroupId = cg.id
            WHERE oc.userId = ?
            ORDER BY occ.ongoingCultivationId ASC, occ.cropCalendar ASC, occ.farmId
        `;

        db.plantcare.query(query, [farmId], (error, results) => {
            if (error) {
                console.error("Error fetching farms with crops:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};


exports.getFarmerDetails = async (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT id,firstName,lastName,phoneNumber,NICnumber,membership,activeStatus, houseNo,streetName,  city,district
        FROM users 
        WHERE id = ?

      `;
        db.plantcare.query(query, [userId], (error, results) => {
            if (error) {
                console.error("Error fetching farmer:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

exports.createInvestmentRequest = async (requestData) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO investmentrequest
            (cropId, farmerId, extentha, extentac, extentp, investment, expectedYield, startDate, nicFront, nicBack)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            requestData.cropId,
            requestData.farmerId,
            requestData.extentha,
            requestData.extentac,
            requestData.extentp,
            requestData.investment,
            requestData.expectedYield,
            requestData.startDate,
            requestData.nicFront,
            requestData.nicBack
        ];

        db.investments.query(query, values, (error, results) => {
            if (error) {
                console.error("Error creating investment request:", error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};