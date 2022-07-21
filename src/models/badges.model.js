module.exports = (mongoose) => {
    const schema = mongoose.Schema({
        name: {
            type: String,
            required: [true, "Insira um nome!"],
            unique: true,
        },
        badgeIMG: {
            type: String,
            required: [true, "Insira uma imagem!"]
        },
        emotion: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "emotions"
        },
        pointsNeeded: {
            type: Number,
            required: [true, "Insira uma quantidade de pontos!"],
            min: [0, "A quantidade de pontos deve ser um número positivo!"],
        },
        mainColor: {
            type: String,
            required: [true, "Insira uma cor principal!"]
        },
        footerColor: {
            type: String,
            required: [true, "Insira uma cor para o fundo!"]
        },
    }, {
        timestamps: false,
        versionKey: false
    });
    const Badge = mongoose.model("badges", schema);
    return Badge;
};