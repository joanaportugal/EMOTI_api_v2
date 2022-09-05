const db = require("../models");
const Activity = db.activities;
const Emotion = db.emotions;
const User = db.users;
const {
  cleanEmptyObjectKeys,
  shuffleArray
} = require("../helpers");

exports.createOne = async (req, res) => {
  if (req.typeUser === "Criança") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para adicionar atividades!",
    });
  }
  const activity = new Activity({
    ...req.body,
    public: req.typeUser === "Administrador",
    approved: req.typeUser === "Administrador",
    author: req.userId,
    category: req.body.category ||
      (req.typeUser === "Administrador" ? "Quiz" :
        req.typeUser === "Tutor" ? "Atividades Personalizadas (Tutor)" : "Atividades Personalizadas (Professor)")
  });
  try {
    const allEmotions = await Emotion.find().exec();
    const emotions = [];
    for (const emotion of allEmotions) {
      emotions.push(emotion.name)
    }

    for (const question of activity.questions) {
      const emotion = await Emotion.findOne({
        name: question.correctAnswer,
      }).exec();
      if (!emotion) {
        return res.status(404).json({
          success: false,
          error: `Não foi possível encontrar a emoção ${question.correctAnswer}!`,
        });
      }
      question.options = shuffleArray([question.correctAnswer,
        ...shuffleArray(emotions.filter(e => e !== question.correctAnswer).slice(0, 3))
      ])

    }

    await activity.save();

    return res.status(201).json({
      success: true,
      message: "Nova atividade criada!",
      URL: `/activities/${activity._id}`,
    });
  } catch (err) {
    if (err.name === "MongoServerError" && err.code === 11000) {
      return res.status(422).json({
        success: false,
        error: `Já existe uma atividade com o nome ${req.body.title}!`,
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
      error: err.message || "Tivemos problemas ao criar a atividade. Tente mais tarde!",
    });
  }
}

exports.findAll = async (req, res) => {
  let queries = cleanEmptyObjectKeys({
    _id: req.query._id,
    level: req.query.level,
    title: req.query.title,
    category: req.query.category,
    questionsNumber: Number(req.query.questionsNumber)
  });
  try {
    let activities = [];
    if (req.typeUser === "Administrador") {
      activities = await Activity.find().populate("author").exec();
    } else if (req.typeUser === "Criança") {
      let child = await User.findById(req.userId).exec();
      activities = await Activity.find({
        $or: [{
            public: true
          }, {
            _id: {
              $in: child.activitiesPersonalized.map(a => a.activity)
            },
          },
          {
            _id: {
              $in: child.activitiesSuggested.map(a => a.activity)
            }
          }
        ]
      }).populate("author").exec();
      const arr = [];
      for (const activity of activities) {
        let foundInTutorSuggestions = await User.findOne({
          _id: req.userId,
          "activitiesSuggested.activity": activity._id,
          "activitiesSuggested.suggestedBy": "Tutor"
        }).exec();
        let foundInProfessorSuggestions = await User.findOne({
          _id: req.userId,
          "activitiesSuggested.activity": activity._id,
          "activitiesSuggested.suggestedBy": "Professor"
        }).exec();

        arr.push({
          _id: activity._id,
          title: activity.title,
          author: activity.author,
          level: activity.level,
          coverIMG: activity.coverIMG,
          description: activity.description,
          category: activity.category,
          questions: activity.questions,
          suggestedByTutor: Boolean(foundInTutorSuggestions),
          suggestedByProfessor: Boolean(foundInProfessorSuggestions),
        });
      }

      activities = arr;
    } else {
      activities = await Activity.find({
        $or: [{
          public: true
        }, {
          author: req.userId
        }]
      }).populate("author").exec();
    }
    let finalActivitiesList = [];
    for (const activity of activities) {
      let matchesAll = true;
      if (queries.hasOwnProperty("level")) {
        matchesAll = matchesAll && activity.level === queries.level;
      }
      if (queries.hasOwnProperty("title")) {
        matchesAll = matchesAll && activity.title.includes(queries.title);
      }
      if (queries.hasOwnProperty("category")) {
        matchesAll = matchesAll && activity.category.includes(queries.category);
      }
      if (queries.hasOwnProperty("questionsNumber")) {
        matchesAll = matchesAll && activity.questions.length === queries.questionsNumber;
      }
      const item = req.typeUser === "Criança" ? {
        _id: activity._id,
        title: activity.title,
        author: activity.author.username,
        level: activity.level,
        coverIMG: activity.coverIMG,
        description: activity.description,
        category: activity.category,
        questions: activity.questions,
        personalizedActivity: activity.category.includes("Atividades Personalizadas"),
        suggestedByTutor: activity.suggestedByTutor,
        suggestedByProfessor: activity.suggestedByProfessor,
      } : {
        _id: activity._id,
        title: activity.title,
        author: activity.author.username,
        level: activity.level,
        coverIMG: activity.coverIMG,
        description: activity.description,
        category: activity.category,
        questions: activity.questions,
        personalizedActivity: activity.category.includes("Atividades Personalizadas")
      };
      finalActivitiesList = matchesAll ? [...finalActivitiesList, item] : finalActivitiesList
    }

    return res.status(200).json({
      success: true,
      activities: finalActivitiesList,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao econtrar as atividades. Tente mais tarde!",
    });
  }
}

exports.updateOne = async (req, res) => {
  if (req.typeUser === "Criança") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para atualizar atividades!",
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
      error: "É necessário atualizar pelo menos um destes itens: dificuldade, descrição, questões e imagem!",
    });
  }

  let updateItems = cleanEmptyObjectKeys({
    level: req.body.level,
    description: req.body.description,
    questions: req.body.questions,
    caseIMG: req.body.caseIMG,
  });
  try {
    const activity = await Activity.findById(req.params.activity_id).exec();
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: `Não encontramos essa atividade!`,
      });
    }
    if (req.typeUser === "Administrador" && activity.author._id !== req.userId) {
      return res.status(404).json({
        success: false,
        error: `Não é possível editar essa atividade!`,
      });
    }


    await Activity.findByIdAndUpdate(req.params.activity_id,
      updateItems, {
        returnOriginal: false, // to return the updated document
        runValidators: true, // update validators on update command
        useFindAndModify: false, //remove deprecation warning
      }
    ).exec();

    return res.status(200).json({
      success: true,
      message: "Atividade atualizada!",
    });

  } catch (err) {
    if (err.name === "ValidationError") {
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
      error: err.message || "Tivemos problemas ao atualizar a atividade. Tente mais tarde!",
    });
  }
}

exports.deleteOne = async (req, res) => {
  if (req.typeUser === "Criança") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para apagar atividades!",
    });
  }
  try {
    const activity = await Activity.findById(req.params.activity_id).exec();

    const selected = await Activity.findByIdAndRemove(activity._id).exec();

    if (!selected) {
      return res.status(404).json({
        success: false,
        error: `Não encontramos essa atividade!`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Atividade apagada!",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao apagar a atividade. Tente mais tarde!",
    });
  }
}

exports.giveActivity = async (req, res) => {
  if (req.typeUser === "Criança" || req.typeUser === "Administrador") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para dar atividades personalizadas!",
    });
  }
  if (
    !req.body.list &&
    req.body.list.length === 0 &&
    typeof req.body.list !== "object"
  ) {
    return res.status(400).json({
      success: false,
      error: "É necessário uma lista de crianças!",
    });
  }
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
  if (req.typeUser === "Criança" || req.typeUser === "Administrador") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para dar atividades personalizadas!",
    });
  }
  if (
    !req.body.list &&
    req.body.list.length === 0 &&
    typeof req.body.list !== "object"
  ) {
    return res.status(400).json({
      success: false,
      error: "É necessário uma lista de crianças!",
    });
  }
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
exports.giveActivity = async (req, res) => {
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
 */