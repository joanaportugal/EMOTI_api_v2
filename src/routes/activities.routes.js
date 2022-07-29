const express = require("express");

const activitiesController = require("../controllers/activities.controller");
const authController = require("../controllers/auth.controller");

let router = express.Router();

router.route("/")
  .get(authController.verifyToken, activitiesController.findAll)
  .post(authController.verifyToken, activitiesController.createOne);

router
  .route("/:activity_id")
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