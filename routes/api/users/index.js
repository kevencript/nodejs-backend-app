/**
 * routes/api/users/index.js
 *
 * @description: Esse arquivo contem as rotas relacionadas ao usuário
 */

const express = require("express");
const router = express.Router();
const Auth = require("../../../middleware/auth");

// controller import
const {
  validator_registrar,
  registrar_usuario,
  retornar_todos_usuarios,
  adicionar_interesses,
  validatorAdicionarInteresses,
  imagem_perfil,
  retornar_interesses
} = require("./controller");

// utilitarios
const { imageUpload } = require("../../../utilitarios/imageUpload");

// @route    POST /api/users
// @desc     Registrar usuário e obter token
// @acess    Public
router.post("/", [validator_registrar], registrar_usuario);

// @route    GET /api/users/all
// @desc     Retornar todos os usuários do banco
// @acess    Private
router.get("/all", Auth, retornar_todos_usuarios);

// @route    POST /api/users/imagem_perfil
// @desc     Editar/definir foto de perfil do usuário
// @acess    Private
router.post("/imagem-perfil", Auth, imageUpload, imagem_perfil);

// @route    POST /api/users/interesses
// @desc     Adicionar novos interesses para o usuário
// @acess    Private
router.post(
  "/interesses",
  Auth,
  [validatorAdicionarInteresses],
  adicionar_interesses
);

// @route    GET /api/users/interesses
// @desc     Retornar todos os interesses
// @acess    Private
router.get("/interesses", Auth, retornar_interesses);

module.exports = router;
