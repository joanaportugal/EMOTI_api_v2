const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const {
    SECRET
} = require("../config");
const {
    cleanEmptyObjectKeys,
    checkObjectId
} = require("../helpers");
const db = require("../models");
const User = db.users;

// users
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
            url: `/api/users/${user._id}`,
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
}

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

        if (user.typeUser === "Criança") {
            console.log("entrou aqui");
            let today = new Date();
            let date = `${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}`;
            let time = `${today.getHours()}:${today.getMinutes()}`;

            await User.findByIdAndUpdate(user._id, {
                last_access: `${date} ${time}`
            }, {
                returnOriginal: false,
                runValidators: true,
                useFindAndModify: false
            }).exec();
        }

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

exports.createOneAdmin = async (req, res) => {
    if (req.typeUser !== "Administrador") {
        return res.status(403).json({
            success: false,
            error: "O seu tipo de utilizador não tem permissões registar um utilizador administrador!",
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
    const user = new User({
        ...req.body,
        typeUser: "Administrador",
    });
    try {
        const encryptedPw = bcrypt.hashSync(user.password, 10);
        user.password = encryptedPw;
        await user.save();
        return res.status(200).json({
            success: true,
            message: `Administrador ${user.username} criado!`,
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
            error: "Tivemos problemas ao criar um novo administrador. Tente mais tarde!",
        });
    }
}

exports.getProfile = async (req, res) => {
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

exports.findAll = async (req, res) => {
    if (req.typeUser !== "Administrador") {
        return res.status(403).json({
            success: false,
            error: "O seu tipo de utilizador não tem permissões para ver todos os utilizadores!",
        });
    }

    try {
        let users = await User.find(cleanEmptyObjectKeys({
            name: new RegExp(req.query.name, "i"),
            typeUser: req.query.typeUser,
        })).select(
            "username email typeUser name blocked"
        ).exec();
        return res.status(200).json({
            success: true,
            users
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: "Tivemos problemas ao obter a lista de utilizadores. Tente mais tarde!",
        });
    }

}

exports.findOne = async (req, res) => {
    if (req.typeUser === "Administrador") {
        return res.status(403).json({
            success: false,
            error: "O seu tipo de utilizador não tem permissões para ver a informação dos uilizadores!",
        });
    }
    try {
        const user = await User.findById(req.params.user_id)
            .select("-password")
            .exec();

        return user ? res.status(200).json({
            success: true,
            user,
        }) : res.status(404).json({
            success: false,
            error: "Utilizador não encontrado!",
        });
    } catch (err) {
        if (!checkObjectId(req.params.userId)) {
            return res.status(400).json({
                success: false,
                error: "Insira um id válido!",
            });
        }
        return res.status(500).json({
            success: false,
            error: "Tivemos problemas ao encontrar o utilizador. Tente mais tarde!",
        });
    }
}

exports.updateProfile = async (req, res) => {
    if (!req.body.oldPass && !req.body.newPass && !req.body.imgProfile) {
        return res.status(400).send({
            success: false,
            error: "Precisamos de atualizar a password ou imagem de perfil!",
        });
    }
    try {
        if (req.body.newPass) {
            const user = await User.findById(req.userId).exec();
            const areEqual = bcrypt.compareSync(req.body.oldPass, user.password);
            if (!areEqual) {
                return res.status(400).json({
                    success: false,
                    message: `A password antiga não é a password guardada!`,
                });
            }
            const encryptedPw = bcrypt.hashSync(req.body.newPass, 10);
            await User.findByIdAndUpdate(req.userId, {
                password: encryptedPw
            }, {
                returnOriginal: false,
                runValidators: true,
                useFindAndModify: false
            }).exec();
            return res.status(200).json({
                success: true,
                message: `Password atualizada!`,
            });
        }

        await User.findByIdAndUpdate(req.userId, {
            imgProfile: req.body.imgProfile
        }, {
            runValidators: true,
            useFindAndModify: false
        }).exec();

        return res.status(200).json({
            success: true,
            message: `Imagem atualizada!`,
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            error: "Tivemos problemas ao atualizar a sua informação. Tente mais tarde!",
        });
    }
}

exports.updateOne = async (req, res) => {
    if (req.typeUser !== "Administrador") {
        return res.status(403).json({
            success: false,
            error: "O seu tipo de utilizador não tem permissões para editar utilizadores!",
        });
    }
    try {
        const user = await User.findById(req.params.user_id).exec();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Utilizador não encontrado!",
            });
        }

        await User.findByIdAndUpdate(req.params.user_id, {
            blocked: !user.blocked
        }, {
            returnOriginal: false,
            runValidators: true,
            useFindAndModify: false
        }).exec();

        return res.status(200).json({
            success: true,
            message: !user.blocked ? "Utilizador bloqueado!" : "Utilizador desbloqueado!",
        });
    } catch (err) {
        if (!checkObjectId(req.params.userId)) {
            return res.status(400).json({
                success: false,
                error: "Insira um id válido!",
            });
        }
        return res.status(500).json({
            success: false,
            error: "Tivemos problemas ao atualizar o status de bloqueio. Tente mais tarde!",
        });
    }
}

exports.deleteOne = async (req, res) => {
    if (req.typeUser !== "Administrador") {
        return res.status(403).json({
            success: false,
            error: "O seu tipo de utilizador não tem permissões para apagar os utilizadores!",
        });
    }
    try {
        const user = await User.findById(req.params.user_id).exec();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Utilizador não encontrado!",
            });
        }

        await User.findByIdAndRemove(req.params.user_id).exec();

        // missing relations

        return res.status(200).json({
            success: true,
            message: "Utilizador apagado!"
        });
    } catch (err) {
        if (!checkObjectId(req.params.userId)) {
            return res.status(400).json({
                success: false,
                error: "Insira um id válido!",
            });
        }
        return res.status(500).json({
            success: false,
            error: "Tivemos problemas ao apagar o utilizador. Tente mais tarde!",
        });
    }
}

// relations
exports.createRelation = async (req, res) => {
    if (req.typeUser !== "Tutor") {
        return res.status(403).json({
            success: false,
            error: "O seu tipo de utilizador não tem permissões para associar crianças!",
        });
    }
    if (!req.body.username || !req.body.password) {
        return res.status(400).json({
            success: false,
            error: "Para associar uma criança, é necessário o nome de utilizador e password!",
        });
    }
    try {
        // finding child
        const childUser = await User.findOne({
            username: req.body.username,
        }).exec();
        if (!childUser) {
            return res.status(404).json({
                success: false,
                error: `A criança ${req.body.username} não existe!`,
            });
        } else if (childUser.typeUser !== "Criança") {
            return res.status(400).json({
                success: false,
                error: `O utilizador ${req.body.username} não é uma criança!`,
            });
        }

        // validate relations
        const tutorUser = await User.findById(req.userId).exec();
        if (tutorUser.children.includes(childUser._id)) {
            return res.status(400).json({
                success: false,
                error: `Já tem uma relação com a criança ${req.body.username}!`,
            });
        } else if (childUser.tutor) {
            return res.status(400).json({
                success: false,
                error: `A criança ${req.body.username} já tem um tutor!`,
            });
        }
        // validate child password
        const check = bcrypt.compareSync(req.body.password, childUser.password);
        if (!check) {
            return res.status(400).json({
                success: false,
                error: `A password da criança está errada!`,
            });
        }

        await User.findByIdAndUpdate(req.userId, {
            $push: {
                children: childUser._id
            }
        }, {
            returnOriginal: false, // to return the updated document
            runValidators: false, //runs update validators on update command
            useFindAndModify: false, //remove deprecation warning
        }).exec();

        await User.findByIdAndUpdate(childUser._id, {
            tutor: req.userId
        }, {
            returnOriginal: false, // to return the updated document
            runValidators: false, //runs update validators on update command
            useFindAndModify: false, //remove deprecation warning
        }).exec();

        return res.status(200).json({
            success: true,
            message: `A criança ${req.body.username} acabou de ser associada à sua conta!`
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: "Tivemos problemas ao associar a criança. Tente mais tarde!",
        });
    }
}

exports.findRelations = async (req, res) => {
    if (req.typeUser !== "Tutor") {
        return res.status(403).json({
            success: false,
            error: "O seu tipo de utilizador não tem permissões para ver crianças!",
        });
    }
    try {
        const user = await User.findById(req.userId).exec();

        const children = await User.find({
            _id: {
                $in: user.children
            }
        }).exec();

        return res.status(200).json({
            success: true,
            children: children.map(child => {
                let nameparts = child.name.split(" ");
                let initials = nameparts[0].charAt(0).toUpperCase() + nameparts[1].charAt(0).toUpperCase();
                return {
                    _id: child._id,
                    name: child.name,
                    imgProfile: child.imgProfile,
                    username: child.username,
                    email: child.email,
                    initials
                }
            })
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: "Tivemos problemas ao encontrar as crianças do utilizador. Tente mais tarde!",
        });
    }
}

exports.deleteRelation = async (req, res) => {
    if (req.typeUser !== "Tutor") {
        return res.status(403).json({
            success: false,
            error: "O seu tipo de utilizador não tem permissões para remover crianças!",
        });
    }
    try {
        const user = await User.findById(req.userId).exec();

        if (!user.children.includes(req.params.user_id)) {
            return res.status(404).json({
                success: false,
                error: `Não tem uma relação com essa criança!`,
            });
        }

        // update tutor and child
        await User.findByIdAndUpdate(
            req.userId, {
                $pull: {
                    children: req.params.user_id
                }
            }, {
                returnOriginal: false, // to return the updated document
                runValidators: false, //runs update validators on update command
                useFindAndModify: false, //remove deprecation warning
            }
        ).exec();

        return res.status(200).json({
            success: true,
            message: "A criança já não está mais associada!",
        });
    } catch (err) {
        if (!checkObjectId(req.params.userId)) {
            return res.status(400).json({
                success: false,
                error: "Insira um id válido!",
            });
        }
        return res.status(500).json({
            success: false,
            error: "Tivemos problemas ao remover a criança. Tente mais tarde!",
        });
    }
}