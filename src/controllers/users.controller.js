const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const {SECRET} = require("../config");
const { cleanEmptyObjectKeys } = require("../helpers");
const db = require("../models");
const User = db.users;

exports.register = async (req, res) => {
    if (req.body.typeUser === "Administrador") {
        return res
            .status(400)
            .json({
                success: false,
                error: "You can't register as an admin!"
            });
    }
    if (!req.body.password) {
        return res
            .status(400)
            .json({
                success: false,
                error: "Please provide a password!",
                erro: "Insira uma password!"
            });
    }
    const user = new User(req.body);

    try {
        const encryptedPw = bcrypt.hashSync(user.password, 10);
        user.password = encryptedPw;
        await user.save();
        return res.status(201).json({
            success: true,
            message: `User ${user.username} created!`,
            url: `api/users/${user._id}`,
        });
    } catch (err) {
        if (err.name === "MongoServerError" && err.code === 11000) {
            return res.status(422).json({
                success: false,
                error: `The username ${req.body.username} or email ${req.body.email} are already in use!`,
            });
        } else if (err.name === "ValidationError") {
            let errors = [];
            Object.keys(err.errors).forEach((key) => {
                errors.push(err.errors[key].message);
            });
            return res.status(400).json({
                success: false,
                error: errors
            });
        }
        return res.status(500).json({
            success: false,
            error: err.message || "Some error occurred while creating the user.",
        });

    }
};

exports.login = async (req, res) => {
    if (!(req.body.username && req.body.password)) {
        return res
            .status(400)
            .json({
                success: false,
                error: "Login with username and password!"
            });
    }
    try {
        const user = await User.findOne({
            username: req.body.username,
        }).exec();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found!",
            });
        }

        const check = bcrypt.compareSync(req.body.password, user.password);

        if (!check) {
            return res.status(401).json({
                success: false,
                error: "Username and password don't match!",
            });
        }

        if (user.blocked) {
            return res.status(403).json({
                success: false,
                error: "Your account is blocked. Please try again later!",
            });
        }
        const token = jwt.sign({
                username: user.username,
                typeUser: user.typeUser
            },
            SECRET, {
                expiresIn: "24h",
            }
        );

        return res.status(200).json({
            success: true,
            authKey: token,
            typeUser: user.typeUser,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: "Some error occurred while logging in!",
        });
    }
}