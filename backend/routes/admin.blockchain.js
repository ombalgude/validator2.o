const express = require("express");
const adminRouter = express.Router();
const { auth, authorize } = require("../middleware/auth");
const { addDocument } = require("../controllers/admin.controller");
const { uploadSingle } = require("../middleware/upload");

<<<<<<< HEAD
adminRouter.post("/add-document", uploadSingle, addDocument);
=======
adminRouter.post("/add-document", auth, authorize("admin"), addDocument);
>>>>>>> 95f0fbbcfbc1d1dbca177a972cbcd8e93cc1f4fe

module.exports = adminRouter;
