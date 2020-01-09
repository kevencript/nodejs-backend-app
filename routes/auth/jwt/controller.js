/**
 * routes/auth/jwt/controller.js
 *
 * @description: Esse arquivo contém a regra de negócio e lógica (controlador) da autenticação
 * por meio to JWT (email e senha).
 *
 */

const { check, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../../../config/keys");
const { sys_users } = require("../../../sequelize/models/");

const PasswordHash = require("node-phpass").PasswordHash;
const Hasher = new PasswordHash(8, true, 7);

// @route    POST /auth
// @desc     Autenticar o usuário e obter token
exports.autenticar_usuario = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Extraindo informações da requisição
  const { email, password } = req.body;

  try {
    // Buscando por usuário com e-mail existente
    let user = await sys_users.findOne({
      where: {
        email
      }
    });

    if (!user) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Email ou senha incorretos" }] });
    }

    // Realizando a comparação das senhas criptografadas
    const storedHash = user.password;
    const isMatch = await Hasher.CheckPassword(password, storedHash);

    if (!isMatch) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Email ou senha incorretos" }] });
    }

    const payload = {
      user: {
        id: user.id_sysusers,
        activated: user.activated
      }
    };

    jwt.sign(payload, jwtSecret, { expiresIn: 360000 }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      errors: [{ msg: "Erro de servidor", callback: err.message }]
    });
  }
};

// Middleware para verificar campos da Autenticação
exports.validatorAuth = [
  check("email", "Por favor coloque um email válido").isEmail(),
  check("password", "A senha é obrigatória").exists()
];
