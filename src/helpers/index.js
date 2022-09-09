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

exports.generateDate = () => {
    const fullDate = new Date();
    const date = fullDate.getDate() + "/" + fullDate.getMonth() + 1 + "/" + fullDate.getFullYear();
    const time = fullDate.getHours() + ":" + fullDate.getMinutes()
    return date + " " + time
}

exports.shuffleArray = (arr) => arr.sort(() => Math.random() - 0.5);