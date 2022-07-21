const dbConfig = require("../config");
const mongoose = require("mongoose");

const db = {};

db.mongoose = mongoose;
db.url = dbConfig.URL;

db.mongoose
    .connect(db.url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log("Connected to the database!");
    })
    .catch((err) => {
        console.log("Cannot connect to the database!", err);
        process.exit();
    });

db.users = require("./users.model.js")(mongoose);
//    db.classes = require("./classes.model.js")(mongoose);
//    db.badges = require("./badges.model.js")(mongoose);
//    db.activities = require("./activities.model.js")(mongoose);
//    db.emotions = require("./emotions.model.js")(mongoose);    

module.exports = db;