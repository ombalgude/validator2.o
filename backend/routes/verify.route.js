const express = require("express");
const verifyRouter = express.Router();
const { verifyDocument } = require("../controllers/verify.controller");

verifyRouter.post("/", verifyDocument);

module.exports = verifyRouter;