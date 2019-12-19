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
const { cpf } = require("cpf-cnpj-validator");
var passwordValidator = require("password-validator");
var passValidate = new passwordValidator();

// Add properties to it
passValidate
  .is()
  .min(8) // Minimum length 8
  .is()
  .max(100) // Maximum length 100
  .has()
  .uppercase() // Must have uppercase letters
  .has()
  .lowercase() // Must have lowercase letters
  .has()
  .digits() // Must have digits
  .has()
  .not()
  .spaces(); // Should not have spaces

// @route    POST /api/users/create
// @desc     Registrar usuário e obter token
exports.registrar_usuario = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { user_name, user_email, user_password, user_cpf } = req.body;
  let userObject = {
    senha: user_password,
    nome: user_name,
    email: user_email,
    cpf: user_cpf
  };

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
exports.validator_registrar = [
  // Chave de Segurança
  check("chave_seguranca")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Chave de Segurança")
    .not()
    .isString()
    .withMessage("A chave de segurança só pode conter valores inteiros")
    .isLength({ min: 4, max: 4 })
    .withMessage("A chave de segurança deve conter especificamente 4 dígitos"),

  // E-mail do usuário
  check("user_email")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo E-mail")
    .isEmail()
    .withMessage("E-mail inválido")
    .custom(user_email => {
      return User.findOne({ where: { email: user_email } }).then(email => {
        if (email) return Promise.reject("E-mail já cadastrado");
      });
    }),

  // Nome do usuário
  check("user_name")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Nome"),

  // CPF do usuário
  check("user_cpf")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo CPF")
    // Validador de veracidade do CPF
    .custom(user_cpf => {
      const isValid = cpf.isValid(user_cpf);
      if (!isValid) throw new Error("CPF inválido");
      return true;
    })
    // Validador de existência no banco com o mesmo CPF
    .custom(user_cpf => {
      return User.findOne({ where: { cpf: user_cpf } }).then(user => {
        if (user) return Promise.reject("CPF já cadastrado");
      });
    }),

  // Senha do usuário
  check("user_password")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Senha")
    // Validador do padrão de senha
    .custom(user_password => {
      const isValid = passValidate.validate(user_password);
      if (!isValid)
        throw new Error(
          "A senha deve conter pelo menos 8 caracteres, uma letra maiuscula, uma maiúscula e um número"
        );
      return true;
    }),
  // Gênero do usuário
  check("user_genre")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Gênero")
    .isLength({ min: 1, max: 1 })
    .withMessage("O campo Gênero só pode conter um caractere"),

  // Data de aniversário do usuário
  check("user_aniversario")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Data de Aniversário")
];

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
