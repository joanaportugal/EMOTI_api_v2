const {
    Types
} = require("mongoose")

exports.cleanEmptyObjectKeys = (obj) => {
    for (let propName in obj) {
        if (
            obj[propName] === null ||
            obj[propName] === undefined ||
            obj[propName] === ""
        ) {
            delete obj[propName];
        }
    }
    return obj;
};

exports.checkObjectId = (id) => Types.ObjectId.isValid(id);