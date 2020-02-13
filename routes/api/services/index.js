/**
 * routes/api/services/index.js
 *
 * @description: Esse arquivo contem as rotas relacionadas aos serviços da API
 */

const express = require("express");
const router = express.Router();
const basicAuth = require("../../../middleware/basicAuth");
const Auth = require("../../../middleware/auth");

// controller import
const {
  gerar_pin,
  validatorGerarPin,
  validatorValidarPin,
  validar_pin,
  retornar_categorias,
  retornar_bandeiras
} = require("./controller");

// @route    POST /api/services/gerar-pin
// @desc     Gerar um novo PIN, atribuir ao perfil do usuário logado e enviar o código de confirmação via SMS
// @acess    Private
router.post("/gerar-pin", basicAuth, validatorGerarPin, gerar_pin);

// @route    POST /api/services/validar-pin
// @desc     Validar um PIN e alterar o tipo de conta para "activated:1"
// @acess    Private
router.post("/validar-pin", basicAuth, validatorValidarPin, validar_pin);

// @route    GET /api/services/categorias
// @desc     Retornar as categorias e os dados depedentes
// @acess    Private
router.get("/categorias", Auth, retornar_categorias);

// @route    GET /api/services/bandeiras
// @desc     Retornar as Bandeiras (cartões)
// @acess    Private
router.get("/bandeiras", Auth, retornar_bandeiras);

module.exports = router;
