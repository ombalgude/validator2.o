const express = require("express");
const verifyRouter = express.Router();
const { verifyDocument } = require("../controllers/verify.controller");
const { uploadSingle } = require("../middleware/upload");

verifyRouter.post("/", uploadSingle, verifyDocument);

module.exports = verifyRouter;