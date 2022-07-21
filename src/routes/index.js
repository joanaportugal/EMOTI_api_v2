const express = require("express");

const usersRoute = require("./users.routes");
const authController = require("../controllers/auth.controller");

let router = express.Router();

router.use((req, res, next) => {
    const start = Date.now();
    //compare a start time to an end time and figure out how many seconds elapsed
    res.on("finish", () => {
        // the finish event is emitted once the response has been sent to the client
        const diffSeconds = (Date.now() - start) / 1000;
        console.log(
            `${req.method} ${req.originalUrl} completed in ${diffSeconds} seconds`
        );
    });
    next();
});

router.use("/users", usersRoute)

router.all("*", function (req, res) {
    res.status(404).json({
        message: "API: what???"
    });
});

module.exports = router;