const express = require("express");
const usersController = require("../controllers/users.controller");
const authController = require("../controllers/auth.controller");

let router = express.Router();

router.route("/").post(usersController.register);

router.route("/login").post(usersController.login);

router.route("/profile").get(authController.verifyToken, usersController.findOne)

router.all("*", function (req, res) {
    res.status(404).json({
        message: "Users: what???"
    });
});

module.exports = router;