const db = require("../models");
const Activity = db.activities;
const {
  cleanEmptyObjectKeys
} = require("../helpers");

exports.createOne = async (req, res) => {
  try {
    return res.status(200).send("OK")
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao criar a atividade. Tente mais tarde!",
    });
  }
}

exports.findAll = async (req, res) => {
  try {
    return res.status(200).send("OK")
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao econtrar as atividades. Tente mais tarde!",
    });
  }
}

exports.findOne = async (req, res) => {
  try {
    return res.status(200).send("OK")
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao econtrar a atividade. Tente mais tarde!",
    });
  }
}

exports.updateOne = async (req, res) => {
  try {
    return res.status(200).send("OK")
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao atualizar a atividade. Tente mais tarde!",
    });
  }
}

exports.deleteOne = async (req, res) => {
  try {
    return res.status(200).send("OK")
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao apagar a atividade. Tente mais tarde!",
    });
  }
}

exports.giveActivity = async (req, res) => {
  try {
    return res.status(200).send("OK")
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao dar a atividade personalizada às crianças. Tente mais tarde!",
    });
  }
}

exports.suggestActivity = async (req, res) => {
  try {
    return res.status(200).send("OK")
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao sugerir a atividade às crianças. Tente mais tarde!",
    });
  }
}

/* OLD PROJECT
const User = db.users;
const Class = db.classes;
const Emotion = db.emotions;

exports.create = async (req, res) => {
  if (req.typeUser === "Criança") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to create activities!",
    });
  }

  const activity = new Activity({
    title: req.body.title,
    level: req.body.level,
    questions: req.body.questions,
    caseIMG: req.body.caseIMG,
    description: req.body.description,
    category: req.body.category,
    author: req.username,
  });
  try {
    for (const question of activity.questions) {
      const emotion = await Emotion.findOne({
        name: question.correctAnswer,
      }).exec();
      if (!emotion) {
        return res.status(404).json({
          success: false,
          error: `Cannot find any emotion with name ${question.correctAnswer}!`,
        });
      }
    }
    const emotions = await Emotion.find().select("name -_id").exec();
    let list = emotions.map((e) => e.name);
    // add emotions on question answers
    activity.questions = activity.questions.map((question) => ({
      ...question,
      answers: list,
    }));
    await activity.save(); // save document in the activities DB collection
    // add to tutor/teacher
    if (req.typeUser !== "Admin") {
      await User.findOneAndUpdate(
        { username: req.username },
        { $push: { activitiesPersonalized: activity.title } },
        {
          returnOriginal: false, // to return the updated document
          runValidators: false, //runs update validators on update command
          useFindAndModify: false, //remove deprecation warning
        }
      ).exec();
    }
    return res.status(201).json({
      success: true,
      message: "New activity was created!",
      URL: `/activities/${activity.title}`,
    });
  } catch (err) {
    // capture mongoose validation errors
    if (err.name === "MongoServerError" && err.code === 11000) {
      return res.status(422).json({
        success: false,
        error: `The activity with name ${req.body.title} already exists!`,
      });
    } else if (err.name === "ValidationError") {
      let errors = [];
      Object.keys(err.errors).forEach((key) => {
        errors.push(err.errors[key].message);
      });
      return res.status(400).json({ success: false, error: errors });
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Some error occurred while creating the activity.",
    });
  }
};

exports.findAll = async (req, res) => {
  let queries = {
    level: req.query.level,
    category: req.query.category,
    title: req.query.title,
  };
  queries = cleanEmptyObjectKeys(queries);

  try {
    let all = await Activity.find(queries).select("-_id").exec();
    // get public/admin activities
    let admins = await User.find({ typeUser: "Administrador" })
      .select("username -_id")
      .exec();
    admins = admins.map((a) => a.username);
    let public = all.filter((a) => admins.includes(a.author));
    if (req.typeUser === "Administrador") {
      return res.status(200).json({ success: true, activities: public });
    }

    // get tutor/teacher activities
    if (req.typeUser === "Tutor" || req.typeUser === "Professor") {
      let personalized = all.filter((a) => a.author === req.username);
      return res
        .status(200)
        .json({ success: true, activities: [...public, ...personalized] });
    }

    // get child activities
    let child = await User.findOne({ username: req.username }).exec();
    let personalized = all.filter((a) =>
      child.activitiesPersonalized.includes(a.title)
    );
    return res.status(200).json({
      success: true,
      activities: [...public, ...personalized],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Some error occurred while retrieving activities.",
    });
  }
};

exports.giveActivity = async (req, res) => {
  // check if user who's giving is 'Professor' or 'Tutor' and has 'children' on body
  if (req.typeUser !== "Professor" && req.typeUser !== "Tutor") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to give activity to children!",
    });
  }
  if (
    !req.body.list ||
    req.body.list.length === 0 ||
    typeof req.body.list !== "object"
  ) {
    return res.status(400).json({
      success: false,
      error: "Please provide a list!",
    });
  }
  try {
    // check if activity exists and belongs to logged user
    const activity = await Activity.findOne({
      title: req.params.activityName,
      author: req.username,
    }).exec();

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: `Activity ${req.params.activityName} not found on your personalized activities!`,
      });
    }

    // tutor
    if (req.typeUser === "Tutor") {
      // check if children are related
      const children = await User.find({
        username: { $in: req.body.list },
        tutor: req.username,
      }).exec();
      if (req.body.list.length !== children.length) {
        return res.status(400).json({
          success: false,
          error: `${
            req.body.list.length - children.length
          } children not found on your relations!`,
        });
      }
      // check if activity already on children
      const cActivities = await User.find({
        username: { $in: req.body.list },
        tutor: req.username,
        activitiesPersonalized: { $ne: req.params.activityName },
      }).exec();
      if (req.body.list.length !== cActivities.length) {
        return res.status(400).json({
          success: false,
          error: `${
            req.body.list.length - cActivities.length
          } children have already activity ${req.params.activityName}!`,
        });
      }

      // suggest activity
      await User.updateMany(
        { username: { $in: req.body.list } },
        { $push: { activitiesPersonalized: activity.title } }
      ).exec();

      return res.status(200).json({
        success: true,
        message: children.map(
          (c) =>
            `Activity ${req.params.activityName} added to child ${c.username}!`
        ),
      });
    }

    // teacher
    // check if all classes belong to user and all classes have students
    const classes = await Class.find({
      name: { $in: req.body.list },
      teacher: req.username,
      students: { $exists: true, $ne: [] },
    }).exec();
    if (req.body.list.length !== classes.length) {
      return res.status(400).json({
        success: false,
        error: `${
          req.body.list.length - classes.length
        } classes doesn't exist or doesn't have students to give activities!`,
      });
    }
    const students = classes.map((c) => c.students);
    let studentsList = [];
    for (const item of students) {
      for (const name of item) {
        studentsList.push(name);
      }
    }
    // check if activity already on children
    const cActivities = await User.find({
      username: { $in: studentsList },
      activitiesPersonalized: { $ne: req.params.activityName },
    }).exec();
    if (req.body.list.length !== cActivities.length) {
      return res.status(400).json({
        success: false,
        error: `${
          req.body.list.length - cActivities.length
        } class have already activity ${req.params.activityName}!`,
      });
    }
    // suggest activity
    await User.updateMany(
      { username: { $in: studentsList } },
      { $push: { activitiesPersonalized: activity.title } }
    ).exec();

    // suggest activity to classes' children
    return res.status(200).json({
      success: true,
      message: classes.map(
        (c) =>
          `Activity ${req.params.activityName} added to all children in class ${c.name}!`
      ),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Some error occurred while giving activitiy.",
    });
  }
};

exports.suggestActivity = async (req, res) => {
  // check if user who's giving is 'Professor' or 'Tutor' and has 'children' on body
  if (req.typeUser !== "Professor" && req.typeUser !== "Tutor") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to suggest activity to children!",
    });
  }
  if (req.body.list.length === 0 || typeof req.body.list !== "object") {
    return res.status(400).json({
      success: false,
      error: "Please provide a list!",
    });
  }
  try {
    // check if activity exists and belongs to logged user
    const activity = await Activity.findOne({
      title: req.params.activityName,
    }).exec();

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: `Activity ${req.params.activityName} not found!`,
      });
    }

    // tutor
    if (req.typeUser === "Tutor") {
      // check if children are related
      const children = await User.find({
        username: { $in: req.body.list },
        tutor: req.username,
      }).exec();
      if (req.body.list.length !== children.length) {
        return res.status(400).json({
          success: false,
          error: `${
            req.body.list.length - children.length
          } children not found on your relations!`,
        });
      }
      // check if activity already on children

      const cActivities = await User.find({
        username: { $in: req.body.list },
        tutor: req.username,
        "activitiesSuggested.title": { $ne: req.params.activityName },
      }).exec();
      if (req.body.list.length !== cActivities.length) {
        return res.status(400).json({
          success: false,
          error: `${
            req.body.list.length - cActivities.length
          } children have already activity ${req.params.activityName}!`,
        });
      }

      // suggest activity
      await User.updateMany(
        { username: { $in: req.body.list } },
        {
          $push: {
            activitiesSuggested: { title: activity.title, who: req.typeUser },
          },
        }
      ).exec();

      return res.status(200).json({
        success: true,
        message: children.map(
          (c) =>
            `Activity ${req.params.activityName} added to child ${c.username}!`
        ),
      });
    }

    // teacher
    // check if all classes belong to user and all classes have students
    const classes = await Class.find({
      name: { $in: req.body.list },
      teacher: req.username,
      students: { $exists: true, $ne: [] },
    }).exec();
    if (req.body.list.length !== classes.length) {
      return res.status(400).json({
        success: false,
        error: `${
          req.body.list.length - classes.length
        } classes doesn't exist or doesn't have students to give activities!`,
      });
    }
    const students = classes.map((c) => c.students);
    let studentsList = [];
    for (const item of students) {
      for (const name of item) {
        studentsList.push(name);
      }
    }
    // check if activity already on children
    const cActivities = await User.find({
      username: { $in: studentsList },
      "activitiesSuggested.title": { $ne: req.params.activityName },
    }).exec();
    if (req.body.list.length !== cActivities.length) {
      return res.status(400).json({
        success: false,
        error: `${
          req.body.list.length - cActivities.length
        } class have already activity ${req.params.activityName}!`,
      });
    }
    // suggest activity
    await User.updateMany(
      { username: { $in: studentsList } },
      {
        $push: {
          activitiesSuggested: { title: activity.title, who: req.typeUser },
        },
      }
    ).exec();

    // suggest activity to classes' children
    return res.status(200).json({
      success: true,
      message: classes.map(
        (c) =>
          `Activity ${req.params.activityName} added to all children in class ${c.name}!`
      ),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Some error occurred while giving activitiy.",
    });
  }
};

exports.delete = async (req, res) => {
  if (req.typeUser === "Criança") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to delete activities!",
    });
  }
  try {
    const activity = await Activity.findOneAndRemove({
      title: req.params.activityName,
      author: req.username,
    }).exec();
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: `Activity ${req.params.activityName} not found!`,
      });
    }

    // remove from children
    await User.updateMany(
      { typeUser: "Criança" },
      { $pull: { activitiesSuggested: activity.title } }
    ).exec();
    // remove from author
    await User.findOneAndUpdate(
      { username: req.username },
      { $pull: { activitiesPersonalized: activity.title } },
      {
        returnOriginal: false, // to return the updated document
        runValidators: false, //runs update validators on update command
        useFindAndModify: false, //remove deprecation warning
      }
    ).exec();

    return res.status(200).json({
      success: true,
      message: `Activity ${req.params.activityName} was deleted successfully!`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `Error deleting activity ${req.params.activityName}!`,
    });
  }
};

exports.update = async (req, res) => {
  if (req.typeUser === "Criança") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to update activities!",
    });
  }
  if (
    !req.body.level &&
    !req.body.description &&
    !req.body.questions &&
    !req.body.caseIMG
  ) {
    return res.status(400).json({
      success: false,
      error:
        "Please provide at least one of these items: level, description, questions and caseIMG!",
    });
  }
  try {
    let updateItems = {
      level: req.body.level,
      description: req.body.description,
      questions: req.body.questions,
      caseIMG: req.body.caseIMG,
    };
    updateItems = cleanEmptyObjectKeys(updateItems);

    const activity = await Activity.findOneAndUpdate(
      { title: req.params.activityName, author: req.username },
      updateItems,
      {
        returnOriginal: false, // to return the updated document
        runValidators: true, // update validators on update command
        useFindAndModify: false, //remove deprecation warning
      }
    ).exec();

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: `Cannot find activity ${req.params.activityName} on your activities!`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Activity ${req.params.activityName} was updated successfully!`,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      let errors = [];
      Object.keys(err.errors).forEach((key) => {
        errors.push(err.errors[key].message);
      });
      return res.status(400).json({ success: false, error: errors });
    }
    return res.status(500).json({
      success: false,
      message: `Error updating activity ${req.params.activityName}!`,
    });
  }
};
 */