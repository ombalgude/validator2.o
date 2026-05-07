const express = require("express");
const adminRouter = express.Router();
const { auth, authorize } = require("../middleware/auth");
const { addDocument, revokeDocument } = require("../controllers/admin.controller");
const { uploadSingle } = require("../middleware/upload");

adminRouter.post("/add-document", auth, authorize("admin"), uploadSingle, addDocument);
adminRouter.post("/revoke-document", auth, authorize("admin"), revokeDocument);

module.exports = adminRouter;
