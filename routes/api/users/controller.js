/**
 * routes/api/users/controller.js
 *
 * @description: Esse arquivo contém a regra de negócio e lógica (controlador) relacionados ao usuário
 *
 */

const { check, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const config = require("config");
const bcrypt = require("bcryptjs");
const User = require("../../../models/user_test");

// @route    POST /api/users/create
// @desc     Registrar usuário e obter token
exports.registrar_usuario = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { user_name, user_email, user_password } = req.body;
  let userObject = { senha: user_password, nome: user_name, email: user_email };

  try {
    let user = await User.findOne({
      where: {
        email: user_email
      }
    });

    if (user) {
      return res.status(400).json({ errorMessage: "Usuário já existe" });
    }

    const salt = await bcrypt.genSalt(10);
    userObject.senha = await bcrypt.hash(user_password, salt);
    let userResponse = await User.create(userObject);

    const payload = {
      user: {
        id: userResponse.id
      }
    };

    jwt.sign(
      payload,
      config.get("jwtSecret"),
      { expiresIn: 3600 },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ errorMessage: "Erro de servidor", callback: err.message });
  }
};

// Middleware para verificar campos da Autenticação
exports.validator_registrar = (req, res, next) => {
  check("user_name", "Nome é obrigatório")
    .not()
    .isEmpty(),
    check("user_email", "Por favor coloque um email válido").isEmail(),
    check(
      "user_password",
      "Por favor coloque uma senha com 6 ou mais caracteres"
    ).isLength({ min: 6 });
  next();
};

// @route    GET /api/users/all
// @desc     Retornar todos os usuários do banco
exports.retornar_todos_usuarios = async (req, res) => {
  try {
    const response = await User.findAll();

    if (!response) res.send("Nenhum registro encontrado");

    res.send(response);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ errorMessage: "Erro de servidor", callback: err.message });
  }
};
