module.exports = (mongoose) => {
    const schema = mongoose.Schema({
        name: {
            type: String,
            required: [true, "Insira o nome de uma turma!"]
        },
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        },
        requests: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        }],
        students: [{
            child: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "users"
            },
            points: Number
        }],
        statistics: Array
    }, {
        timestamps: false,
        versionKey: false
    });
    const Class = mongoose.model("classes", schema);
    return Class;
};