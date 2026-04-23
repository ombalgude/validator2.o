const express = require("express");
const adminRouter = express.Router();
const { addDocument } = require("../controllers/admin.controller");
const { uploadSingle } = require("../middleware/upload");

adminRouter.post("/add-document", uploadSingle, addDocument);

module.exports = adminRouter;