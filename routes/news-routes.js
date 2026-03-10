const express = require("express");
const router = express.Router();
const news = require("../end-point/news-ep");

router.get("/get-all-news",news.getAllNews)

router.get("/get-news/:newsId",news.getNewsById)

module.exports =router

