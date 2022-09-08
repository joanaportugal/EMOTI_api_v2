const express = require("express");

const activitiesController = require("../controllers/activities.controller");
const authController = require("../controllers/auth.controller");

let router = express.Router();

router.route("/")
  .get(authController.verifyToken, activitiesController.findAll)
  .post(authController.verifyToken, activitiesController.createOne);

router.route("/top")
  .get(authController.verifyToken, activitiesController.topActivities);

router
  .route("/:activity_id")
  .patch(authController.verifyToken, activitiesController.updateOne)
  .delete(authController.verifyToken, activitiesController.deleteOne);

router.route("/:activity_id/permission")
  .patch(authController.verifyToken, activitiesController.acceptPersonalized)
  .delete(authController.verifyToken, activitiesController.rejectPersonalized);

router
  .route("/:activity_id/children")
  .post(authController.verifyToken, activitiesController.giveActivity)
  .patch(authController.verifyToken, activitiesController.suggestActivity);

router
  .route("/:activity_id/children/:child_id")
  .patch(authController.verifyToken, activitiesController.removeVisibility)

router.all("*", function (req, res) {
  res.status(404).json({
    message: "ACTIVITIES: what???"
  });
});

module.exports = router;