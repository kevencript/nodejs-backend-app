/**
 * routes/api/services/index.js
 *
 * @description: Esse arquivo contem as rotas relacionadas aos serviços da API
 */

const express = require("express");
const router = express.Router();
const Auth = require("../../../middleware/auth");

// controller import
const { gerar_pin, validatorGerarPin, validar_pin } = require("./controller");

// @route    POST /api/services/gerar-pin
// @desc     Gerar um novo PIN, atribuir ao perfil do usuário logado e enviar o código de confirmação via SMS
// @acess    Private
router.post("/gerar-pin", Auth, validatorGerarPin, gerar_pin);

// @route    POST /api/services/validar-pin
// @desc     Validar um PIN e alterar o tipo de conta para "activated:1"
// @acess    Private
router.post("/validar-pin", Auth, validar_pin);

module.exports = router;
