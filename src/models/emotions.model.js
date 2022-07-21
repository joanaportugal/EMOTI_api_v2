module.exports = (mongoose) => {
    const schema = mongoose.Schema({
        name: {
            type: String,
            required: [true, "Insira um nome da emoção!"],
            unique: true,
        },
    }, {
        timestamps: false,
        versionKey: false
    });
    const Emotion = mongoose.model("emotions", schema);
    return Emotion;
};