/**
 * routes/auth/jwt/controller.js
 *
 * @description: Esse arquivo contém a regra de negócio e lógica (controlador) da autenticação
 * por meio to JWT (email e senha).
 *
 */

const { check, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const config = require("config");
const bcrypt = require("bcryptjs");
const User = require("../../../models/user_test");

// @route    POST /auth
// @desc     Autenticar o usuário e obter token
exports.autenticar_usuario = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { user_email, user_password } = req.body;

  try {
    let user = await User.findOne({
      where: {
        email: user_email
      }
    });

    if (!user) {
      return res
        .status(400)
        .json({ errorMessage: "Email ou senha incorretos" });
    }

    const isMatch = await bcrypt.compare(user_password, user.senha);

    if (!isMatch) {
      return res
        .status(400)
        .json({ errorMessage: "Email ou senha incorretos" });
    }

    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      config.get("jwtSecret"),
      { expiresIn: 360000 },
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
exports.validatorAuth = (req, res, next) => {
  check("user_email", "Por favor coloque um email válido").isEmail(),
    check("user_password", "A senha é obrigatória").exists();
  next();
};
