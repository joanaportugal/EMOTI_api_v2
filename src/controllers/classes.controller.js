const db = require("../models/index");
const Class = db.classes;
const User = db.users;

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
      teacher: req.userId,
      name: {
        $regex: req.query.name ? req.query.name : "",
        $options: "i"
      }
    }).select("-teacher").populate({
      path: "requests",
      populate: {
        path: "tutor",
      }
    }).populate({
      path: "students.child",
      populate: {
        path: "tutor",
      }
    }).exec();

    return res.status(200).json({
      success: true,
      classes: classes.map(c => {
        let nameparts = c.name.split(" ");
        let initials = nameparts.length >= 2 ?
          nameparts[0].charAt(0).toUpperCase() + nameparts[1].charAt(0).toUpperCase() :
          nameparts[0].charAt(0).toUpperCase();
        return {
          _id: c._id,
          name: c.name,
          requests: c.requests.map(r => ({
            _id: r._id,
            name: r.name,
            tutor: r.tutor.name
          })),
          students: c.students.map(({
            child
          }) => ({
            _id: child._id,
            name: child.name,
            tutor: child.tutor.name
          })),
          statistics: c.statistics,
          initials
        }
      })
    });
  } catch (err) {
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

  if (!req.body.newName) {
    return res.status(403).json({
      success: false,
      error: "Indique o novo nome da turma!",
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

    const checkClass = await Class.findOne({
      name: req.body.newClass,
      teacher: req.userId,
    });
    if (checkClass) {
      return res.status(400).json({
        success: false,
        error: "Já existe uma turma com esse nome na sua lista!",
      });
    }

    await Class.findByIdAndUpdate(req.params.class_id, {
      name: req.body.newName
    }, {
      returnOriginal: false,
      runValidators: true,
      useFindAndModify: false
    }).exec();
    return res.status(200).json({
      success: true,
      message: "Turma atualizada!",
    });
  } catch (error) {
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
      message: `Turma apagada!`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao apagar a turma. Tente mais tarde!",
    });
  }
}

// requests
exports.findChild = async (req, res) => {
  if (req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para procurar uma criança!",
    });
  }

  if (!req.query.username) {
    return res
      .status(400)
      .json({
        success: false,
        error: "É necessário o username!"
      });
  }

  try {
    const child = await User.findOne({
        username: req.query.username,
        typeUser: "Criança",
      })
      .select("name tutor-_id")
      .populate("tutor", "username")
      .exec();

    if (!child) {
      return res.status(404).json({
        success: false,
        error: `Criança ${req.query.username} não encontrada!`,
      });
    }

    return res.status(200).json({
      success: true,
      child: {
        _id: child._id,
        name: child.name,
        tutor: child.tutor.username
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao encontrar a criança. Tente mais tarde!",
    });
  }
}

exports.createRequest = async (req, res) => {
  if (req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para criar um pedido de turma!",
    });
  }

  if (!req.body.username || !req.body.className) {
    return res.status(400).json({
      success: false,
      error: "É necessário o username e a turma!",
    });
  }

  try {
    // finding child and class
    const childUser = await User.findOne({
      username: req.body.username,
      typeUser: "Criança",
    }).exec();
    const classTeacher = await Class.findOne({
      name: req.body.className,
      teacher: req.userId,
    }).exec();

    // validations (in case user didn't searched child first)
    if (!childUser) {
      return res.status(404).json({
        success: false,
        error: `Criança ${req.body.username} não encontrada!`,
      });
    } else if (!classTeacher) {
      return res.status(404).json({
        success: false,
        error: `Turma ${req.body.className} não encontrada!`,
      });
    }

    const childIsInRequests = await Class.find({
      _id: classTeacher._id,
      requests: childUser._id
    }).exec();
    const childIsInStudents = await Class.find({
      _id: classTeacher._id,
      "students.child": childUser._id
    }).exec();
    // validate if child is already on that students or requests of given class
    if (!childIsInRequests) {
      return res.status(400).json({
        success: false,
        error: `Criança ${req.body.username} já está nos pedidos de turma!`,
      });
    } else if (!childIsInStudents) {
      return res.status(400).json({
        success: false,
        error: `Criança ${req.body.username} já é um aluno!`,
      });
    }

    const childAssociatedToTeacher = await Class.findOne({
      teacher: req.userId,
      $or: [{
        requests: childUser._id
      }, {
        "students.child": childUser._id
      }],
    }).exec();
    if (childAssociatedToTeacher) {
      return res.status(400).json({
        success: false,
        error: `A criança já está associada a uma das suas turmas!`,
      });
    }

    await Class.findOneAndUpdate({
      name: req.body.className,
      teacher: req.userId
    }, {
      $push: {
        requests: childUser._id
      }
    }, {
      returnOriginal: false, // to return the updated document
      runValidators: false, //runs update validators on update command
      useFindAndModify: false, //remove deprecation warning
    }).exec();

    return res.status(201).json({
      success: true,
      message: "Pedido de turma criado!",
      URL: `/api/classes/requests/${childUser._id}`,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao criar o pedido. Tente mais tarde!",
    });
  }
};

exports.findRequests = async (req, res) => {
  if (req.typeUser !== "Tutor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para ver os pedidos de turma!",
    });
  }
  try {
    // check tutor relations
    const tutor = await User.findById(req.userId).exec();
    if (!tutor.children.includes(req.params.user_id)) {
      return res.status(400).json({
        success: false,
        error: `A criança não tem nenhuma vinculação com o seu utilizador!`,
      });
    }

    const requests = await Class.find({
        requests: {
          $in: [req.params.user_id]
        },
      })
      .select("name teacher -_id").populate("teacher", "username _id")
      .exec();

    return res.status(200).json({
      success: true,
      requests: requests.map(r => ({
        name: r.name,
        teacher: r.teacher.username,
        teacherId: r.teacher._id
      }))
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao encontrar os pedidos. Tente mais tarde!",
    });
  }
}

exports.acceptRequest = async (req, res) => {
  if (req.typeUser !== "Tutor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para aceitar um pedido de turma!",
    });
  }
  if (!req.body.teacherId || !req.body.className) {
    return res.status(400).json({
      success: false,
      error: "É necessário o id do professor e a turma!",
    });
  }
  try {
    // check tutor relations
    const tutor = await User.findById(req.userId).exec();
    if (!tutor.children.includes(req.params.user_id)) {
      return res.status(400).json({
        success: false,
        error: `A criança não tem nenhuma vinculação com o seu utilizador!`,
      });
    }

    // check if child has given class request
    const classRequest = await Class.findOne({
      name: req.body.className,
      teacher: req.body.teacherId,
      requests: {
        $in: [req.params.user_id]
      },
    }).exec();

    if (!classRequest) {
      return res.status(400).json({
        success: false,
        error: "Pedido de turma não encontrado!",
      });
    }

    // accept request
    await Class.findByIdAndUpdate(classRequest._id, {
      $pull: {
        requests: req.params.user_id
      },
      $push: {
        students: {
          child: req.params.user_id
        }
      },
    }, {
      returnOriginal: false, // to return the updated document
      runValidators: false, //runs update validators on update command
      useFindAndModify: false, //remove deprecation warning
    }).exec();


    return res.status(200).json({
      success: true,
      message: `A criança agora faz parte da turma ${req.body.className}!`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao aceitar o pedido. Tente mais tarde!",
    });
  }
}

exports.removeRequest = async (req, res) => {
  if (req.typeUser !== "Tutor" && req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para apagar um pedido de turma!",
    });
  }
  if ((req.typeUser === "Tutor" && !req.body.teacherId) || !req.body.className) {
    return res.status(400).json({
      success: false,
      error: "É necessário o id do professor e a turma!",
    });
  }

  try {
    // check tutor relations
    if (req.typeUser === "Tutor") {
      const tutor = await User.findById(req.userId).exec();
      if (!tutor.children.includes(req.params.user_id)) {
        return res.status(400).json({
          success: false,
          error: `A criança não tem nenhuma vinculação com o seu utilizador!`,
        });
      }
    }


    // check if child has given class request
    const classRequest = await Class.findOne({
      name: req.body.className,
      teacherId: req.typeUser === "Tutor" ? req.body.teacherId : req.userId,
      requests: {
        $in: [req.params.user_id]
      },
    }).exec();

    if (!classRequest) {
      return res.status(400).json({
        success: false,
        error: "Pedido de turma não encontrado!",
      });
    }

    // delete request
    await Class.findByIdAndUpdate(classRequest._id, {
      $pull: {
        requests: req.params.user_id
      },
    }, {
      returnOriginal: false, // to return the updated document
      runValidators: false, //runs update validators on update command
      useFindAndModify: false, //remove deprecation warning
    }).exec();

    return res.status(200).json({
      success: true,
      message: "Pedido de turma apagado!",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao apagar o pedido. Tente mais tarde!",
    });
  }
}

// students
exports.findAllStudents = async (req, res) => {
  if (req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para ver os alunos!",
    });
  }
  try {
    const list = await Class.find({
      teacher: req.userId,
      students: {
        $exists: true,
        $ne: []
      }, // students list is not empty
    }).select("name students").populate({
      path: "students.child",
      populate: {
        path: "tutor",
      }
    }).exec();

    let students = [];

    for (const item of list) {
      for (const student of item.students) {
        const child = student.child;
        if (req.query.name) {
          if (child.name.toLowerCase().includes(req.query.name)) {
            students.push({
              _id: child._id,
              class: item.name,
              name: child.name,
              imgProfile: child.imgProfile,
              email: child.email,
              tutor: child.tutor.name
            })
          }
        }
        students.push({
          _id: child._id,
          class: item.name,
          name: child.name,
          imgProfile: child.imgProfile,
          email: child.email,
          tutor: child.tutor.name
        })

      }
    }

    return res.status(200).json({
      success: true,
      students: students.sort((a, b) => a.name < b.name)
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao obter os alunos. Tente mais tarde!",
    });
  }
}

exports.findChildClasses = async (req, res) => {
  if (req.typeUser !== "Tutor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para ver as turmas da criança!",
    });
  }
  try {
    const user = await User.findById(req.userId).exec();

    if (!user.children.includes(req.params.user_id)) {
      return res.status(404).json({
        success: false,
        error: `A criança não está associada ao seu utilizador!`,
      });
    }
    const classesItem = await Class.find({
        "students.child": req.params.user_id,
      })
      .select("name teacher")
      .populate("teacher", "name")
      .exec();

    return res.status(200).json({
      success: true,
      class: classesItem.map(c => ({
        _id: c._id,
        name: c.name,
        teacher: c.teacher.name,
        teacherId: c.teacher._id
      }))
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao obter as turmas da criança. Tente mais tarde!",
    });
  }
}

exports.updateChildClass = async (req, res) => {
  if (req.typeUser !== "Professor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para editar a turma da criança!",
    });
  }

  if (!req.body.newClass) {
    return res.status(404).json({
      success: false,
      error: "É preciso o nome da nova turma!",
    });
  }
  try {
    // check if classes exist
    const classTeacher = await Class.findOne({
      _id: req.params.class_id,
      teacher: req.userId,
    }).exec();
    const newClass = await Class.findOne({
      name: req.body.newClass,
      teacher: req.userId,
    }).exec();
    if (!classTeacher) {
      return res.status(404).json({
        success: false,
        error: `A antiga turma não está nas suas turmas!`,
      });
    } else if (!newClass) {
      return res.status(404).json({
        success: false,
        error: `A nova turma não está nas suas turmas!`,
      });
    }

    // check if student exists on that class
    const classItem = await Class.findOne({
      _id: classTeacher._id,
      "students.child": req.params.user_id,
    }).exec();

    if (!classItem) {
      return res.status(404).json({
        success: false,
        error: "Essa criança não pertence a essa turma!",
      });
    }

    // update classes
    await Class.findByIdAndUpdate(classTeacher._id, {
      $pull: {
        "students": {
          child: req.params.user_id
        }
      },
    }, {
      returnOriginal: false, // to return the updated document
      runValidators: false, //runs update validators on update command
      useFindAndModify: false, //remove deprecation warning
    }).exec();

    await Class.findByIdAndUpdate(newClass._id, {
      $push: {
        students: {
          child: req.params.user_id
        }
      }
    }, {
      returnOriginal: false, // to return the updated document
      runValidators: false, //runs update validators on update command
      useFindAndModify: false, //remove deprecation warning
    }).exec();

    return res.status(200).json({
      success: true,
      message: `A turma da criança foi atualizada!`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao remover a turma da criança. Tente mais tarde!",
    });
  }
}

exports.removeChildClass = async (req, res) => {
  if (req.typeUser !== "Professor" && req.typeUser !== "Tutor") {
    return res.status(403).json({
      success: false,
      error: "O seu tipo de utilizador não tem permissões para remover uma turma da criança!",
    });
  }
  try {
    if (req.typeUser === "Tutor") {
      const user = await User.findById(req.userId).exec();

      if (!user.children.includes(req.params.user_id)) {
        return res.status(404).json({
          success: false,
          error: `A criança não está associada ao seu utilizador!`,
        });
      }
    }
    // check if class exists
    const classTeacher = await Class.findOne({
      _id: req.params.class_id,
      teacher: req.typeUser === "Professor" ? req.userId : req.body.teacherId,
    }).exec();
    if (!classTeacher) {
      return res.status(404).json({
        success: false,
        error: `A turma não foi encontrada!`,
      });
    }

    const classesItem = await Class.find({
        _id: classTeacher._id,
        "students.child": req.params.user_id,
      })
      .exec();

    // check if student exists on that class
    if (!classesItem) {
      return res.status(404).json({
        success: false,
        error: "A turma não tem essa criança!",
      });
    }

    // remove student
    await Class.findByIdAndUpdate(classTeacher._id, {
      $pull: {
        "students": {
          child: req.params.user_id
        }
      },
    }).exec();

    return res.status(200).json({
      success: true,
      message: "A criança foi removida da turma!",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Tivemos problemas ao remover a turma da criança. Tente mais tarde!",
    });
  }
}