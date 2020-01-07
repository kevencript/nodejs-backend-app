/**
 * routes/api/users/controller.js
 *
 * @description: Esse arquivo contém a regra de negócio e lógica (controlador) relacionados ao usuário
 *
 */

const { check, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../../../config/keys");
const { PasswordHash, CRYPT_BLOWFISH } = require("node-phpass");
const { cpf } = require("cpf-cnpj-validator");
const passwordValidator = require("password-validator");
const passValidate = new passwordValidator();
const { sys_users } = require("../../../sequelize/models");

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

  const { nome, email, password, user_cpf, data_nascimento } = req.body;

  let userObject = {
    username: user_cpf,
    nome,
    password,
    email,
    activated: 0,
    created: Date.now(),
    data_json: {
      funcionario: 0,
      termo_uso: 1,
      data_nascimento
    }
  };

  try {
    // Configs de criptografia
    // Doc: https://github.com/glauberportella/password-hash
    const len = 8;
    const portable = true;
    const phpversion = 7;
    const hasher = new PasswordHash(len, portable, phpversion);

    // Gerando hash
    userObject.password = await hasher.HashPassword(password, CRYPT_BLOWFISH);
    let userCreated = await sys_users.create(userObject);

    const payload = {
      user: {
        id: userCreated.id_sysusers
      }
    };

    jwt.sign(payload, jwtSecret, { expiresIn: 36000 }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ errorMessage: "Erro de servidor", callback: err.message });
  }
};

// @type     Middleware de validação dos campos
// @route    POST /api/users
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
  check("email")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo E-mail")
    .isEmail()
    .withMessage("E-mail inválido")
    .custom(email => {
      return sys_users.findOne({ where: { email: email } }).then(email => {
        if (email) return Promise.reject("E-mail já cadastrado");
      });
    }),

  // Nome do usuário
  check("nome")
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
      return sys_users.findOne({ where: { username: user_cpf } }).then(user => {
        if (user) return Promise.reject("CPF já cadastrado");
      });
    }),

  // Senha do usuário
  check("password")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Senha")
    // Validador do padrão de senha
    .custom(password => {
      const isValid = passValidate.validate(password);
      if (!isValid)
        throw new Error(
          "A senha deve conter pelo menos 8 caracteres, uma letra minúscula, uma maiúscula e um número"
        );
      return true;
    }),
  // Gênero do usuário
  check("genero")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Gênero")
    .isLength({ min: 1, max: 1 })
    .withMessage("O campo Gênero só pode conter um caractere"),
  // Data de aniversário do usuário
  check("data_nascimento")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Data de Aniversário")
    .isLength({ min: 10, max: 10 })
];

// @route    GET /api/users/all
// @desc     Retornar todos os usuários do banco
exports.retornar_todos_usuarios = async (req, res) => {
  try {
    const response = await sys_users.findAll();

    if (!response) res.send("Nenhum registro encontrado");

    res.send(response);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ errorMessage: "Erro de servidor", callback: err.message });
  }
};

// @route    POST /api/users/interesses
// @desc     Adicionar novos interesses para o usuário
exports.adicionar_interesses = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { list_ids } = req.body;

  // Retornando dados do usuário autenticado
  const loggedUser = await sys_users.findOne({
    where: {
      id_sysusers: req.user.id
    }
  });

  const { data_json } = loggedUser;
};

// @type     Middleware de validação dos campos
// @route    POST /api/users
exports.validatorAdicionarInteresses = [
  check("lista_ids")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Lista de ID's")
];
