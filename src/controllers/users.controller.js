const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const {
    SECRET
} = require("../config");
const {
    cleanEmptyObjectKeys
} = require("../helpers");
const db = require("../models");
const User = db.users;

exports.register = async (req, res) => {
    if (req.body.typeUser === "Administrador") {
        return res
            .status(400)
            .json({
                success: false,
                error: "Não podes criar uma conta de administrador!"
            });
    }
    if (!req.body.password) {
        return res
            .status(400)
            .json({
                success: false,
                error: "Insira uma password!"
            });
    }
    const user = new User(req.body);

    try {
        const encryptedPw = bcrypt.hashSync(user.password, 10);
        user.password = encryptedPw;
        await user.save();
        return res.status(201).json({
            success: true,
            message: `Utilizador ${user.username} criado!`,
            url: `api/users/${user._id}`,
        });
    } catch (err) {
        if (err.name === "MongoServerError" && err.code === 11000) {
            return res.status(422).json({
                success: false,
                error: `O utilizador ${req.body.username} ou email ${req.body.email} já estão a ser usados!`,
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
            error: err.message || "Tivemos problemas no registo. Tenta mais tarde!",
        });

    }
};

exports.login = async (req, res) => {
    if (!(req.body.username && req.body.password)) {
        return res
            .status(400)
            .json({
                success: false,
                error: "Login com nome de utilizador e password!"
            });
    }
    try {
        const user = await User.findOne({
            username: req.body.username,
        }).exec();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Utilizador não encontrado!",
            });
        }

        const check = bcrypt.compareSync(req.body.password, user.password);

        if (!check) {
            return res.status(401).json({
                success: false,
                error: "Nome de utilizador e password não coincidem!",
            });
        }

        if (user.blocked) {
            return res.status(403).json({
                success: false,
                error: "A tua conta encontra-se bloqueada no momento!",
            });
        }
        const token = jwt.sign({
                userId: user._id,
                typeUser: user.typeUser
            },
            SECRET, {
                expiresIn: "2h",
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
            error: "Tivemos problemas no login. Tente mais tarde!",
        });
    }
}

exports.findOne = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select("-_id -password -blocked")
            .exec();

        return res.status(200).json({
            success: true,
            user,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: "Tivemos problemas ao obter a sua informação. Tente mais tarde!",
        });
    }
}