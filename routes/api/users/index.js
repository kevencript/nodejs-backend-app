/**
 * routes/api/users/index.js
 *
 * @description: Esse arquivo contem as rotas relacionadas ao usuário
 *
 */

const express = require("express");
const router = express.Router();
const Auth = require("../../../middleware/auth");
const basicAuth = require("../../../middleware/basicAuth");

// controller import
const {
  validator_registrar,
  registrar_usuario,
  retornar_todos_usuarios,
  adicionar_interesses,
  validatorAdicionarInteresses,
  imagem_perfil,
  retornar_interesses,
  esqueceu_senha,
  validatorEsqueceuSenha,
  favoritar_estabelecimento,
  validatorFavEstabelecimento,
  alterar_senha,
  validatorAlterarSenha,
  adicionar_cartao,
  validatorAdicionarCartao,
  excluir_cartao,
  retornar_cartoes
} = require("./controller");

// utilitarios
const { imageUpload } = require("../../../utilitarios/imageUpload");

// @route    POST /api/users
// @desc     Registrar usuário e obter token
// @acess    Public
router.post("/", [validator_registrar], registrar_usuario);

// @route    GET /api/users
// @desc     Retornar todos os usuários do banco
// @acess    Private
router.get("/", Auth, retornar_todos_usuarios);

// @route    POST /api/users/imagem-perfil
// @desc     Editar/definir foto de perfil do usuário
// @acess    Private
router.post("/imagem-perfil", Auth, imageUpload, imagem_perfil);

// @route    POST /api/users/interesses
// @desc     Adicionar novos interesses para o usuário
// @acess    Private
router.post(
  "/interesses",
  Auth,
  validatorAdicionarInteresses,
  adicionar_interesses
);

// @route    GET /api/users/interesses
// @desc     Retornar todos os interesses
// @acess    Private
router.get("/interesses", basicAuth, retornar_interesses);

// @route    POST /api/users/esqueceu-senha
// @desc     Realizar procedimento caso o usuário equeça a senha
// @acess    Public
router.post("/esqueceu-senha", validatorEsqueceuSenha, esqueceu_senha);

// @route    POST /api/users/alterar-senha
// @desc     Realizar procedimento para alterar senha
// @acess    Private
router.post("/alterar-senha", Auth, validatorAlterarSenha, alterar_senha);

// @route    POST /api/users/favoritar-estabelecimento
// @desc     Rota utilizada para favoritar/desfavoritar um estabelecimento
// @acess    Private
router.post(
  "/favoritar-estabelecimento",
  Auth,
  validatorFavEstabelecimento,
  favoritar_estabelecimento
);

// @route    POST /api/users/cartao
// @desc     Adicionar um cartão de crédito ao usuário
// @acess    Private
router.post("/cartao", Auth, validatorAdicionarCartao, adicionar_cartao);

// @route    DELETE /api/users/cartao
// @desc     Deletar um cartão de crédito do usuário
// @acess    Private
router.delete("/cartao", Auth, excluir_cartao);

// @route    GET /api/users/cartoes
// @desc     Retornar uma lista com os cartões do usuário
// @acess    Private
router.get("/cartoes", Auth, retornar_cartoes);

module.exports = router;
