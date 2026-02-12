const transactionDAO = require('../dao/report-dao');


exports.getUserWithBankDetails = async (req, res) => {

  const { userId, centerId, companyId } = req.params;


  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {

    const rows = await transactionDAO.getUserWithBankDetailsById(userId, centerId, companyId);


    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];

    let qrCodeBase64 = '';
    if (user.farmerQr) {
      qrCodeBase64 = `data:image/png;base64,${user.farmerQr.toString('base64')}`;
      const qrCodePath = user.farmerQr.toString();


      try {
        if (fs.existsSync(qrCodePath)) {
          const qrCodeData = fs.readFileSync(qrCodePath);
          qrCodeBase64 = `data:image/png;base64,${qrCodeData.toString('base64')}`;
          
        } else {
          console.warn('QR code file not found at:', qrCodePath);
        }
      } catch (err) {
        console.error('Error processing QR code file:', err.message);
      }
    }

    const response = {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      NICnumber: user.NICnumber,
      profileImage: user.profileImage,
      qrCode: qrCodeBase64,  // Base64 QR code image
      address: user.address,
      accNumber: user.accNumber,
      accHolderName: user.accHolderName,
      bankName: user.bankName,
      branchName: user.branchName,
      companyNameEnglish: user.companyNameEnglish,
      centerName: user.centerName,
      createdAt: user.createdAt
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user with bank details: " + error.message });
  }
};

exports.GetFarmerReportDetails = async (req, res) => {
  const { userId, createdAt, farmerId } = req.params;


  try {
    if (!userId || !createdAt || !farmerId) {
      return res.status(400).json({ error: 'userId, createdAt, and farmerId parameters are required.' });
    }

    const cropDetails = await transactionDAO.GetFarmerReportDetailsDao(userId, createdAt, farmerId);
    res.status(200).json(cropDetails);
  } catch (error) {
    console.error('Error fetching crop details:', error);
    res.status(500).json({ error: 'An error occurred while fetching crop details' });
  }
};



exports.getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;


    const transactions = await transactionDAO.getTransactionHistoryByUserId(userId, limit, offset);
    const totalCount = await transactionDAO.getTransactionCountByUserId(userId);

    const formattedTransactions = transactions.map(transaction => ({
      registeredFarmerId: transaction.registeredFarmerId,
      collectionOfficerId: transaction.collectionOfficerId,
      invNo: transaction.invNo,
      userId: transaction.userId,
      firstName: transaction.firstName,
      lastName: transaction.lastName,
      phoneNumber: transaction.phoneNumber,
      profileImage: transaction.profileImage,
      address: transaction.address,
      NICnumber: transaction.NICnumber,
      totalAmount: parseFloat(transaction.totalAmount || 0).toFixed(2),
      cropRecordCount: transaction.cropRecordCount,
      accountNumber: transaction.accountNumber,
      accountHolderName: transaction.accountHolderName,
      bankName: transaction.bankName,
      branchName: transaction.branchName,
      empId: transaction.empId,
      centerId: transaction.centerId,
      companyId: transaction.companyId,
      transactionDate: transaction.transactionDate
    }));

    return res.status(200).json({
      success: true,
      count: formattedTransactions.length,
      total: totalCount,
      hasMore: (offset + limit) < totalCount,
      data: formattedTransactions
    });
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving transaction history',
      error: error.message
    });
  }
};