const express = require("express");
const adminRouter = express.Router();
const { auth, authorize } = require("../middleware/auth");
const { addDocument } = require("../controllers/admin.controller");

adminRouter.post("/add-document", auth, authorize("admin"), addDocument);

module.exports = adminRouter;
