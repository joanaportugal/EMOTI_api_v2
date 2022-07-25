const express = require("express");
const badgesController = require("../controllers/badges.controller");
const authController = require("../controllers/auth.controller");

let router = express.Router();

router
    .route("/")
    .get(authController.verifyToken, badgesController.findAll)
    .post(authController.verifyToken, badgesController.create);

router
    .route("/:badge_id")
    .delete(authController.verifyToken, badgesController.deleteOne);

router.all("*", function (req, res) {
    return res.status(404).json({
        message: "Badges: what???"
    });
});

module.exports = router;