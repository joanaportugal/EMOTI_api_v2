const express = require("express");

const activitiesController = require("../controllers/activities.controller");
const authController = require("../controllers/auth.controller");

let router = express.Router();

router.route("/")
  .get(authController.verifyToken, activitiesController.createOne)
  .post(authController.verifyToken, activitiesController.findAll);

router
  .route("/:activity_id")
  .get(authController.verifyToken, activitiesController.findOne)
  .patch(authController.verifyToken, activitiesController.updateOne)
  .delete(authController.verifyToken, activitiesController.deleteOne);

router
  .route("/:activity_id/children")
  .post(authController.verifyToken, activitiesController.giveActivity)
  .patch(authController.verifyToken, activitiesController.suggestActivity);

router.all("*", function (req, res) {
  res.status(404).json({
    message: "ACTIVITIES: what???"
  });
});

module.exports = router;