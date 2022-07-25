const db = require("../models/index");
const Class = db.classes;

// classes
exports.createClass = async (req, res) => {
  if (req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para adicionar turmas!",
    });
  }
  try {
    const checkClass = await Class.findOne({
      name: req.body.className,
      teacher: req.userId,
    });
    if (checkClass) {
      return res.status(400).json({
        success: false,
        error: "Já existe uma turma com esse nome na sua lista!",
      });
    }
    const newClass = new Class({
      name: req.body.className,
      teacher: req.userId,
    });

    await newClass.save();
    return res.status(201).json({
      success: true,
      message: `Turma ${newClass.name} criada!`,
      URL: `/api/classes/${newClass._id}`,
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
      error: err.message || "Tivemos problemas ao criar a turma. Tente mais tarde!",
    });
  }
}

exports.findClasses = async (req, res) => {
  if (req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para listar turmas!",
    });
  }
  try {
    const classes = await Class.find({
      teacher: req.userId
    }).exec();

    return res.status(200).json({
      success: true,
      classes
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao encontrar as turmas. Tente mais tarde!",
    });
  }
}

exports.updateClass = async (req, res) => {
  if (req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para atualizar turmas!",
    });
  }
  try {
    return res.status(200).send("OK")
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao atualizar a turma. Tente mais tarde!",
    });
  }
}

exports.deleteClass = async (req, res) => {
  if (req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para remover turmas!",
    });
  }
  try {
    // check if class exists
    const classTeacher = await Class.find({
      _id: req.params.class_id,
      teacher: req.userId
    }).exec();
    if (!classTeacher) {
      return res.status(404).json({
        success: false,
        error: `Não existe essa turma!`,
      });
    }

    await Class.findByIdAndRemove(req.params.class_id).exec();
    return res.status(200).json({
      success: true,
      message: `Turma ${req.params.className} apagada!`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao apagar a turma. Tente mais tarde!",
    });
  }
}

/* OLD PROJECT

exports.findChild = async (req, res) => {
  if (req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to search for a child!",
    });
  }

  if (!req.query.usernameChild) {
    return res
      .status(400)
      .json({ success: false, error: "Please provide usernameChild on query" });
  }

  try {
    // finding child
    const childUser = await User.findOne({
      username: req.query.usernameChild,
    })
      .select("name tutor typeUser -_id")
      .exec();
    if (!childUser) {
      return res.status(404).json({
        success: false,
        error: `Child ${req.query.usernameChild} not found!`,
      });
    } else if (childUser.typeUser !== "Criança") {
      return res.status(400).json({
        success: false,
        error: `User ${req.query.usernameChild} is not a child!`,
      });
    }

    return res.status(200).json({
      success: true,
      child: {
        name: childUser.name,
        tutor: childUser.tutor,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Some error occurred while finding child ${req.body.usernameChild}!`,
    });
  }
};

exports.createRequest = async (req, res) => {
  if (req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to create a class request!",
    });
  }

  if (!req.body.usernameChild || !req.body.className) {
    return res.status(400).json({
      success: false,
      error: "Please provide usernameChild and className",
    });
  }
  try {
    // finding child and class
    const childUser = await User.findOne({
      username: req.body.usernameChild,
    }).exec();
    const classTeacher = await Class.findOne({
      name: req.body.className,
      teacher: req.username,
    }).exec();

    // validations (in case user didn't searched child first)
    if (!childUser) {
      return res.status(404).json({
        success: false,
        error: `Child ${req.body.usernameChild} not found!`,
      });
    } else if (childUser.typeUser !== "Criança") {
      return res.status(400).json({
        success: false,
        error: `User ${req.body.usernameChild} is not a child!`,
      });
    } else if (!classTeacher) {
      return res.status(404).json({
        success: false,
        error: `Class ${req.body.className} not found!`,
      });
    }

    const allClasses = await Class.find().select("-_id").exec();
    // validate if child is already a student on any class or requests
    // - given class
    if (classTeacher.requests.includes(req.body.usernameChild)) {
      return res.status(400).json({
        success: false,
        error: `User ${req.body.usernameChild} is already on requests!`,
      });
    } else if (classTeacher.students.includes(req.body.usernameChild)) {
      return res.status(400).json({
        success: false,
        error: `User ${req.body.usernameChild} is already on students!`,
      });
    }
    // - logged user other class
    if (
      allClasses.find(
        (c) =>
          c.teacher === req.username &&
          (c.requests.includes(req.body.usernameChild) ||
            c.students.includes(req.body.usernameChild))
      )
    ) {
      return res.status(400).json({
        success: false,
        error: `User ${req.body.usernameChild} is already on one of your classes!`,
      });
    }
    // - other teacher class
    if (allClasses.find((c) => c.students.includes(req.body.usernameChild))) {
      return res.status(400).json({
        success: false,
        error: `User ${req.body.usernameChild} is already on someone else class!`,
      });
    }

    // update requests
    await Class.findOneAndUpdate(
      { name: req.body.className, teacher: req.username },
      { $push: { requests: req.body.usernameChild } },
      {
        returnOriginal: false, // to return the updated document
        runValidators: false, //runs update validators on update command
        useFindAndModify: false, //remove deprecation warning
      }
    ).exec();

    return res.status(201).json({
      success: true,
      message: "Class request created!",
      uri: `api/classes/requests/${childUser.username}`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Some error occurred while creating a class request!`,
    });
  }
};

exports.findRequest = async (req, res) => {
  if (req.typeUser !== "Tutor") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to get class requests!",
    });
  }
  try {
    // check tutor relations
    const tutorUser = await User.findOne({ username: req.username }).exec();
    if (!tutorUser.children.includes(req.params.usernameChild)) {
      return res.status(400).json({
        success: false,
        error: `Child ${req.params.usernameChild} doesn't have a relation with you!`,
      });
    }

    const requests = await Class.find({
      requests: { $in: [req.params.usernameChild] },
    })
      .select("name teacher -_id")
      .exec();
    return res.status(200).json({ success: true, requests });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Some error occurred while providing class requests!`,
    });
  }
};

exports.acceptRequest = async (req, res) => {
  if (req.typeUser !== "Tutor") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to accept class requests!",
    });
  }

  if (!req.body.teacher || !req.body.className) {
    return res.status(400).json({
      success: false,
      error: "Please provide teacher and className!",
    });
  }

  try {
    // check tutor relations
    const tutorUser = await User.findOne({ username: req.username }).exec();
    if (!tutorUser.children.includes(req.params.usernameChild)) {
      return res.status(400).json({
        success: false,
        error: `Child ${req.params.usernameChild} doesn't have a relation with you!`,
      });
    }
    // check if child has given class request
    const classRequest = await Class.findOne({
      name: req.body.className,
      teacher: req.body.teacher,
      requests: { $in: [req.params.usernameChild] },
    }).exec();

    if (!classRequest) {
      return res.status(400).json({
        success: false,
        error: "Request not found!",
      });
    }

    // accept request
    await Class.findOneAndUpdate(
      {
        name: req.body.className,
        teacher: req.body.teacher,
        requests: { $in: [req.params.usernameChild] },
      },
      {
        $pull: { requests: req.params.usernameChild },
        $push: { students: req.params.usernameChild },
      },
      {
        returnOriginal: false, // to return the updated document
        runValidators: false, //runs update validators on update command
        useFindAndModify: false, //remove deprecation warning
      }
    ).exec();

    return res.status(200).json({
      success: true,
      message: `User ${req.params.usernameChild} is now a student on ${req.body.className}`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Some error occurred while accepting class request!`,
    });
  }
};

exports.removeRequest = async (req, res) => {
  if (req.typeUser !== "Tutor") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to decline class requests!",
    });
  }

  if (!req.body.teacher || !req.body.className) {
    return res.status(400).json({
      success: false,
      error: "Please provide teacher and className!",
    });
  }

  try {
    // check tutor relations
    const tutorUser = await User.findOne({ username: req.username }).exec();
    if (!tutorUser.children.includes(req.params.usernameChild)) {
      return res.status(400).json({
        success: false,
        error: `Child ${req.params.usernameChild} doesn't have a relation with you!`,
      });
    }
    // check if child has given class request
    const classRequest = await Class.findOne({
      name: req.body.className,
      teacher: req.body.teacher,
      requests: { $in: [req.params.usernameChild] },
    }).exec();

    if (!classRequest) {
      return res.status(400).json({
        success: false,
        error: "Request not found!",
      });
    }

    // decline request
    await Class.findOneAndUpdate(
      {
        name: req.body.className,
        teacher: req.body.teacher,
        requests: { $in: [req.params.usernameChild] },
      },
      {
        $pull: { requests: req.params.usernameChild },
      },
      {
        returnOriginal: false, // to return the updated document
        runValidators: false, //runs update validators on update command
        useFindAndModify: false, //remove deprecation warning
      }
    ).exec();

    return res.status(200).json({
      success: true,
      message: "Class request declined!",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Some error occurred while accepting class request!`,
    });
  }
};

exports.getClassFromChild = async (req, res) => {
  if (req.typeUser !== "Tutor") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to get child's class!",
    });
  }

  const user = await User.findOne({ username: req.username }).exec();
  if (!user.children.includes(req.params.usernameChild)) {
    return res.status(404).json({
      success: false,
      error: `Child ${req.params.usernameChild} not found on your relations!`,
    });
  }

  const classItem = await Class.find({
    students: req.params.usernameChild,
  })
    .select("name teacher -_id")
    .exec();

  return res.status(200).json({ success: true, class: classItem });
};

exports.removeClass = async (req, res) => {
  if (req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to remove a class!",
    });
  }

  try {
    // check if class exists
    const classTeacher = await Class.findOne({
      name: req.params.className,
      teacher: req.username,
    }).exec();
    if (!classTeacher) {
      return res.status(404).json({
        success: false,
        error: `Class ${req.params.className} not found on your classes!`,
      });
    }

    await Class.findOneAndRemove({
      name: req.params.className,
      teacher: req.username,
    }).exec();
    return res.status(200).json({
      success: true,
      message: `Class ${req.params.className} deleted!`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Some error occurred while deleting class!`,
    });
  }
};

exports.findAllStudents = async (req, res) => {
  if (req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to get students from a class!",
    });
  }
  try {
    // check if class exists
    const classes = await Class.find({
      teacher: req.username,
      students: { $exists: true, $ne: [] }, // students list is not empty
    })
      .select("name students -_id")
      .exec();

    let studentsList = classes.map((c) => c.students[0]);

    const children = await User.find({
      username: { $in: studentsList },
    })
      .select("username name tutor points -_id")
      .exec();

    const list = classes.map((c) => ({ name: c.name, students: children }));
    return res.status(200).json({ success: true, list });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Some error occurred while retrieving class students!`,
    });
  }
};

exports.removeStudent = async (req, res) => {
  if (req.typeUser !== "Professor" && req.typeUser !== "Tutor") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to remove students from a class!",
    });
  }
  try {
    // check if class exists
    const classTeacher = await Class.findOne({
      name: req.params.className,
      teacher: req.typeUser === "Professor" ? req.username : req.body.teacher,
    }).exec();
    if (!classTeacher) {
      return res.status(404).json({
        success: false,
        error: `Class ${req.params.className} not found on your classes!`,
      });
    }
    // check if student exists on that class
    if (!classTeacher.students.includes(req.params.usernameChild)) {
      return res.status(404).json({
        success: false,
        error: `Class ${req.params.className} doesn't have child ${req.params.usernameChild}!`,
      });
    }

    // remove student
    await Class.findOneAndUpdate(
      {
        name: req.params.className,
        teacher: req.typeUser === "Professor" ? req.username : req.body.teacher,
      },
      {
        $pull: { students: req.params.usernameChild },
      },
      {
        returnOriginal: false, // to return the updated document
        runValidators: false, //runs update validators on update command
        useFindAndModify: false, //remove deprecation warning
      }
    ).exec();

    return res.status(200).json({
      success: true,
      message: `Child ${req.params.usernameChild} removed from class ${req.params.className}`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Some error occurred while removing student from class!`,
    });
  }
};

exports.alterStudentClass = async (req, res) => {
  if (req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to edit students' class!",
    });
  }
  if (!req.body.newClass) {
    return res.status(404).json({
      success: false,
      error: "Please provide newClass!",
    });
  }
  try {
    // check if classes exist
    const classTeacher = await Class.findOne({
      name: req.params.className,
      teacher: req.username,
    }).exec();
    const newClass = await Class.findOne({
      name: req.body.newClass,
      teacher: req.username,
    }).exec();
    if (!classTeacher) {
      return res.status(404).json({
        success: false,
        error: `Class ${req.params.className} not found on your classes!`,
      });
    } else if (!newClass) {
      return res.status(404).json({
        success: false,
        error: `Class ${req.body.newClass} not found on your classes!`,
      });
    }
    // check if student exists on that class
    if (!classTeacher.students.includes(req.params.usernameChild)) {
      return res.status(404).json({
        success: false,
        error: `Class ${req.params.className} doesn't have child ${req.params.usernameChild}!`,
      });
    }

    // update classes
    await Class.findOneAndUpdate(
      {
        name: req.params.className,
        teacher: req.username,
      },
      {
        $pull: { students: req.params.usernameChild },
      },
      {
        returnOriginal: false, // to return the updated document
        runValidators: false, //runs update validators on update command
        useFindAndModify: false, //remove deprecation warning
      }
    ).exec();

    await Class.findOneAndUpdate(
      {
        name: req.body.newClass,
        teacher: req.username,
      },
      {
        $push: { students: req.params.usernameChild },
      },
      {
        returnOriginal: false, // to return the updated document
        runValidators: false, //runs update validators on update command
        useFindAndModify: false, //remove deprecation warning
      }
    ).exec();

    return res.status(200).json({
      success: true,
      message: `Child ${req.params.usernameChild} is now on class ${req.body.newClass}`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Some error occurred while updating student's class!`,
    });
  }
}; */