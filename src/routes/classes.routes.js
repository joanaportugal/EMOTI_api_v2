const express = require("express");
const classesController = require("../controllers/classes.controller");
const authController = require("../controllers/auth.controller");

let router = express.Router();

router.route("/")
  .get(authController.verifyToken, classesController.findClasses)
  .post(authController.verifyToken, classesController.createClass);

router.route("/:class_id")
  .patch(authController.verifyToken, classesController.updateClass)
  .delete(authController.verifyToken, classesController.deleteClass);

router
  .route("/requests")
  .get(authController.verifyToken, classesController.findChild)
  .post(authController.verifyToken, classesController.createRequest);

router
  .route("/requests/:user_id")
  .get(authController.verifyToken, classesController.findRequests)
  .put(authController.verifyToken, classesController.acceptRequest)
  .delete(authController.verifyToken, classesController.removeRequest);

router
  .route("/children")
  .get(authController.verifyToken, classesController.findAllStudents);

router
  .route("/children/:user_id")
  .get(authController.verifyToken, classesController.findChildClasses);

router
  .route("/:class_id/children/:user_id")
  .put(authController.verifyToken, classesController.updateChildClass)
  .delete(authController.verifyToken, classesController.removeChildClass);

router.all("*", function (req, res) {
  return res.status(404).json({
    message: "Classes: what???"
  });
});

module.exports = router;