/**
 * routes/api/users/index.js
 *
 * @description: Esse arquivo contem as rotas relacionadas ao usuário
 */

const express = require("express");
const router = express.Router();

// controller import
const {
  validator_registrar,
  registrar_usuario,
  retornar_todos_usuarios
} = require("./controller");

// @route    POST /api/users/create
// @desc     Autenticar o usuário e obter token
// @acess    Public
router.post("/create", [validator_registrar], registrar_usuario);

// @route    GET /api/users/all
// @desc     Retornar todos os usuários do banco
// @acess    Private
router.post("/all", retornar_todos_usuarios);

module.exports = router;
