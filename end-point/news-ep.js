const asyncHandler = require("express-async-handler");
const {
  getAllNewsSchema,
  getNewsByIdSchema,
} = require("../validations/news-validation");
const { getAllNewsData, getNewsByIdData } = require("../dao/news-dao");

exports.getAllNews = asyncHandler(async (req, res) => {
  try {
    const { error } = getAllNewsSchema.validate(req.query);
    if (error) {
      return res
        .status(400)
        .json({ status: "error", message: error.details[0].message });
    }

    const results = await getAllNewsData();
    res.status(200).json(results);
  } catch (err) {
    console.error("Error getAllNews:", err);
    res.status(500).json({ message: "Internal Server Error!" });
  }
});

exports.getNewsById = asyncHandler(async (req, res) => {
  try {
    const { error } = getNewsByIdSchema.validate(req.params);
    if (error) {
      return res
        .status(400)
        .json({ status: "error", message: error.details[0].message });
    }

    const newsId = req.params.newsId;

    const results = await getNewsByIdData(newsId);

    if (results.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "No news found for the given ID" });
    }

    res.status(200).json([results[0]]);
  } catch (err) {
    console.error("Error getNewsById:", err);
    res.status(500).json({ message: "Internal Server Error!" });
  }
});
