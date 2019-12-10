/**
 * routes/auth/jwt/index.js
 *
 * @description: Esse arquivo contem as rotas de autenticação por meio do JWT (email e senha)
 */

const express = require("express");
const router = express.Router();

// controller import
const { autenticar_usuario, validatorAuth } = require("./controller");

// @route    POST /auth
// @desc     Autenticar o usuário e obter token
// @acess    Public
router.post("/", [validatorAuth], autenticar_usuario);

module.exports = router;
