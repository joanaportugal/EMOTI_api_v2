const db = require("../models");
const Activity = db.activities;
const Emotion = db.emotions;
const User = db.users;
const Class = db.classes;
const {
  cleanEmptyObjectKeys,
  shuffleArray,
  generateDate
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
    if (req.body.category !== "Reconhecimento") {
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
    id: req.query.id,
    level: req.query.level,
    title: req.query.title,
    category: req.query.category,
    questionsNumber: req.query.questionsNumber
  });

  try {
    if (queries.hasOwnProperty("id")) {
      let activity = await Activity.findById(queries.id).populate("author").exec();
      if (!activity) {
        return res.status(200).json({
          success: false,
          error: "Atividade com esse id não encontrada!",
        });
      }

      return res.status(200).json({
        success: true,
        activities: activity,
      });
    }
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
          activitiesSuggested: {
            $elemMatch: {
              activity: activity._id,
              suggestedBy: "Tutor"
            }
          }
        }).exec();
        let foundInProfessorSuggestions = await User.findOne({
          _id: req.userId,
          activitiesSuggested: {
            $elemMatch: {
              activity: activity._id,
              suggestedBy: "Professor"
            }
          }
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
          approved: activity.approved,
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
        matchesAll = matchesAll && activity.questions.length === Number(queries.questionsNumber);
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
        approved: activity.approved,
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
        approved: activity.approved,
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
    !req.body.coverIMG
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
    coverIMG: req.body.coverIMG,
  });
  try {
    const activity = await Activity.findById(req.params.activity_id).exec();
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: `Não encontramos essa atividade!`,
      });
    }

    if (updateItems.hasOwnProperty("questions")) {
      const allEmotions = await Emotion.find().exec();
      const emotions = [];
      for (const emotion of allEmotions) {
        emotions.push(emotion.name)
      }

      for (const question of updateItems.questions) {
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
    const activity = await Activity.findByIdAndRemove(req.params.activity_id).exec();

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: `Não encontramos essa atividade!`,
      });
    }

    await User.updateMany({
      "activitiesPersonalized.activity": req.params.activity_id
    }, {
      $pull: {
        activitiesPersonalized: {
          activity: req.params.activity_id
        }
      }
    }).exec();

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

  if (!req.body.list && typeof req.body.list !== "object") {
    return res.status(404).json({
      success: false,
      error: "É necessário uma lista de crianças!",
    });
  }
  try {
    // check if activity exists and belongs to logged user
    const activity = await Activity.findOne({
      _id: req.params.activity_id,
      author: req.userId
    }).exec();
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: `Não encontramos essa atividade!`,
      });
    }

    // tutor
    if (req.typeUser === "Tutor") {
      // give activity
      await User.updateMany({
        _id: {
          $in: req.body.list
        },
        "activitiesPersonalized.activity": {
          $ne: activity._id
        }
      }, {
        $push: {
          activitiesPersonalized: {
            activity: activity._id
          }
        }
      }).exec();

      return res.status(200).json({
        success: true,
        message: `Atividade com id ${activity._id} adicionada às crianças!`
      });
    }
    // teacher
    else {
      // check if all classes belong to user and all classes have students
      const classes = await Class.find({
        _id: {
          $in: req.body.list
        },
        teacher: req.userId,
        students: {
          $exists: true,
          $ne: []
        },
      }).exec();

      if (req.body.list.length !== classes.length) {
        return res.status(400).json({
          success: false,
          error: `${
            req.body.list.length - classes.length
          } turmas não existem ou não têem alunos!`,
        });
      }

      const students = classes.map((c) => c.students);
      let studentsList = [];
      for (const item of students) {
        for (const name of item) {
          studentsList.push(name.child);
        }
      }

      // give activity
      await User.updateMany({
        _id: {
          $in: studentsList
        },
        "activitiesPersonalized.activity": {
          $ne: activity._id
        }
      }, {
        $push: {
          activitiesPersonalized: {
            activity: activity._id
          }
        }
      }).exec();

      return res.status(200).json({
        success: true,
        message: classes.map(
          (c) =>
          `Atividade ${activity._id} adicionada a todas as crianças da turma ${c.name}!`
        ),
      });
    }

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Aconteceu um erro enquanto atribuia a atividade às crianças. Tente mais tarde!",
    });
  }
}

exports.removeVisibility = async (req, res) => {
  if (req.typeUser === "Criança" || req.typeUser === "Administrador") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para editar atividades personalizadas!",
    });
  }

  try {
    // check if activity exists and belongs to logged user
    const activity = await Activity.findOne({
      _id: req.params.activity_id,
      author: req.userId
    }).exec();
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: `Não encontramos essa atividade!`,
      });
    }

    await User.findByIdAndUpdate({
      _id: req.params.child_id,
    }, {
      $pull: {
        activitiesPersonalized: {
          activity: req.params.activity_id
        }
      }
    }, {
      returnOriginal: false, // to return the updated document
      runValidators: true, // update validators on update command
      useFindAndModify: false, //remove deprecation warning
    }).exec()

    return res.status(200).json({
      success: true,
      message: `Atividade com id ${activity._id} removida da criança com id ${req.params.child_id}!`
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao sugerir a atividade às crianças. Tente mais tarde!",
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

  if (!req.body.list && typeof req.body.list !== "object") {
    return res.status(400).json({
      success: false,
      error: "É necessário uma lista de crianças!",
    });
  }
  try {
    // check if activity exists
    const activity = await Activity.findOne({
      _id: req.params.activity_id,
    }).exec();
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: `Não encontramos essa atividade!`,
      });
    }

    if (req.typeUser === "Tutor") {
      // suggest activity
      await User.updateMany({
        _id: {
          $in: req.body.list
        },
        $not: [{
            "activitiesSuggested.activity": {
              $ne: activity._id
            }
          },
          {
            "activitiesSuggested.suggestedBy": {
              $ne: "Tutor"
            }
          }
        ]
      }, {
        $push: {
          activitiesSuggested: {
            activity: activity._id,
            suggestedBy: "Tutor"
          }
        }
      }).exec();

      return res.status(200).json({
        success: true,
        message: `Atividade com id ${req.params.activity_id} foi sugerida para as crianças!`
      });
    } else {
      // check if all classes belong to user and all classes have students
      const classes = await Class.find({
        _id: {
          $in: req.body.list
        },
        teacher: req.userId,
        students: {
          $exists: true,
          $ne: []
        },
      }).exec();

      if (req.body.list.length !== classes.length) {
        return res.status(400).json({
          success: false,
          error: `${
            req.body.list.length - classes.length
          } turmas não existem ou não têem alunos!`,
        });
      }

      const students = classes.map((c) => c.students);
      let studentsList = [];
      for (const item of students) {
        for (const name of item) {
          studentsList.push(name.child);
        }
      }

      // suggest activity
      await User.updateMany({
        _id: {
          $in: studentsList
        },
        $not: [{
            "activitiesSuggested.activity": {
              $ne: activity._id
            }
          },
          {
            "activitiesSuggested.suggestedBy": {
              $ne: "Professor"
            }
          }
        ]
      }, {
        $push: {
          activitiesSuggested: {
            activity: activity._id,
            suggestedBy: "Professor"
          }
        }
      }).exec();

      return res.status(200).json({
        success: true,
        message: classes.map(
          (c) =>
          `Atividade com id ${req.params.activity_id} foi sugerida a todas as crianças da turma ${c.name}!`
        ),
      });
    }

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao sugerir a atividade às crianças. Tente mais tarde!",
    });
  }
}

exports.acceptPersonalized = async (req, res) => {
  if (req.typeUser !== "Administrador") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para aceitar atividades personalizadas!",
    });
  }
  try {
    const activity = await Activity.findById(req.params.activity_id).exec();

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: `Não encontramos essa atividade!`,
      });
    }

    if (activity.category === "Quiz" || activity.category === "Reconhecimento") {
      return res.status(404).json({
        success: false,
        error: "Não é possível aprovar uma atividade criada pelo tipo Administrador!",
      });
    }

    if (activity.approved) {
      return res.status(404).json({
        success: false,
        error: "A atividade já está aprovada!",
      });
    }

    await Activity.findByIdAndUpdate(req.params.activity_id, {
      approved: true
    }, {
      returnOriginal: false, // to return the updated document
      runValidators: true, // update validators on update command
      useFindAndModify: false, //remove deprecation warning
    }).exec();

    return res.status(200).json({
      success: true,
      message: "Atividade personalizada aceite!",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao aceitar a atividade personalizada. Tente mais tarde!",
    });
  }
}

exports.rejectPersonalized = async (req, res) => {
  if (req.typeUser !== "Administrador") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para recusar atividades personalizadas!",
    });
  }
  try {
    const activity = await Activity.findById(req.params.activity_id).exec();

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: `Não encontramos essa atividade!`,
      });
    }

    if (activity.category === "Quiz" || activity.category === "Reconhecimento") {
      return res.status(404).json({
        success: false,
        error: "Não é possível rejeitar uma atividade criada pelo tipo Administrador!",
      });
    }

    if (activity.approved) {
      return res.status(404).json({
        success: false,
        error: "A atividade já está aprovada. Não pode ser rejeitada depois da aprovação!",
      });
    }

    await Activity.findByIdAndRemove(req.params.activity_id).exec();

    return res.status(200).json({
      success: true,
      message: "Atividade personalizada recusada!",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao recusar a atividade personalizada. Tente mais tarde!",
    });
  }
}

exports.topActivities = async (req, res) => {
  try {
    const activities = await Activity.find({
      public: true
    }).sort({
      timesDone: -1
    }).exec();

    return res.status(200).json({
      success: true,
      activities: activities.slice(0, 10),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao obter o top 10 de atividades. Tente mais tarde!",
    });
  }
}

exports.updateChildActivity = async (req, res) => {
  if (req.typeUser !== "Criança") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para atualizar pontos!",
    });
  }
  if (!req.body.points && !req.body.questionsRight && !req.body.questionsWrong) {
    return res.status(404).json({
      success: false,
      error: "É necessário os pontos, as questões acertadas e as questões erradas!",
    });
  }

  try {
    const activity = await Activity.findById(req.params.activity_id).exec();
    const child = await User.findById(req.userId).exec();

    await Activity.findByIdAndUpdate(req.params.activity_id, {
      timesDone: activity.timesDone + 1
    }, {
      returnOriginal: false, // to return the updated document
      runValidators: true, // update validators on update command
      useFindAndModify: false, //remove deprecation warning
    }).exec();

    await Class.updateMany({
      "students.child": {
        $in: req.userId
      }
    }, {
      $set: {
        "students.$.points": child.totalPoints + req.body.points
      }
    }).exec();

    await User.findByIdAndUpdate(req.userId, {
      $push: {
        history: {
          date: generateDate(),
          activity: req.params.activity_id,
          questionsRight: req.body.questionsRight,
          questionsWrong: req.body.questionsWrong,
        }
      },
      totalPoints: child.totalPoints + req.body.points
    }, {
      returnOriginal: false, // to return the updated document
      runValidators: true, // update validators on update command
      useFindAndModify: false, //remove deprecation warning
    }).exec();

    if (child.activitiesPersonalized.length > 0) {
      for (const act of child.activitiesPersonalized) {
        await User.updateOne({
          _id: req.userId,
          "activitiesPersonalized._id": act._id
        }, {
          $set: {
            "activitiesPersonalized.$.isDone": true,
            "activitiesPersonalized.$.points": act.points + req.body.points
          }
        }).exec();
      }
    }

    if (child.activitiesSuggested.length > 0) {
      for (const act of child.activitiesSuggested) {
        await User.updateOne({
          _id: req.userId,
          "activitiesSuggested._id": act._id
        }, {
          $set: {
            "activitiesSuggested.$.isDone": true,
            "activitiesSuggested.$.points": act.points + req.body.points
          }
        }).exec();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Pontos atualizados com sucesso!",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao atualizar os pontos. Tente mais tarde!",
    });
  }
}

exports.getActivityChildren = async (req, res) => {
  if (req.typeUser !== "Tutor" && req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para ver as crianças desta atividade!",
    });
  }
  try {
    const children = await User.find({
        "activitiesPersonalized.activity": {
          $in: req.params.activity_id
        },
      })
      .exec();

    return res.status(200).json({
      success: true,
      children
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || `Tivemos problemas ao obter as crianças. Tente mais tarde!`,
    });
  }
}

exports.getActivityHistory = async (req, res) => {
  if (req.typeUser !== "Tutor" && req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para ver as crianças desta atividade!",
    });
  }

  try {
    const activities = await Activity.find({
        "author": req.userId
      })
      .exec();

    let list = [];

    for (const activity of activities) {
      let listItem = {
        _id: activity._id,
        title: activity.title,
        approved: activity.approved,
        questionsRight: 0,
        questionsWrong: 0,
        wrongQuestions: []
      }
      const children = await User.find({
        "history.activity": activity._id
      }).select("_id name username history").populate("history.activity").exec();

      for (let index = 0; index < activity.questions.length; index++) {
        listItem.wrongQuestions.push({
          [`Questão ${index+1}`]: 0
        })
      }


      for (const child of children) {
        for (const item of child.history) {
          if (item.activity.title === activity.title) {
            listItem.questionsRight += item.questionsRight.length;
            listItem.questionsWrong += item.questionsWrong.length;

            for (let index = 0; index < item.questionsWrong.length; index++) {
              listItem.wrongQuestions[index][`Questão ${index+1}`] = listItem.wrongQuestions[index][`Questão ${index+1}`] + 1
            }
          }
        }
      }
      list.push(listItem)
    }

    return res.status(200).json({
      success: true,
      list
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || `Tivemos problemas ao histórico das atividades extras das crianças. Tente mais tarde!`,
    });
  }
}