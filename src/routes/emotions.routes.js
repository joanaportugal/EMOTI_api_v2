const express = require("express");
const emotionController = require("../controllers/emotions.controller");
const authController = require("../controllers/auth.controller");

let router = express.Router();

router
    .route("/")
    .get(authController.verifyToken, emotionController.findAll)
    .post(authController.verifyToken, emotionController.create);

router
    .route("/:emotion_id")
    .delete(authController.verifyToken, emotionController.deleteOne);

router.all("*", function (req, res) {
    return res.status(404).json({
        message: "Emotions: what???"
    });
});

module.exports = router;