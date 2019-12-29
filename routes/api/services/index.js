/**
 * routes/api/services/index.js
 *
 * @description: Esse arquivo contem as rotas relacionadas aos serviços da API
 */

const express = require("express");
const router = express.Router();
const Auth = require("../../../middleware/auth");

// controller import
const { gerar_pin } = require("./controller");

// @route    GET /api/services/gerar-pin
// @desc     Gerar um novo PIN, atribuir ao perfil do usuário logado e enviar o código de confirmação via SMS
// @acess    Private
router.get("/gerar-pin", Auth, gerar_pin);

module.exports = router;
