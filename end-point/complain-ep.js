const asyncHandler = require("express-async-handler");
const complainDao = require("../dao/complain-dao");
const {
    createComplain
} = require('../validations/complain-validation');
const { Console } = require("winston/lib/winston/transports");

exports.createComplain = asyncHandler(async (req, res) => {

    try {
        const farmerId = req.user.id;
        const input = { ...req.body, farmerId };
        const today = new Date();
        const YYMMDD = today.toISOString().slice(2, 10).replace(/-/g, '');
        const datePrefix = `GC${YYMMDD}`;

        const { value, error } = createComplain.validate(input);
        const complaintsOnDate = await complainDao.countComplaintsByDate(today);
        const referenceNumber = `${datePrefix}${String(complaintsOnDate + 1).padStart(4, '0')}`;

        const { language, complain, category } = value;
        const status = "Opened";

        const newComplainId = await complainDao.createComplain(
            farmerId,
            language,
            complain,
            category,
            status,
            referenceNumber
        );

        res.status(201).json({
            status: "success",
            message: "Complain created successfully.",
            complainId: newComplainId,
        });
    } catch (err) {
        console.error("Error creating complain:", err);

        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
        });
    }
});

exports.getComplains = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const complains = await complainDao.getAllComplaintsByUserId(userId);

        if (!complains || complains.length === 0) {
            return res.status(404).json({ message: "No complaints found" });
        }

        res.status(200).json(complains);
    } catch (error) {
        console.error("Error fetching complaints:", error);
        res.status(500).json({ message: "Failed to fetch complaints" });
    }
});

exports.getComplainReplyByid = asyncHandler(async (req, res) => {
    try {
        const reply = await complainDao.getAllComplaintsByUserId(id);

        if (!complains || complains.length === 0) {
            return res.status(404).json({ message: "No complaints found" });
        }

        res.status(200).json(reply);
    } catch (error) {
        console.error("Error fetching complaints:", error);
        res.status(500).json({ message: "Failed to fetch complaints" });
    }
});

exports.getComplainCategory = asyncHandler(async (req, res) => {
    try {
        const categories = await complainDao.getComplainCategories();

        if (!categories || categories.length === 0) {
            return res.status(404).json({ message: "No categories found" });
        }

        res.status(200).json({ status: "success", data: categories });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ message: "Failed to fetch categories" });
    }
});