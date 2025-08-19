const asyncHandler = require("express-async-handler");
const { getAllMarketSchema } = require("../validations/marketPrice-validation");
const { getAllMarketData } = require("../dao/marketPrice-dao");

// exports.getAllMarket = asyncHandler(async (req, res) => {
//   try {
//     const userId = req.user.ownerId;
//     const staffId = req.user.id;
//     const farmId = req.user.farmId;
//     const { error } = getAllMarketSchema.validate(req.query);
//     if (error) {
//       return res
//         .status(400)
//         .json({ status: "error", message: error.details[0].message });
//     }

//     const results = await getAllMarketData(userId, staffId, farmId);

//     const groupedData = {};
//     results.forEach((row) => {
//       if (row.price == null || isNaN(row.price)) return;

//       const varietyId = row.varietyId;
//       if (!groupedData[varietyId]) {
//         groupedData[varietyId] = {
//           varietyId,
//           varietyNameEnglish: row.varietyNameEnglish,
//           varietyNameSinhala: row.varietyNameSinhala,
//           varietyNameTamil: row.varietyNameTamil,
//           bgColor: row.bgColor,
//           image: row.image,
//           totalPrice: 0,
//           count: 0,
//         };
//       }
//       groupedData[varietyId].totalPrice += parseFloat(row.price);
//       groupedData[varietyId].count += 1;
//     });

//     const formattedResponse = Object.values(groupedData).map((item) => ({
//       varietyId: item.varietyId,
//       varietyNameEnglish: item.varietyNameEnglish,
//       varietyNameSinhala: item.varietyNameSinhala,
//       varietyNameTamil: item.varietyNameTamil,
//       bgColor: item.bgColor,
//       image: item.image,
//       averagePrice: item.count > 0 ? item.totalPrice / item.count : 0,
//     }));

//     res.status(200).json(formattedResponse);
//   } catch (err) {
//     console.error("Error getAllMarket:", err);
//     res.status(500).json({ message: "Internal Server Error!" });
//   }
// });

exports.getAllMarket = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.ownerId;
    const staffId = req.user.id;
    const farmId = req.user.farmId;
    const { error } = getAllMarketSchema.validate(req.query);
    if (error) {
      return res
        .status(400)
        .json({ status: "error", message: error.details[0].message });
    }

    // Determine if user is owner (userId === staffId) or staff
    const isOwner = userId === staffId;
    const results = await getAllMarketData(userId, isOwner ? null : farmId);

    const groupedData = {};
    results.forEach((row) => {
      if (row.price == null || isNaN(row.price)) return;

      const varietyId = row.varietyId;
      if (!groupedData[varietyId]) {
        groupedData[varietyId] = {
          varietyId,
          varietyNameEnglish: row.varietyNameEnglish,
          varietyNameSinhala: row.varietyNameSinhala,
          varietyNameTamil: row.varietyNameTamil,
          bgColor: row.bgColor,
          image: row.image,
          totalPrice: 0,
          count: 0,
        };
      }
      groupedData[varietyId].totalPrice += parseFloat(row.price);
      groupedData[varietyId].count += 1;
    });

    const formattedResponse = Object.values(groupedData).map((item) => ({
      varietyId: item.varietyId,
      varietyNameEnglish: item.varietyNameEnglish,
      varietyNameSinhala: item.varietyNameSinhala,
      varietyNameTamil: item.varietyNameTamil,
      bgColor: item.bgColor,
      image: item.image,
      averagePrice: item.count > 0 ? item.totalPrice / item.count : 0,
    }));

    res.status(200).json(formattedResponse);
  } catch (err) {
    console.error("Error getAllMarket:", err);
    res.status(500).json({ message: "Internal Server Error!" });
  }
});


