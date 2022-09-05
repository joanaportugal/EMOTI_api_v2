module.exports = (mongoose) => {
    const schema = mongoose.Schema({
        title: {
            type: String,
            required: [true, "Insira um título para a atividade!"],
            unique: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        },
        level: {
            type: String,
            required: [true, "Insira um nível de dificuldade!"],
            enum: {
                values: ["Fácil", "Médio", "Difícil"],
                message: "{VALUE} não é válido! Tente Fácil, Médio ou Difícil.",
            },
        },
        questions: [{
            img: String,
            correctAnswer: String,
            points: Number,
            options: Array,
            text: String,
            categoryImg: String,
        }],
        coverIMG: {
            type: String,
            required: [true, "Insira uma imagem!"]
        },
        description: {
            type: String,
            required: [true, "Insira uma descrição!"],
        },
        category: {
            type: String,
            required: [true, "Insira uma categoria!"],
        },
        public: {
            type: Boolean,
            default: true
        },
        visibility: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        }],
        approved: {
            type: Boolean,
            default: false
        },
        timesDone: {
            type: Number,
            default: 0
        },
    }, {
        timestamps: false,
        versionKey: false
    });
    const Activity = mongoose.model("activities", schema);
    return Activity;
};