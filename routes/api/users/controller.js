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
var emailValidator = require("email-validator");

// @route    POST /api/users/create
// @desc     Registrar usuário e obter token
exports.registrar_usuario = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
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
exports.validator_registrar = async (req, res, next) => {
  try {
    const {
      user_cpf,
      user_email,
      user_celular,
      user_name,
      user_date,
      user_genre
    } = req.body;

    // ### VERIFICANDO SE ALGUM ELEMENTO ESTA VAZIO
    // Verificando o CPF está vazio
    if (!user_cpf)
      res.status(400).json({ errorMessage: "Favor preencher o campo CPF" });

    // Verificando o E-mail está vazio
    if (!user_email)
      res.status(400).json({ errorMessage: "Favor preencher o campo E-mail" });

    // Verificando o Celular está vazio
    if (!user_celular)
      res.status(400).json({ errorMessage: "Favor preencher o campo Celular" });

    // Verificando o Nome está vazio
    if (!user_name)
      res.status(400).json({ errorMessage: "Favor preencher o campo Nome" });

    // Verificando o Celular está vazio
    if (!user_celular)
      res.status(400).json({ errorMessage: "Favor preencher o campo Celular" });

    // Verificando a Data está vazia
    if (!user_date)
      res
        .status(400)
        .json({ errorMessage: "Favor preencher o campo Data de Nascimento" });

    // Verificando o Gênero está vazio
    if (!user_genre)
      res.status(400).json({ errorMessage: "Favor preencher o campo Gênero" });

    // ### VALIDADORES DE VERICIDADE/EXISTENCIA NO BANCO
    // Validador de veracidade CPF
    if (!cpf.isValid(user_cpf))
      res.status(400).json({ errorMessage: "CPF inválido" });

    // Validador de existência (DB) de CPF
    const exisintgCpf = await User.findOne({
      where: {
        cpf: user_cpf
      }
    });
    if (exisintgCpf)
      res.status(400).json({ errorMessage: "CPF já cadastrado" });

    // Validador de existência (DB) de Email
    const exisintgEmail = await User.findOne({
      where: {
        email: user_email
      }
    });
    if (exisintgEmail)
      res.status(400).json({ errorMessage: "E-mail já cadastrado" });

    // Validador de formato de e-mail
    if (emailValidator.validate(user_email))
      res.status(400).json({ errorMessage: "E-mail inválido" });

    // Validador de existência (DB)
  } catch (err) {
    console.log(err);
    res
      .status(400)
      .json({ errorMessage: "Erro de servidor", callback: err.message });
  }
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
