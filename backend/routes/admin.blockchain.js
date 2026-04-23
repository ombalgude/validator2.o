const express = require("express");
const adminRouter = express.Router();
const { auth, authorize } = require("../middleware/auth");
const { addDocument } = require("../controllers/admin.controller");
const { uploadSingle } = require("../middleware/upload");

adminRouter.post("/add-document", uploadSingle, addDocument);

module.exports = adminRouter;
