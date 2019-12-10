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

// @route    POST /api/users/create
// @desc     Autenticar o usuário e obter token
exports.registrar_usuario = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { user_name, user_email, user_password } = req.body;

  try {
    let user = await User.findOne({ user_email });

    if (user) {
      res.status(400).json({ errors: [{ msg: "Usuário já existe" }] });
    }

    user = new User({
      user_name,
      user_email,
      user_password,
      user_access: 0
    });

    const salt = await bcrypt.genSalt(10);

    user.user_password = await bcrypt.hash(user_password, salt);

    await user.save();

    const payload = {
      user: {
        id: user.id
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
    console.error(err.message);
    res.status(500).send("Erro de servidor");
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
