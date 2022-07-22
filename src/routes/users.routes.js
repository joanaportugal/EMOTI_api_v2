const express = require("express");
const usersController = require("../controllers/users.controller");
const authController = require("../controllers/auth.controller");

let router = express.Router();

router.route("/")
    .get(authController.verifyToken, usersController.findAll)
    .post(usersController.register);

router.route("/login").post(usersController.login);

router.route("/profile")
    .get(authController.verifyToken, usersController.getProfile)
    .patch(authController.verifyToken, usersController.updateProfile);

router.route("/admin").post(authController.verifyToken, usersController.createOneAdmin);

router.route("/children")
    .get(authController.verifyToken, usersController.findRelations)
    .post(authController.verifyToken, usersController.createRelation)

router.route("/:user_id")
    .get(authController.verifyToken, usersController.findOne)
    .patch(authController.verifyToken, usersController.updateOne)
    .delete(authController.verifyToken, usersController.deleteOne);

router.all("*", function (req, res) {
    res.status(404).json({
        message: "Users: what???"
    });
});

module.exports = router;