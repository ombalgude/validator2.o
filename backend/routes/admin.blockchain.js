const express = require("express");
const adminRouter = express.Router();
const { addDocument } = require("../controllers/admin.controller");

adminRouter.post("/add-document", addDocument);

module.exports = adminRouter;