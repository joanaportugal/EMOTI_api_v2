const db = require("../models");
const Emotion = db.emotions;
const {
    checkObjectId
} = require("../helpers");

exports.create = async (req, res) => {
    if (req.typeUser !== "Administrador") {
        return res.status(403).json({
            success: false,
            error: "O seu tipo de utilizador não tem permissões para adicionar emoções!",
        });
    }
    const emotion = new Emotion(req.body);
    try {
        await emotion.save();
        return res.status(201).json({
            success: true,
            message: `Emoção ${emotion.name} criada!`,
            URL: `/api/emotions/${emotion._id}`,
        });
    } catch (err) {
        if (err.name === "MongoServerError" && err.code === 11000) {
            return res.status(422).json({
                success: false,
                error: `A emoção ${emotion.name} já existe!`,
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
            error: err.message || "Tivemos problemas ao criar a emoção. Tente mais tarde!",
        });
    }
}

exports.findAll = async (req, res) => {
    try {
        const emotions = await Emotion.find().exec();
        return res.status(200).json({
            success: true,
            emotions
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message || `Tivemos problemas ao obter as emoções. Tente mais tarde!`,
        });
    }
}

exports.deleteOne = async (req, res) => {
    if (req.typeUser !== "Administrador") {
        return res.status(403).json({
            success: false,
            error: "O seu tipo de utilizador não tem permissões para remover emoções!",
        });
    }
    try {
        const emotion = await Emotion.findById(req.params.emotion_id).exec();
        if (!emotion) {
            return res.status(404).json({
                success: false,
                error: "Emoção não encontrada!",
            });
        }

        await Emotion.findByIdAndRemove(req.params.emotion_id).exec();
        return res.status(200).json({
            success: true,
            message: "Emoção apagada!"
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
            error: "Tivemos problemas ao apagar a emoção. Tente mais tarde!",
        });
    }
}