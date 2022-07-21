module.exports = (mongoose) => {
    const schema = mongoose.Schema({
        username: {
            type: String,
            required: [true, "Please provide a username!"],
            unique: true,
            validate: {
                validator: function (v) {
                    return /^[a-zA-Z0-9\_]+$/.test(v); // valid only a-z, A-Z, 0-9 and _ characters
                },
                message: (props) => `${props.value} is not a valid username!`,
            },
        },
        password: {
            type: String,
            required: [true, "Please provide a password!"],
        },
        name: {
            type: String,
            required: [true, "Please provide a name!"]
        },
        email: {
            type: String,
            required: [true, "Please provide a email!"],
            unique: true,
            validate: {
                validator: function (v) {
                    return /^[\a-zA-Z0-9\_\.]+@([\a-z]+\.)+[\a-z]{2,4}$/.test(v);
                    // a-z, A-Z, 0-9, _ or . characters @ a-z characters . a-z characters (2-4)
                },
                message: (props) => `${props.value} is not a valid email!`,
            },
        },
        typeUser: {
            type: String,
            required: [true, "Please provide a typeUser!"],
            enum: {
                values: ["Administrador", "Professor", "Criança", "Tutor"],
                message: "{VALUE} is not a valid type! Try Administrador, Professor, Criança or Tutor.",
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
        children: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        }],
        notifications: [String],
        totalPoints: {
            type: Number,
            default: 0
        },
        history: [{
            date: String,
            title: String,
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