module.exports = (mongoose) => {
    const schema = mongoose.Schema({
        username: {
            type: String,
            required: [true, "Insira um nome de utilizador!"],
            unique: true,
            validate: {
                validator: function (v) {
                    return /^[a-zA-Z0-9\_]+$/.test(v); // valid only a-z, A-Z, 0-9 and _ characters
                },
                message: (props) => `${props.value} não é um nome de utilizador válido!`,
            },
        },
        password: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: [true, "Insira um nome!"]
        },
        email: {
            type: String,
            required: [true, "Insira um email"],
            unique: true,
            validate: {
                validator: function (v) {
                    return /^[\a-zA-Z0-9\_\.]+@([\a-z]+\.)+[\a-z]{2,4}$/.test(v);
                    // a-z, A-Z, 0-9, _ or . characters @ a-z characters . a-z characters (2-4)
                },
                message: (props) => `${props.value} inão é um email válido!`,
            },
        },
        typeUser: {
            type: String,
            required: [true, "Insira um tipo de utilizador!"],
            enum: {
                values: ["Administrador", "Professor", "Criança", "Tutor"],
                message: "{VALUE} não é válido! Tente Administrador, Professor, Criança ou Tutor.",
            },
        },
        imgProfile: {
            type: String,
            default: ""
        },
        blocked: {
            type: Boolean,
            default: false
        },
        tutor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        },
        children: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        }],
        notifications: [{
            title: String,
            text: String,
        }],
        totalPoints: {
            type: Number,
            default: 0
        },
        history: [{
            date: String,
            activity: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "activities"
            },
            questionsRight: Number,
            questionsWrong: Number,
        }],
        last_access: {
            type: String,
            default: ""
        },
        activitiesPersonalized: [{
            activity: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "activities"
            },
            isDone: {
                type: Boolean,
                default: false
            },
            points: {
                type: Number,
                default: 0
            },
        }],
        activitiesSuggested: [{
            activity: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "activities"
            },
            suggestedBy: String,
            isDone: {
                type: Boolean,
                default: false
            },
            points: {
                type: Number,
                default: 0
            },
        }],
    }, {
        timestamps: false,
        versionKey: false
    });
    const User = mongoose.model("users", schema);
    return User;
};