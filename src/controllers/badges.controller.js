const db = require("../models");
const Badge = db.badges;
const Emotion = db.emotions;
const {
    cleanEmptyObjectKeys
} = require("../helpers");

exports.create = async (req, res) => {
    if (req.typeUser !== "Administrador") {
        return res.status(403).json({
            success: false,
            error: "O seu tipo de utilizador não tem permissões para adicionar badges!",
        });
    }

    try {
        const emotion = await Emotion.find({
            name: req.body.emotion
        }).exec();
        if (!emotion) {
            return res.status(404).json({
                success: false,
                error: `Emoção ${badge.emotion} não encontrada!`,
            });
        }
        const badge = new Badge(req.body);
        await badge.save();
        return res.status(201).json({
            success: true,
            message: `Badge ${badge.name} criada!`,
            URL: `/api/badges/${badge._id}`,
        });
    } catch (err) {
        if (err.name === "MongoServerError" && err.code === 11000) {
            return res.status(422).json({
                success: false,
                error: `A badge já existe!`,
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
            error: err.message || "Tivemos problemas ao criar a badge. Tente mais tarde!",
        });
    }
}

exports.findAll = async (req, res) => {
    if (req.typeUser !== "Administrador" && req.typeUser !== "Criança") {
        return res.status(403).json({
            success: false,
            error: "O seu tipo de utilizador não tem permissões para ver badges!",
        });
    }
    try {
        let badges = await Badge.find(cleanEmptyObjectKeys({
            emotion: req.query.emotion,
            name: req.query.title,
        })).exec();
        return res.status(200).json({
            success: true,
            badges
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message || `Tivemos problemas ao obter as badges. Tente mais tarde!`,
        });
    }
}

exports.deleteOne = async (req, res) => {
    if (req.typeUser !== "Administrador") {
        return res.status(403).json({
            success: false,
            error: "O seu tipo de utilizador não tem permissões para remover badges!",
        });
    }
    try {
        const badge = await Badge.findById(req.params.badge_id).exec();
        if (!badge) {
            return res.status(404).json({
                success: false,
                error: "Badge não encontrada!",
            });
        }

        await Badge.findByIdAndRemove(req.params.badge_id).exec();
        return res.status(200).json({
            success: true,
            message: "Badge apagada!"
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: "Tivemos problemas ao apagar a emoção. Tente mais tarde!",
        });
    }
}