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

/* OLD PROJECT
router
  .route("/")
  .get(authController.verifyToken, classesController.findAll)
  .post(authController.verifyToken, classesController.createClass);

router
  .route("/requests")
  .get(authController.verifyToken, classesController.findChild)
  .post(authController.verifyToken, classesController.createRequest);

router
  .route("/requests/:usernameChild")
  .get(authController.verifyToken, classesController.findRequest)
  .put(authController.verifyToken, classesController.acceptRequest)
  .delete(authController.verifyToken, classesController.removeRequest);

router
  .route("/children")
  .get(authController.verifyToken, classesController.findAllStudents);

router
  .route("/children/:usernameChild")
  .get(authController.verifyToken, classesController.getClassFromChild);

router
  .route("/:className")
  .delete(authController.verifyToken, classesController.removeClass);

router
  .route("/:className/children/:usernameChild")
  .put(authController.verifyToken, classesController.alterStudentClass)
  .delete(authController.verifyToken, classesController.removeStudent);
   */

router.all("*", function (req, res) {
  return res.status(404).json({
    message: "Classes: what???"
  });
});

module.exports = router;